import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { ensureSchema, SCHEMA_VERSION } from "../../src/storage/schema";

interface MigratedRow {
	id: string;
	name: string;
	birth_place: string;
	birth_date_time: string;
	birth_lat: number;
	birth_lon: number;
	birth_jd_ut: number;
	created_at: string;
	updated_at: string;
	city?: string;
	local_year?: number;
}

describe("ensureSchema — DDL & version migrations", () => {
	test("fresh database initializes to current schema version and creates profiles table", () => {
		const db = new Database(":memory:");
		ensureSchema(db);

		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(SCHEMA_VERSION);

		const table = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'",
			)
			.get();
		expect(table).toBeTruthy();

		const index = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='index' AND name='idx_profiles_birth'",
			)
			.get();
		expect(index).toBeTruthy();
	});

	test("migrates a v1 db to v4: city→birthplace, civil columns → when → birth_*", () => {
		const db = new Database(":memory:");
		db.exec(`
			CREATE TABLE profiles (
				id TEXT PRIMARY KEY,
				name TEXT,
				city TEXT NOT NULL,
				local_year INTEGER NOT NULL,
				local_month INTEGER NOT NULL,
				local_day INTEGER NOT NULL,
				local_hour INTEGER NOT NULL,
				local_minute INTEGER NOT NULL,
				offset_minutes INTEGER NOT NULL,
				lat REAL NOT NULL,
				lon REAL NOT NULL,
				jd_ut REAL NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			PRAGMA user_version = 1;
		`);
		db.prepare(
			`INSERT INTO profiles VALUES (
				'u-1', 'Alice', 'Bogotá',
				1990, 6, 10, 14, 30, -300,
				4.711, -74.0721, 2448053.3125,
				'2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
			)`,
		).run();

		ensureSchema(db);

		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(SCHEMA_VERSION);

		const row = db
			.prepare("SELECT * FROM profiles WHERE id = 'u-1'")
			.get() as MigratedRow;
		expect(row.birth_place).toBe("Bogotá");
		expect(row.birth_date_time).toBe("1990-06-10T14:30-05:00");
		expect(row.birth_lat).toBe(4.711);
		expect(row.birth_lon).toBe(-74.0721);
		expect(row.birth_jd_ut).toBe(2448053.3125);
		expect(row.city).toBeUndefined();
		expect(row.local_year).toBeUndefined();
	});

	test("migrates a v2 db to v4: birthplace already renamed, civil columns → when → birth_*", () => {
		const db = new Database(":memory:");
		db.exec(`
			CREATE TABLE profiles (
				id TEXT PRIMARY KEY,
				name TEXT,
				birthplace TEXT NOT NULL,
				local_year INTEGER NOT NULL,
				local_month INTEGER NOT NULL,
				local_day INTEGER NOT NULL,
				local_hour INTEGER NOT NULL,
				local_minute INTEGER NOT NULL,
				offset_minutes INTEGER NOT NULL,
				lat REAL NOT NULL,
				lon REAL NOT NULL,
				jd_ut REAL NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			PRAGMA user_version = 2;
		`);
		db.prepare(
			`INSERT INTO profiles VALUES (
				'u-2', 'Bob', 'Medellín',
				1985, 12, 1, 8, 0, 0,
				6.2442, -75.5812, 2446400.8333,
				'2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
			)`,
		).run();

		ensureSchema(db);

		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(SCHEMA_VERSION);

		const row = db
			.prepare("SELECT * FROM profiles WHERE id = 'u-2'")
			.get() as MigratedRow;
		expect(row.birth_place).toBe("Medellín");
		expect(row.birth_date_time).toBe("1985-12-01T08:00+00:00");
	});

	test("migrates a v3 db to v4: `when`/lat/lon/jd_ut renamed to birth_*", () => {
		const db = new Database(":memory:");
		db.exec(`
			CREATE TABLE profiles (
				id TEXT PRIMARY KEY,
				name TEXT,
				birthplace TEXT NOT NULL,
				"when" TEXT NOT NULL,
				lat REAL NOT NULL,
				lon REAL NOT NULL,
				jd_ut REAL NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			CREATE UNIQUE INDEX idx_profiles_birth ON profiles (jd_ut, lat, lon);
			PRAGMA user_version = 3;
		`);
		db.prepare(
			`INSERT INTO profiles VALUES (
				'u-3', 'Carol', 'Cali',
				'2000-01-01T00:00+00:00',
				3.4516, -76.532, 2451544.5,
				'2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
			)`,
		).run();

		ensureSchema(db);

		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(SCHEMA_VERSION);

		const row = db
			.prepare("SELECT * FROM profiles WHERE id = 'u-3'")
			.get() as MigratedRow;
		expect(row.birth_place).toBe("Cali");
		expect(row.birth_date_time).toBe("2000-01-01T00:00+00:00");
		expect(row.birth_lat).toBe(3.4516);
		expect(row.birth_lon).toBe(-76.532);
		expect(row.birth_jd_ut).toBe(2451544.5);
	});

	test("rejects a db with a newer user_version as PROFILE_ERROR", () => {
		const db = new Database(":memory:");
		db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1};`);
		expect(() => ensureSchema(db)).toThrow("is newer than supported");
	});

	test("rejects a version-0 db that already has a profiles table as PROFILE_ERROR", () => {
		const db = new Database(":memory:");
		db.exec(`
			CREATE TABLE profiles (
				id TEXT PRIMARY KEY
			);
			PRAGMA user_version = 0;
		`);
		let thrown: unknown;
		try {
			ensureSchema(db);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(AxiError);
		expect((thrown as AxiError).code).toBe("PROFILE_ERROR");
		expect((thrown as Error).message).toMatch(/schema version is 0/);
	});

	test("rejects a v4 db missing a required column as PROFILE_ERROR", () => {
		const db = new Database(":memory:");
		// A v4 db whose `name` column is missing (corrupt or half-migrated).
		db.exec(`
			CREATE TABLE profiles (
				id              TEXT PRIMARY KEY,
				birth_place     TEXT NOT NULL,
				birth_date_time TEXT NOT NULL,
				birth_lat       REAL NOT NULL,
				birth_lon       REAL NOT NULL,
				birth_jd_ut     REAL NOT NULL,
				created_at      TEXT NOT NULL,
				updated_at      TEXT NOT NULL
			);
			CREATE UNIQUE INDEX idx_profiles_birth
				ON profiles (birth_jd_ut, birth_lat, birth_lon);
			PRAGMA user_version = 4;
		`);
		let thrown: unknown;
		try {
			ensureSchema(db);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(AxiError);
		expect((thrown as AxiError).code).toBe("PROFILE_ERROR");
		expect((thrown as Error).message).toMatch(/missing column 'name'/);
	});

	test("rejects a v4 db missing the birth identity index as PROFILE_ERROR", () => {
		const db = new Database(":memory:");
		// A v4 db with the right columns but no dedupe index.
		db.exec(`
			CREATE TABLE profiles (
				id              TEXT PRIMARY KEY,
				name            TEXT,
				birth_place     TEXT NOT NULL,
				birth_date_time TEXT NOT NULL,
				birth_lat       REAL NOT NULL,
				birth_lon       REAL NOT NULL,
				birth_jd_ut     REAL NOT NULL,
				created_at      TEXT NOT NULL,
				updated_at      TEXT NOT NULL
			);
			PRAGMA user_version = 4;
		`);
		let thrown: unknown;
		try {
			ensureSchema(db);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(AxiError);
		expect((thrown as AxiError).code).toBe("PROFILE_ERROR");
		expect((thrown as Error).message).toMatch(
			/missing required index 'idx_profiles_birth'/,
		);
	});

	test("F3: a migration that fails mid-way rolls back atomically (no partial columns, user_version unchanged)", () => {
		const db = new Database(":memory:");
		// Create a v1 db with a conflicting 'birth_lat' column added ahead of time,
		// so that the late rename `ALTER TABLE profiles RENAME COLUMN lat TO birth_lat` fails.
		db.exec(`
			CREATE TABLE profiles (
				id TEXT PRIMARY KEY,
				name TEXT,
				city TEXT NOT NULL,
				local_year INTEGER NOT NULL,
				local_month INTEGER NOT NULL,
				local_day INTEGER NOT NULL,
				local_hour INTEGER NOT NULL,
				local_minute INTEGER NOT NULL,
				offset_minutes INTEGER NOT NULL,
				lat REAL NOT NULL,
				lon REAL NOT NULL,
				jd_ut REAL NOT NULL,
				birth_lat REAL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
			PRAGMA user_version = 1;
		`);
		db.prepare(
			`INSERT INTO profiles VALUES (
				'u-rollback', 'Rollback Test', 'Bogotá',
				1990, 6, 10, 14, 30, -300,
				4.711, -74.0721, 2448053.3125, NULL,
				'2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
			)`,
		).run();

		// Migration should fail due to duplicate column name on late step
		expect(() => ensureSchema(db)).toThrow();

		// user_version must remain at 1
		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(1);

		// Schema must have rolled back completely: 'city' still exists, 'birthplace' and 'birth_place' do not exist
		const cols = (
			db.prepare("PRAGMA table_info(profiles)").all() as { name: string }[]
		).map((c) => c.name);

		expect(cols).toContain("city");
		expect(cols).toContain("local_year");
		expect(cols).not.toContain("birthplace");
		expect(cols).not.toContain("birth_place");
		expect(cols).not.toContain("birth_date_time");

		// Original row must still be intact
		const row = db
			.prepare("SELECT city, local_year FROM profiles WHERE id = 'u-rollback'")
			.get() as { city: string; local_year: number };
		expect(row.city).toBe("Bogotá");
		expect(row.local_year).toBe(1990);
	});

	test("F3: if post-migration schema validation fails, transaction rolls back atomically", () => {
		const db = new Database(":memory:");
		// Mock a pre-v4 db where during migration, the resulting schema misses a required column
		// (e.g. user_version = 3, but the table was created without 'name')
		db.exec(`
			CREATE TABLE profiles (
				id              TEXT PRIMARY KEY,
				birthplace      TEXT NOT NULL,
				"when"          TEXT NOT NULL,
				lat             REAL NOT NULL,
				lon             REAL NOT NULL,
				jd_ut           REAL NOT NULL,
				created_at      TEXT NOT NULL,
				updated_at      TEXT NOT NULL
			);
			CREATE UNIQUE INDEX idx_profiles_birth ON profiles (jd_ut, lat, lon);
			PRAGMA user_version = 3;
		`);

		// Migration should fail at validateSchema and roll back
		let thrown: unknown;
		try {
			ensureSchema(db);
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(AxiError);
		expect((thrown as AxiError).code).toBe("PROFILE_ERROR");
		expect((thrown as Error).message).toMatch(/missing column 'name'/);

		// user_version must remain 3
		const { user_version } = db.prepare("PRAGMA user_version").get() as {
			user_version: number;
		};
		expect(user_version).toBe(3);

		// Check that changes in migration rolled back: column 'lat' is still named 'lat', not 'birth_lat'
		const cols = (
			db.prepare("PRAGMA table_info(profiles)").all() as { name: string }[]
		).map((c) => c.name);
		expect(cols).toContain("lat");
		expect(cols).not.toContain("birth_lat");
	});
});
