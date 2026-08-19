import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { NewProfile, Profile } from "../core/model";
import type { AddResult, ProfileStore } from "../core/store";
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
 * The SQL core both adapters share: the four store operations, the dedupe, the
 * UUID generation and the clock, over an already-opened bun:sqlite `Database`.
 * No file policy, no lifecycle — gaining a `Database` is the adapter's job
 * (file policy) or the caller's (in-memory). `add` owns profile identity: it
 * generates the profile's UUID — the command never supplies one.
 */
class ProfileDb implements ProfileStore {
	constructor(
		private readonly db: Database,
		private readonly now: () => Date = () => new Date(),
	) {}

	list(): Profile[] {
		const rows = this.db
			.prepare("SELECT * FROM profiles ORDER BY id")
			.all() as ProfileRow[];
		return rows.map(toProfile);
	}

	private resolveId(id: string): string | undefined {
		const exact = this.db
			.prepare("SELECT id FROM profiles WHERE id = ?")
			.get(id) as { id: string } | null;
		if (exact) return exact.id;

		const prefixMatches = this.db
			.prepare("SELECT id FROM profiles WHERE id LIKE ?")
			.all(`${id}%`) as { id: string }[];
		if (prefixMatches.length === 1 && prefixMatches[0]) {
			return prefixMatches[0].id;
		}
		return undefined;
	}

	get(id: string): Profile | undefined {
		const resolvedId = this.resolveId(id);
		if (!resolvedId) return undefined;
		const row = this.db
			.prepare("SELECT * FROM profiles WHERE id = ?")
			.get(resolvedId) as ProfileRow | null;
		return row ? toProfile(row) : undefined;
	}

	/**
	 * Inserts a profile, generating its UUID, and deduplicating on the birth: a
	 * profile with the same `birthJdUt + birthLat + birthLon` already stored
	 * wins and is returned unchanged (the new name/birthPlace are discarded —
	 * the birth is the identity). Inserted timestamps come from the injected
	 * clock.
	 */
	add(profile: NewProfile): AddResult {
		const nowIso = this.now().toISOString();
		const id = randomUUID();
		const result = this.db
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
		const row = this.db
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
		const resolvedId = this.resolveId(id);
		if (!resolvedId) return false;
		return (
			this.db.prepare("DELETE FROM profiles WHERE id = ?").run(resolvedId)
				.changes > 0
		);
	}
}

/**
 * The file-backed adapter behind the `ProfileStore` port: per-project embedded
 * SQLite for birth profiles (`./lumen.db`, override with `LUMEN_DB`). Created
 * lazily on first write — reads against a missing file respond empty without
 * creating it. 0600 permissions, rollback journal (no WAL), migrations via
 * PRAGMA user_version. This class owns the file policy; the SQL lives in the
 * shared `ProfileDb` core.
 */
export class SqliteProfileStore implements ProfileStore {
	private core: ProfileDb | null = null;
	private database: Database | null = null;
	private closed = false;

	constructor(
		readonly dbPath: string = defaultDbFile(),
		private readonly now: () => Date = () => new Date(),
	) {}

	/** Opens (creating if needed) the database. Only writes call this. */
	private open(): ProfileDb {
		if (this.core !== null) return this.core;
		try {
			mkdirSync(dirname(this.dbPath), { recursive: true, mode: 0o700 });
			if (!existsSync(this.dbPath)) {
				openSync(this.dbPath, "a");
				chmodSync(this.dbPath, 0o600);
			}
			const database = new Database(this.dbPath);
			// Policy: rollback journal (no WAL) regardless of any pre-existing
			// connection setting on the file.
			database.exec("PRAGMA journal_mode = DELETE;");
			ensureSchema(database);
			this.database = database;
			this.core = new ProfileDb(database, this.now);
			// A close() followed by a read re-opens the store; keep it closeable
			// again so the re-opened handle is not leaked on a later close().
			this.closed = false;
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
		return this.core;
	}

	private fileExists(): boolean {
		return existsSync(this.dbPath);
	}

	list(): Profile[] {
		if (!this.fileExists()) return [];
		return this.open().list();
	}

	get(id: string): Profile | undefined {
		if (!this.fileExists()) return undefined;
		return this.open().get(id);
	}

	add(profile: NewProfile): AddResult {
		return this.open().add(profile);
	}

	remove(id: string): boolean {
		if (!this.fileExists()) return false;
		return this.open().remove(id);
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		this.database?.close();
		this.database = null;
		this.core = null;
	}
}

/**
 * The in-memory adapter behind the `ProfileStore` port: a thin wrapper over an
 * injected bun:sqlite `Database` (tests: `:memory:`). No file policy, no
 * lifecycle of its own — the caller owns the `Database`; this store's `close`
 * closes it.
 */
export class InMemoryProfileStore implements ProfileStore {
	private readonly database: Database;
	private readonly core: ProfileDb;
	private closed = false;

	constructor(database: Database, now: () => Date = () => new Date()) {
		ensureSchema(database);
		this.database = database;
		this.core = new ProfileDb(database, now);
	}

	list(): Profile[] {
		return this.core.list();
	}

	get(id: string): Profile | undefined {
		return this.core.get(id);
	}

	add(profile: NewProfile): AddResult {
		return this.core.add(profile);
	}

	remove(id: string): boolean {
		return this.core.remove(id);
	}

	close(): void {
		if (this.closed) return;
		this.closed = true;
		this.database.close();
	}
}
