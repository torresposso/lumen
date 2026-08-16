import { Database } from "bun:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { BirthStatus, ResolvedBirth } from "../core/types";

const SCHEMA_VERSION = 1;

/** Privacy-safe summary: id, provenance status and last update. Never a birth date. */
export interface ProfileSummary {
	id: string;
	birthStatus: BirthStatus;
	updatedAt: string;
}

export interface StoredProfile {
	id: string;
	birth: ResolvedBirth;
	createdAt: string;
	updatedAt: string;
}

interface ProfileRow {
	id: string;
	jd_ut: number;
	lat: number;
	lon: number;
	local_year: number;
	local_month: number;
	local_day: number;
	local_hour: number;
	local_minute: number;
	zone: string;
	offset_minutes: number;
	dst: number;
	status: BirthStatus;
	created_at: string;
	updated_at: string;
}

export function defaultProfilesDir(): string {
	return process.env.LUMEN_PROFILES_DIR ?? join(homedir(), ".config", "lumen");
}

export function defaultProfilesFile(): string {
	return join(defaultProfilesDir(), "lumen.db");
}

function toProfile(row: ProfileRow): StoredProfile {
	return {
		id: row.id,
		birth: {
			jdUt: row.jd_ut,
			lat: row.lat,
			lon: row.lon,
			local: {
				year: row.local_year,
				month: row.local_month,
				day: row.local_day,
				hour: row.local_hour,
				minute: row.local_minute,
			},
			zone: row.zone,
			offsetMinutes: row.offset_minutes,
			dst: row.dst === 1,
			status: row.status,
		},
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function migrate(db: Database): void {
	const { user_version } = db.prepare("PRAGMA user_version").get() as {
		user_version: number;
	};
	if (user_version > SCHEMA_VERSION) {
		throw new AxiError(
			`Profile store schema version ${user_version} is newer than supported (${SCHEMA_VERSION})`,
			"PROFILE_ERROR",
			["Run `lumen profile list` again"],
		);
	}
	if (user_version < SCHEMA_VERSION) {
		db.exec(`
			CREATE TABLE IF NOT EXISTS profiles (
				id             TEXT    PRIMARY KEY,
				jd_ut          REAL    NOT NULL,
				lat            REAL    NOT NULL,
				lon            REAL    NOT NULL,
				local_year     INTEGER NOT NULL,
				local_month    INTEGER NOT NULL,
				local_day      INTEGER NOT NULL,
				local_hour     INTEGER NOT NULL,
				local_minute   INTEGER NOT NULL,
				zone           TEXT    NOT NULL,
				offset_minutes INTEGER NOT NULL,
				dst            INTEGER NOT NULL,
				status         TEXT    NOT NULL CHECK (status IN ('ok','ambiguous','nonexistent')),
				created_at     TEXT    NOT NULL,
				updated_at     TEXT    NOT NULL
			)
		`);
		db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	}
}

/**
 * Embedded bun:sqlite store for saved birth profiles.
 * `~/.config/lumen/lumen.db`, 0600 permissions, migrations via PRAGMA user_version.
 * No WAL: the default rollback journal avoids lingering `-wal`/`-shm` files.
 */
export class ProfileStore {
	private readonly db: Database;

	constructor(
		dbPath: string = defaultProfilesFile(),
		private readonly now: () => Date = () => new Date(),
	) {
		try {
			mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
			this.db = new Database(dbPath);
			chmodSync(dbPath, 0o600);
			migrate(this.db);
		} catch (err) {
			if (err instanceof AxiError) throw err;
			throw new AxiError(
				`Could not open profile store: ${err instanceof Error ? err.message : String(err)}`,
				"PROFILE_ERROR",
				["Check that the profile directory is writable"],
			);
		}
	}

	list(): ProfileSummary[] {
		const rows = this.db
			.prepare(
				"SELECT id, status, updated_at AS updated_at FROM profiles ORDER BY id",
			)
			.all() as Array<Pick<ProfileRow, "id" | "status" | "updated_at">>;
		return rows.map((row) => ({
			id: row.id,
			birthStatus: row.status,
			updatedAt: row.updated_at,
		}));
	}

	get(id: string): StoredProfile | undefined {
		const row = this.db
			.prepare("SELECT * FROM profiles WHERE id = ?")
			.get(id) as ProfileRow | null;
		return row ? toProfile(row) : undefined;
	}

	add(id: string, birth: ResolvedBirth): StoredProfile {
		const now = this.now().toISOString();
		const previous = this.get(id);
		const profile: StoredProfile = {
			id,
			birth,
			createdAt: previous?.createdAt ?? now,
			updatedAt: now,
		};
		this.db
			.prepare(
				`INSERT INTO profiles (
					id, jd_ut, lat, lon, local_year, local_month, local_day,
					local_hour, local_minute, zone, offset_minutes, dst, status,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					jd_ut = excluded.jd_ut,
					lat = excluded.lat,
					lon = excluded.lon,
					local_year = excluded.local_year,
					local_month = excluded.local_month,
					local_day = excluded.local_day,
					local_hour = excluded.local_hour,
					local_minute = excluded.local_minute,
					zone = excluded.zone,
					offset_minutes = excluded.offset_minutes,
					dst = excluded.dst,
					status = excluded.status,
					updated_at = excluded.updated_at`,
			)
			.run(
				id,
				birth.jdUt,
				birth.lat,
				birth.lon,
				birth.local.year,
				birth.local.month,
				birth.local.day,
				birth.local.hour,
				birth.local.minute,
				birth.zone,
				birth.offsetMinutes,
				birth.dst ? 1 : 0,
				birth.status,
				profile.createdAt,
				profile.updatedAt,
			);
		return profile;
	}

	remove(id: string): boolean {
		return (
			this.db.prepare("DELETE FROM profiles WHERE id = ?").run(id).changes > 0
		);
	}

	close(): void {
		this.db.close();
	}
}
