import type { Database } from "bun:sqlite";
import { AxiError } from "axi-sdk-js";

export const SCHEMA_VERSION = 4;

/**
 * Ensures the database schema is up-to-date.
 * Applies DDL for new databases and sequential migrations across schema versions.
 */
export function ensureSchema(db: Database): void {
	const { user_version } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	if (user_version > SCHEMA_VERSION) {
		throw new AxiError(
			`Profile store schema version ${user_version} is newer than supported (${SCHEMA_VERSION})`,
			"PROFILE_ERROR",
			["Upgrade lumen"],
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
