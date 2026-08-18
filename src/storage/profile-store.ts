import { Database } from "bun:sqlite";
import { chmodSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { AddResult, NewProfile, Profile } from "../core/types";

const SCHEMA_VERSION = 2;

/** `./lumen.db` in the cwd (per-project), overridable with `LUMEN_DB`. */
export function defaultDbFile(): string {
	return process.env.LUMEN_DB?.trim() || join(process.cwd(), "lumen.db");
}

interface ProfileRow {
	id: string;
	name: string | null;
	birthplace: string;
	local_year: number;
	local_month: number;
	local_day: number;
	local_hour: number;
	local_minute: number;
	offset_minutes: number;
	lat: number;
	lon: number;
	jd_ut: number;
	created_at: string;
	updated_at: string;
}

function toProfile(row: ProfileRow): Profile {
	return {
		id: row.id,
		name: row.name,
		birthplace: row.birthplace,
		birth: {
			local: {
				year: row.local_year,
				month: row.local_month,
				day: row.local_day,
				hour: row.local_hour,
				minute: row.local_minute,
			},
			offsetMinutes: row.offset_minutes,
			lat: row.lat,
			lon: row.lon,
			jdUt: row.jd_ut,
		},
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function createSchema(db: Database): void {
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
		// Fresh install: v1 schema with the *(birthplace)* domain term.
		db.exec(`
			CREATE TABLE IF NOT EXISTS profiles (
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
			)
		`);
		db.exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_birth
			ON profiles (jd_ut, lat, lon)
		`);
	}
	if (user_version === 1) {
		// v1 → v2: the model field was renamed to the domain term *(birthplace)*,
		// matching the CLI flag. Rename the stored column.
		db.exec(`ALTER TABLE profiles RENAME COLUMN city TO birthplace`);
	}
	if (user_version < SCHEMA_VERSION) {
		db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	}
}

/**
 * Per-project embedded SQLite store for birth profiles (`./lumen.db`, override
 * with `LUMEN_DB`). Created lazily on first write — `list`/`get`/`rm` against a
 * missing file respond empty without creating it. 0600 permissions, rollback
 * journal (no WAL), migrations via PRAGMA user_version.
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
			createSchema(this.db);
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
	 * Inserts a profile, deduplicating on the birth: a profile with the same
	 * `jdUt + lat + lon` already stored wins and is returned unchanged (the new
	 * name/birthplace are discarded — the birth is the identity).
	 */
	add(profile: NewProfile): AddResult {
		const db = this.open();
		const nowIso = this.now().toISOString();
		const { birth } = profile;
		const result = db
			.prepare(
				`INSERT INTO profiles (
					id, name, birthplace, local_year, local_month, local_day,
					local_hour, local_minute, offset_minutes, lat, lon, jd_ut,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(jd_ut, lat, lon) DO NOTHING`,
			)
			.run(
				profile.id,
				profile.name,
				profile.birthplace,
				birth.local.year,
				birth.local.month,
				birth.local.day,
				birth.local.hour,
				birth.local.minute,
				birth.offsetMinutes,
				birth.lat,
				birth.lon,
				birth.jdUt,
				nowIso,
				nowIso,
			);

		if (result.changes > 0) {
			return { profile: this.get(profile.id) as Profile, created: true };
		}

		// Duplicate birth — return the existing profile, unchanged.
		const row = db
			.prepare("SELECT * FROM profiles WHERE jd_ut = ? AND lat = ? AND lon = ?")
			.get(birth.jdUt, birth.lat, birth.lon) as ProfileRow | null;
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
