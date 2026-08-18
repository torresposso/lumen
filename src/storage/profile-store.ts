import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type {
	AddResult,
	NewProfile,
	Profile,
	ProfileStore,
} from "../core/types";
import { ensureSchema } from "./schema";

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

/**
 * The SQLite adapter behind the `ProfileStore` port (in `src/core/types.ts`):
 * per-project embedded SQLite for birth profiles (`./lumen.db`, override with
 * `LUMEN_DB`). Created lazily on first write — `list`/`get`/`delete` against a
 * missing file respond empty without creating it. 0600 permissions, rollback
 * journal (no WAL), migrations via PRAGMA user_version. A bun:sqlite
 * `Database` may be injected instead (in-memory, tests): the same interface,
 * with no filesystem side effects — a second adapter behind the port.
 */
export class SqliteProfileStore implements ProfileStore {
	private db: Database | null = null;
	/** True when this store is file-backed (created lazily, 0600); false when a Database was injected. */
	private readonly fileBacked: boolean;

	constructor(
		readonly dbPath: string = defaultDbFile(),
		private readonly now: () => Date = () => new Date(),
		db?: Database,
	) {
		this.fileBacked = db === undefined;
		if (db !== undefined) this.injectedDb = db;
	}
	private injectedDb: Database | null = null;

	/** Opens (creating if needed) the database. Only `add` calls this. */
	private open(): Database {
		if (this.db !== null) return this.db;
		if (!this.fileBacked) {
			// In-memory adapter: the caller owns the Database; a fresh `:memory:`
			// hits the schema check like a fresh install.
			const injected = this.injectedDb;
			if (injected === null) {
				throw new AxiError(
					"In-memory profile store is closed",
					"PROFILE_ERROR",
					["This is a lumen bug — the CLI always constructs a fresh store"],
				);
			}
			this.db = injected;
			ensureSchema(this.db);
			return this.db;
		}
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
		if (this.fileBacked && !this.fileExists()) return [];
		const db = this.open();
		const rows = db
			.prepare("SELECT * FROM profiles ORDER BY id")
			.all() as ProfileRow[];
		return rows.map(toProfile);
	}

	get(id: string): Profile | undefined {
		if (this.fileBacked && !this.fileExists()) return undefined;
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
		if (this.fileBacked && !this.fileExists()) return false;
		const db = this.open();
		return db.prepare("DELETE FROM profiles WHERE id = ?").run(id).changes > 0;
	}

	close(): void {
		if (this.db !== null) {
			this.db.close();
		} else if (this.injectedDb !== null) {
			this.injectedDb.close();
		}
		this.db = null;
		this.injectedDb = null;
	}
}
