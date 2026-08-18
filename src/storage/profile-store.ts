import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { AddResult, NewProfile, Profile } from "../core/types";

const SCHEMA_VERSION = 4;

/** `./lumen.db` in the cwd (per-project), overridable with `LUMEN_DB`. */
export function defaultDbFile(): string {
	return process.env.LUMEN_DB?.trim() || join(process.cwd(), "lumen.db");
}

interface ProfileRow {
	id: string;
	name: string | null;
	birth_place: string;
	birth_date_time: string;
	birth_lat: number;
	birth_lon: number;
	birth_jd_ut: number;
	created_at: string;
	updated_at: string;
}

function toProfile(row: ProfileRow): Profile {
	return {
		id: row.id,
		name: row.name,
		birthPlace: row.birth_place,
		birthDateTime: row.birth_date_time,
		birthLat: row.birth_lat,
		birthLon: row.birth_lon,
		birthJdUt: row.birth_jd_ut,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function ensureSchema(db: Database): void {
	const { user_version } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	if (user_version > SCHEMA_VERSION) {
		throw new AxiError(
			`Profile store schema version ${user_version} is newer than supported (${SCHEMA_VERSION})`,
			"PROFILE_ERROR",
			["Upgrade lumen, then run `lumen profile list` again"],
		);
	}
	if (user_version < 1) {
		// Fresh install: v4 schema — the flat `birth*` vocabulary. Each birth
		// field carries its identity in the `birth_` prefix.
		db.exec(`
			CREATE TABLE IF NOT EXISTS profiles (
				id               TEXT    PRIMARY KEY,
				name             TEXT,
				birth_place      TEXT    NOT NULL,
				birth_date_time  TEXT    NOT NULL,
				birth_lat        REAL    NOT NULL,
				birth_lon        REAL    NOT NULL,
				birth_jd_ut      REAL    NOT NULL,
				created_at       TEXT    NOT NULL,
				updated_at       TEXT    NOT NULL
			)
		`);
		db.exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_birth
			ON profiles (birth_jd_ut, birth_lat, birth_lon)
		`);
	}
	if (user_version === 1) {
		// v1 → v2: the model field was renamed to the domain term *(birthplace)*,
		// matching the CLI flag. Rename the stored column.
		db.exec(`ALTER TABLE profiles RENAME COLUMN city TO birthplace`);
	}
	if (user_version >= 1 && user_version < 3) {
		// v1/v2 → v3: the civil-time columns (local_year…local_minute) and
		// offset_minutes collapse into one ISO `when` value, reconstructed
		// from the stored split (zero offsets become "+00:00").
		db.exec(`ALTER TABLE profiles ADD COLUMN "when" TEXT NOT NULL DEFAULT ''`);
		db.exec(`
			UPDATE profiles SET "when" = printf(
				'%04d-%02d-%02dT%02d:%02d%s%02d:%02d',
				local_year, local_month, local_day, local_hour, local_minute,
				CASE WHEN offset_minutes < 0 THEN '-' ELSE '+' END,
				abs(offset_minutes) / 60,
				abs(offset_minutes) % 60
			)
		`);
		for (const col of [
			"local_year",
			"local_month",
			"local_day",
			"local_hour",
			"local_minute",
			"offset_minutes",
		]) {
			db.exec(`ALTER TABLE profiles DROP COLUMN ${col}`);
		}
	}
	if (user_version >= 1 && user_version < SCHEMA_VERSION) {
		// Any pre-v4 db (v1/v2 converge to the v3 column set above) → v4: the
		// flat `birth_*` names. The unique birth index follows the renames.
		db.exec(`ALTER TABLE profiles RENAME COLUMN birthplace TO birth_place`);
		db.exec(`ALTER TABLE profiles RENAME COLUMN "when" TO birth_date_time`);
		db.exec(`ALTER TABLE profiles RENAME COLUMN lat TO birth_lat`);
		db.exec(`ALTER TABLE profiles RENAME COLUMN lon TO birth_lon`);
		db.exec(`ALTER TABLE profiles RENAME COLUMN jd_ut TO birth_jd_ut`);
	}
	if (user_version < SCHEMA_VERSION) {
		db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	}
}

/**
 * Per-project embedded SQLite store for birth profiles (`./lumen.db`, override
 * with `LUMEN_DB`). Created lazily on first write — `list`/`get`/`delete`
 * against a missing file respond empty without creating it. 0600 permissions,
 * rollback journal (no WAL), migrations via PRAGMA user_version.
 */
export class ProfileStore {
	private db: Database | null = null;

	constructor(
		readonly dbPath: string = defaultDbFile(),
		private readonly now: () => Date = () => new Date(),
	) {}

	/** Opens (creating if needed) the database. Only `add` calls this. */
	private open(): Database {
		if (this.db !== null) return this.db;
		try {
			mkdirSync(dirname(this.dbPath), { recursive: true, mode: 0o700 });
			if (!existsSync(this.dbPath)) {
				openSync(this.dbPath, "a");
				chmodSync(this.dbPath, 0o600);
			}
			this.db = new Database(this.dbPath);
			ensureSchema(this.db);
		} catch (err) {
			if (err instanceof AxiError) throw err;
			throw new AxiError(
				`Could not open profile store: ${err instanceof Error ? err.message : String(err)}`,
				"PROFILE_ERROR",
				[
					"Check that the working directory is writable",
					"Or set LUMEN_DB to a writable path",
				],
			);
		}
		return this.db;
	}

	private fileExists(): boolean {
		return existsSync(this.dbPath);
	}

	list(): Profile[] {
		if (!this.fileExists()) return [];
		const db = this.open();
		const rows = db
			.prepare("SELECT * FROM profiles ORDER BY id")
			.all() as ProfileRow[];
		return rows.map(toProfile);
	}

	get(id: string): Profile | undefined {
		if (!this.fileExists()) return undefined;
		const db = this.open();
		const row = db
			.prepare("SELECT * FROM profiles WHERE id = ?")
			.get(id) as ProfileRow | null;
		return row ? toProfile(row) : undefined;
	}

	/**
	 * Inserts a profile, generating its UUID, and deduplicating on the birth: a
	 * profile with the same `birthJdUt + birthLat + birthLon` already stored
	 * wins and is returned unchanged (the new name/birthPlace are discarded —
	 * the birth is the identity).
	 */
	add(profile: NewProfile): AddResult {
		const db = this.open();
		const nowIso = this.now().toISOString();
		const id = randomUUID();
		const result = db
			.prepare(
				`INSERT INTO profiles (
					id, name, birth_place, birth_date_time, birth_lat, birth_lon, birth_jd_ut,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(birth_jd_ut, birth_lat, birth_lon) DO NOTHING`,
			)
			.run(
				id,
				profile.name,
				profile.birthPlace,
				profile.birthDateTime,
				profile.birthLat,
				profile.birthLon,
				profile.birthJdUt,
				nowIso,
				nowIso,
			);

		if (result.changes > 0) {
			return { profile: this.get(id) as Profile, created: true };
		}

		// Duplicate birth — return the existing profile, unchanged.
		const row = db
			.prepare(
				"SELECT * FROM profiles WHERE birth_jd_ut = ? AND birth_lat = ? AND birth_lon = ?",
			)
			.get(
				profile.birthJdUt,
				profile.birthLat,
				profile.birthLon,
			) as ProfileRow | null;
		return { profile: toProfile(row as ProfileRow), created: false };
	}

	remove(id: string): boolean {
		if (!this.fileExists()) return false;
		const db = this.open();
		return db.prepare("DELETE FROM profiles WHERE id = ?").run(id).changes > 0;
	}

	close(): void {
		this.db?.close();
		this.db = null;
	}
}
