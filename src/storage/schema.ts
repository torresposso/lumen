import type { Database } from "bun:sqlite";
import { AxiError } from "axi-sdk-js";

export const SCHEMA_VERSION = 4;

/**
 * Ensures the database schema is up-to-date.
 * Applies DDL for new databases and sequential migrations across schema versions.
 */
export function ensureSchema(db: Database): void {
	try {
		ensureSchemaInner(db);
	} catch (err) {
		if (err instanceof AxiError) throw err;
		throw new AxiError(
			`Could not prepare profile store schema: ${err instanceof Error ? err.message : String(err)}`,
			"PROFILE_ERROR",
			[
				"The database may be corrupt or from an incompatible version",
				"Back up the file and remove it, or migrate it to a supported user_version",
			],
		);
	}
}

const REQUIRED_COLUMNS = new Set([
	"id",
	"name",
	"birth_place",
	"birth_date_time",
	"birth_lat",
	"birth_lon",
	"birth_jd_ut",
	"created_at",
	"updated_at",
]);

function validateSchema(db: Database): void {
	const cols = db.prepare("PRAGMA table_info(profiles)").all() as {
		name: string;
	}[];
	const colNames = new Set(cols.map((c) => c.name));
	for (const col of REQUIRED_COLUMNS) {
		if (!colNames.has(col)) {
			throw new AxiError(
				`Profile store schema is missing column '${col}' (user_version ${SCHEMA_VERSION} expected)`,
				"PROFILE_ERROR",
				[
					"The database file may be corrupt or from an older migration",
					"Back up the file and remove it to start clean",
				],
			);
		}
	}
	const idx = db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_profiles_birth'",
		)
		.get();
	if (!idx) {
		throw new AxiError(
			"Profile store is missing required index 'idx_profiles_birth'",
			"PROFILE_ERROR",
			[
				"The database file may be corrupt or from an older migration",
				"Back up the file and remove it to start clean",
			],
		);
	}
}

function ensureSchemaInner(db: Database): void {
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
		// A version-0 DB is only treated as a fresh install when the table is
		// genuinely absent. A pre-existing `profiles` table at version 0 has an
		// unknown shape — refuse to guess instead of failing on a raw SQL error.
		const existing = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles'",
			)
			.get();
		if (existing !== null) {
			throw new AxiError(
				"A 'profiles' table already exists but the schema version is 0 (unknown/incomplete schema)",
				"PROFILE_ERROR",
				[
					"Remove the conflicting database file to start clean",
					"Or migrate it to a supported user_version explicitly",
				],
			);
		}
	}

	// Already at target version — validate invariants (F4: malformed v4 with missing columns/index).
	if (user_version === SCHEMA_VERSION) {
		validateSchema(db);
		return;
	}

	// Migrations need to be atomic (F3) — wrap DDL in a transaction.
	let inTx = false;
	try {
		db.exec("BEGIN IMMEDIATE");
		inTx = true;

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
			db.exec(
				`ALTER TABLE profiles ADD COLUMN "when" TEXT NOT NULL DEFAULT ''`,
			);
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
		// Ensure the birth identity index exists even if the pre-v4 db never had it (v1/v2).
		db.exec(`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_birth
			ON profiles (birth_jd_ut, birth_lat, birth_lon)
		`);
		if (user_version < SCHEMA_VERSION) {
			db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
		}

		db.exec("COMMIT");
		inTx = false;
	} catch (err) {
		if (inTx) {
			try {
				db.exec("ROLLBACK");
			} catch {}
		}
		throw err;
	}

	// Post-migration invariant check — ensures idx and columns are present even
	// if a previous migration half-completed before this fix (F4).
	validateSchema(db);
}
