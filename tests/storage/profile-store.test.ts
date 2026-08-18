import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { NewProfile } from "../../src/core/types";
import { defaultDbFile, ProfileStore } from "../../src/storage/profile-store";

function newProfile(overrides: Partial<NewProfile> = {}): NewProfile {
	const base: NewProfile = {
		id: "11111111-1111-4111-8111-111111111111",
		name: "erik",
		city: "Tampa, USA",
		birth: {
			local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
			offsetMinutes: -240,
			lat: 27.95,
			lon: -82.46,
			jdUt: 2444068.0625,
		},
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

describe("ProfileStore", () => {
	let dir: string;
	let dbPath: string;
	let store: ProfileStore;

	beforeEach(() => {
		dir = join(
			tmpdir(),
			`lumen-v2-test-${Math.random().toString(36).slice(2)}`,
		);
		dbPath = join(dir, "lumen.db");
		store = new ProfileStore(dbPath);
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
		expect(profile.id).toBe(newProfile().id);
	});

	test("add and get round-trip the profile", () => {
		const added = newProfile();
		store.add(added);
		const stored = store.get(added.id);
		expect(stored?.name).toBe("erik");
		expect(stored?.city).toBe("Tampa, USA");
		expect(stored?.birth.local).toEqual({
			year: 1990,
			month: 6,
			day: 10,
			hour: 14,
			minute: 30,
		});
		expect(stored?.birth.offsetMinutes).toBe(-240);
		expect(stored?.birth.jdUt).toBe(2444068.0625);
		expect(store.get("nope")).toBeUndefined();
	});

	test("add deduplicates by birth: same jdUt+coords returns the existing profile", () => {
		const first = store.add(newProfile());
		const second = store.add(
			newProfile({
				id: "22222222-2222-4222-8222-222222222222",
				name: "other",
				city: "Somewhere else",
			}),
		);

		expect(second.created).toBe(false);
		expect(second.profile.id).toBe(first.profile.id);
		expect(second.profile.name).toBe("erik");
		expect(second.profile.city).toBe("Tampa, USA");
		expect(store.list()).toHaveLength(1);
	});

	test("sets timestamps from the injected clock and keeps them on dedupe", async () => {
		const clock = { value: "2026-01-01T00:00:00.000Z" };
		store = new ProfileStore(dbPath, () => new Date(clock.value));

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
				id: "b",
				name: null,
				birth: { ...newProfile().birth, lat: 10, lon: 10, jdUt: 2400000.0 },
			}),
		);
		store.add(
			newProfile({
				id: "a",
				name: null,
				birth: { ...newProfile().birth, lat: 20, lon: 20, jdUt: 2500000.0 },
			}),
		);
		expect(store.list().map((p) => p.id)).toEqual(["a", "b"]);
		expect(store.list()[0]?.name).toBeNull();
	});

	test("remove deletes and persists", () => {
		store.add(newProfile());
		expect(store.remove(newProfile().id)).toBe(true);
		expect(store.remove(newProfile().id)).toBe(false);
		store.close();

		const reloaded = new ProfileStore(dbPath);
		expect(reloaded.get(newProfile().id)).toBeUndefined();
		reloaded.close();
	});

	test("reopens an existing lumen.db", () => {
		store.add(newProfile());
		store.close();
		const reopened = new ProfileStore(dbPath);
		expect(reopened.list()).toHaveLength(1);
		reopened.close();
	});

	test("rejects a db with a newer user_version as PROFILE_ERROR", () => {
		store.add(newProfile());
		store.close();

		const manual = new Database(dbPath);
		manual.exec("PRAGMA user_version = 99");
		manual.close();

		try {
			// The store opens lazily; any read triggers the schema check.
			new ProfileStore(dbPath).list();
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("PROFILE_ERROR");
		}
	});
});
