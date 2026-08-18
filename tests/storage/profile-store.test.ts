import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewProfile } from "../../src/core/types";
import {
	defaultDbFile,
	SqliteProfileStore,
} from "../../src/storage/profile-store";

function newProfile(overrides: Partial<NewProfile> = {}): NewProfile {
	const base: NewProfile = {
		name: "erik",
		birthPlace: "Tampa, USA",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthLat: 27.95,
		birthLon: -82.46,
		birthJdUt: 2444068.0625,
	};
	return { ...base, ...overrides };
}

describe("defaultDbFile", () => {
	afterEach(() => {
		delete process.env.LUMEN_DB;
	});

	test("honors LUMEN_DB when set", () => {
		process.env.LUMEN_DB = "/tmp/lumen-custom/lumen.db";
		expect(defaultDbFile()).toBe("/tmp/lumen-custom/lumen.db");
	});

	test("falls back to ./lumen.db in the cwd", () => {
		expect(defaultDbFile()).toBe(join(process.cwd(), "lumen.db"));
	});
});

describe("SqliteProfileStore", () => {
	let dir: string;
	let dbPath: string;
	let store: SqliteProfileStore;

	beforeEach(() => {
		dir = join(
			tmpdir(),
			`lumen-v4-test-${Math.random().toString(36).slice(2)}`,
		);
		dbPath = join(dir, "lumen.db");
		store = new SqliteProfileStore(dbPath);
	});

	afterEach(() => {
		store.close();
		rmSync(dir, { recursive: true, force: true });
	});

	test("reads are lazy: no file is created until add", () => {
		expect(existsSync(dbPath)).toBe(false);
		expect(store.list()).toEqual([]);
		expect(store.get("missing")).toBeUndefined();
		expect(store.remove("missing")).toBe(false);
		expect(existsSync(dbPath)).toBe(false);
	});

	test("add creates the file with 0600 permissions", () => {
		const { created, profile } = store.add(newProfile());
		expect(created).toBe(true);
		expect(existsSync(dbPath)).toBe(true);
		expect(statSync(dbPath).mode & 0o777).toBe(0o600);
		expect(profile.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	test("add and get round-trip the profile", () => {
		const { profile } = store.add(newProfile());
		const stored = store.get(profile.id);
		expect(stored?.name).toBe("erik");
		expect(stored?.birthPlace).toBe("Tampa, USA");
		expect(stored?.birthDateTime).toBe("1990-06-10T14:30-04:00");
		expect(stored?.birthLat).toBe(27.95);
		expect(stored?.birthLon).toBe(-82.46);
		expect(stored?.birthJdUt).toBe(2444068.0625);
		expect(store.get("nope")).toBeUndefined();
	});

	test("add deduplicates by birth: same birthJdUt+coords returns the existing profile", () => {
		const first = store.add(newProfile());
		const second = store.add(
			newProfile({
				name: "other",
				birthPlace: "Somewhere else",
			}),
		);

		expect(second.created).toBe(false);
		expect(second.profile.id).toBe(first.profile.id);
		expect(second.profile.name).toBe("erik");
		expect(second.profile.birthPlace).toBe("Tampa, USA");
		expect(store.list()).toHaveLength(1);
	});

	test("sets timestamps from the injected clock and keeps them on dedupe", async () => {
		const clock = { value: "2026-01-01T00:00:00.000Z" };
		store = new SqliteProfileStore(dbPath, () => new Date(clock.value));

		const first = store.add(newProfile());
		expect(first.profile.createdAt).toBe("2026-01-01T00:00:00.000Z");
		expect(first.profile.updatedAt).toBe("2026-01-01T00:00:00.000Z");

		clock.value = "2026-02-01T00:00:00.000Z";
		const duplicate = store.add(newProfile());
		expect(duplicate.created).toBe(false);
		expect(duplicate.profile.createdAt).toBe("2026-01-01T00:00:00.000Z");
		expect(duplicate.profile.updatedAt).toBe("2026-01-01T00:00:00.000Z");
	});

	test("list sorts by id and returns full profiles", () => {
		store.add(
			newProfile({
				name: null,
				birthLat: 10,
				birthLon: 10,
				birthJdUt: 2400000.0,
			}),
		);
		store.add(
			newProfile({
				name: null,
				birthLat: 20,
				birthLon: 20,
				birthJdUt: 2500000.0,
			}),
		);
		// The store owns the ids now, so the sort order is not predictable —
		// the contract to test is that the list IS sorted by id.
		const ids = store.list().map((p) => p.id);
		expect(ids).toHaveLength(2);
		expect(ids).toEqual([...ids].sort());
		expect(store.list().every((p) => p.name === null)).toBe(true);
	});

	test("remove deletes and persists", () => {
		const { profile } = store.add(newProfile());
		expect(store.remove(profile.id)).toBe(true);
		expect(store.remove(profile.id)).toBe(false);
		store.close();

		const reloaded = new SqliteProfileStore(dbPath);
		expect(reloaded.get(profile.id)).toBeUndefined();
		reloaded.close();
	});

	test("reopens an existing lumen.db", () => {
		store.add(newProfile());
		store.close();
		const reopened = new SqliteProfileStore(dbPath);
		expect(reopened.list()).toHaveLength(1);
		reopened.close();
	});
});

describe("SqliteProfileStore with an injected in-memory Database", () => {
	let db: Database;
	let store: SqliteProfileStore;

	beforeEach(() => {
		db = new Database(":memory:");
		store = new SqliteProfileStore(undefined, () => new Date(), db);
	});

	afterEach(() => {
		store.close();
	});

	test("add/list/get/remove round-trip without touching files", () => {
		const { created, profile } = store.add(newProfile());
		expect(created).toBe(true);
		expect(profile.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(store.list()).toHaveLength(1);
		expect(store.get(profile.id)?.name).toBe("erik");
		expect(store.remove(profile.id)).toBe(true);
		expect(store.list()).toHaveLength(0);
	});

	test("dedupe returns the existing profile", () => {
		store.add(newProfile());
		const second = store.add(newProfile({ name: "other" }));
		expect(second.created).toBe(false);
		expect(second.profile.id).toBeDefined();
		expect(second.profile.name).toBe("erik");
		expect(store.list()).toHaveLength(1);
	});

	test("reads against the injected db never consult the filesystem", () => {
		// A sentinel path that only a file-backed store would create.
		const sentinel = join(
			tmpdir(),
			`lumen-mem-sentinel-${Math.random().toString(36).slice(2)}.db`,
		);
		const s = new SqliteProfileStore(sentinel, () => new Date(), db);
		s.add(newProfile());
		expect(existsSync(sentinel)).toBe(false);
		s.close();
	});
});
