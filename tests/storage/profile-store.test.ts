import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { NewProfile } from "../../src/core/types";
import { defaultDbFile, ProfileStore } from "../../src/storage/profile-store";

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

describe("ProfileStore", () => {
	let dir: string;
	let dbPath: string;
	let store: ProfileStore;

	beforeEach(() => {
		dir = join(
			tmpdir(),
			`lumen-v4-test-${Math.random().toString(36).slice(2)}`,
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

		const reloaded = new ProfileStore(dbPath);
		expect(reloaded.get(profile.id)).toBeUndefined();
		reloaded.close();
	});

	test("reopens an existing lumen.db", () => {
		store.add(newProfile());
		store.close();
		const reopened = new ProfileStore(dbPath);
		expect(reopened.list()).toHaveLength(1);
		reopened.close();
	});

	test("migrates a v1 db to v4: city→birthplace, civil columns → when → birth_*", () => {
		// Simulate a v1 database: `city` column + civil-time split + user_version 1.
		store.close();
		rmSync(dir, { recursive: true, force: true });
		mkdirSync(dir, { recursive: true });
		const v1 = new Database(dbPath);
		v1.exec(`
			CREATE TABLE profiles (
				id             TEXT    PRIMARY KEY,
				name           TEXT,
				city           TEXT    NOT NULL,
				local_year     INTEGER NOT NULL,
				local_month    INTEGER NOT NULL,
				local_day      INTEGER NOT NULL,
				local_hour     INTEGER NOT NULL,
				local_minute   INTEGER NOT NULL,
				offset_minutes INTEGER NOT NULL,
				lat            REAL    NOT NULL,
				lon            REAL    NOT NULL,
				jd_ut          REAL    NOT NULL,
				created_at     TEXT    NOT NULL,
				updated_at     TEXT    NOT NULL
			);
			INSERT INTO profiles VALUES (
				'33333333-3333-4333-8333-333333333333', 'old', 'Old City',
				1990, 6, 10, 14, 30, -240, 27.95, -82.46, 2444068.0625,
				'2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
			);
		`);
		v1.exec("PRAGMA user_version = 1");
		v1.close();

		const migrated = new ProfileStore(dbPath);
		const stored = migrated.get("33333333-3333-4333-8333-333333333333");
		expect(stored?.birthPlace).toBe("Old City");
		expect(stored?.birthDateTime).toBe("1990-06-10T14:30-04:00");
		expect(stored?.birthLat).toBe(27.95);
		expect(stored?.birthLon).toBe(-82.46);
		expect(stored?.birthJdUt).toBe(2444068.0625);
		expect(migrated.list()).toHaveLength(1);
		migrated.close();

		const check = new Database(dbPath);
		const names = (
			check.prepare("PRAGMA table_info(profiles)").all() as Array<{
				name: string;
			}>
		).map((c) => c.name);
		for (const col of [
			"birth_place",
			"birth_date_time",
			"birth_lat",
			"birth_lon",
			"birth_jd_ut",
		]) {
			expect(names).toContain(col);
		}
		for (const oldCol of [
			"city",
			"birthplace",
			"when",
			"lat",
			"lon",
			"jd_ut",
			"local_year",
			"offset_minutes",
		]) {
			expect(names).not.toContain(oldCol);
		}
		expect(
			(check.prepare("PRAGMA user_version").get() as { user_version: number })
				.user_version,
		).toBe(4);
		check.close();
	});

	test("migrates a v2 db to v4: birthplace already renamed, civil columns → when → birth_*", () => {
		// Simulate a v2 database: `birthplace` already renamed, civil-time split.
		store.close();
		rmSync(dir, { recursive: true, force: true });
		mkdirSync(dir, { recursive: true });
		const v2 = new Database(dbPath);
		v2.exec(`
			CREATE TABLE profiles (
				id             TEXT    PRIMARY KEY,
				name           TEXT,
				birthplace     TEXT    NOT NULL,
				local_year     INTEGER NOT NULL,
				local_month    INTEGER NOT NULL,
				local_day      INTEGER NOT NULL,
				local_hour     INTEGER NOT NULL,
				local_minute   INTEGER NOT NULL,
				offset_minutes INTEGER NOT NULL,
				lat            REAL    NOT NULL,
				lon            REAL    NOT NULL,
				jd_ut          REAL    NOT NULL,
				created_at     TEXT    NOT NULL,
				updated_at     TEXT    NOT NULL
			);
			INSERT INTO profiles VALUES (
				'44444444-4444-4444-8444-444444444444', 'tampa', 'Tampa, USA',
				1990, 6, 10, 14, 30, 0, 27.95, -82.46, 2444068.0625,
				'2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
			);
		`);
		v2.exec("PRAGMA user_version = 2");
		v2.close();

		const migrated = new ProfileStore(dbPath);
		const stored = migrated.get("44444444-4444-4444-8444-444444444444");
		expect(stored?.birthPlace).toBe("Tampa, USA");
		// Zero offset is reconstructed as +00:00 (the stored split cannot tell
		// whether it was written as +00:00 or Z).
		expect(stored?.birthDateTime).toBe("1990-06-10T14:30+00:00");
		migrated.close();

		const check = new Database(dbPath);
		const names = (
			check.prepare("PRAGMA table_info(profiles)").all() as Array<{
				name: string;
			}>
		).map((c) => c.name);
		expect(names).toContain("birth_date_time");
		expect(names).not.toContain("when");
		expect(
			(check.prepare("PRAGMA user_version").get() as { user_version: number })
				.user_version,
		).toBe(4);
		check.close();
	});

	test("migrates a v3 db to v4: `when`/lat/lon/jd_ut renamed to birth_*", () => {
		// Simulate a v3 database: single ISO `when` column + user_version 3.
		store.close();
		rmSync(dir, { recursive: true, force: true });
		mkdirSync(dir, { recursive: true });
		const v3 = new Database(dbPath);
		v3.exec(`
			CREATE TABLE profiles (
				id          TEXT    PRIMARY KEY,
				name        TEXT,
				birthplace  TEXT    NOT NULL,
				"when"      TEXT    NOT NULL,
				lat         REAL    NOT NULL,
				lon         REAL    NOT NULL,
				jd_ut       REAL    NOT NULL,
				created_at  TEXT    NOT NULL,
				updated_at  TEXT    NOT NULL
			);
			INSERT INTO profiles VALUES (
				'55555555-5555-4555-8555-555555555555', 'silvia', 'Magangué, Colombia',
				'1981-01-26T00:50-05:00', 9.15, -74.75, 2444634.24375,
				'2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z'
			);
		`);
		v3.exec("PRAGMA user_version = 3");
		v3.close();

		const migrated = new ProfileStore(dbPath);
		const stored = migrated.get("55555555-5555-4555-8555-555555555555");
		expect(stored?.birthPlace).toBe("Magangué, Colombia");
		expect(stored?.birthDateTime).toBe("1981-01-26T00:50-05:00");
		expect(stored?.birthLat).toBe(9.15);
		expect(stored?.birthLon).toBe(-74.75);
		expect(stored?.birthJdUt).toBe(2444634.24375);
		migrated.close();

		const check = new Database(dbPath);
		const names = (
			check.prepare("PRAGMA table_info(profiles)").all() as Array<{
				name: string;
			}>
		).map((c) => c.name);
		for (const col of [
			"birth_place",
			"birth_date_time",
			"birth_lat",
			"birth_lon",
			"birth_jd_ut",
		]) {
			expect(names).toContain(col);
		}
		expect(names).not.toContain("when");
		expect(
			(check.prepare("PRAGMA user_version").get() as { user_version: number })
				.user_version,
		).toBe(4);
		check.close();
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

describe("ProfileStore with an injected in-memory Database", () => {
	let db: Database;
	let store: ProfileStore;

	beforeEach(() => {
		db = new Database(":memory:");
		store = new ProfileStore(undefined, () => new Date(), db);
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
		const s = new ProfileStore(sentinel, () => new Date(), db);
		s.add(newProfile());
		expect(existsSync(sentinel)).toBe(false);
		s.close();
	});
});
