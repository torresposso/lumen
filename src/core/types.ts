/** The broken-down local wall-clock reading — transient to the birth-input contract's derivation (never stored, never crosses an interface). */
export interface LocalTime {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** What `profile add` receives, parsed and derived by the birth-input contract. */
export interface BirthInput {
	/** Canonical ISO 8601 datetime with UTC offset, e.g. `1990-06-10T14:30-04:00`. The stored `birthDateTime`. */
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	/** Human-readable place — the stored `birthPlace`. */
	birthPlace: string;
	/** Derived Julian Day (UT) — Meeus ch. 7, computed by the contract (via `julianDayUt`). */
	birthJdUt: number;
}

/** What the store persists for a new profile: an optional `name` plus the complete birth. */
export type NewProfile = {
	name: string | null;
} & BirthInput;

/**
 * A stored birth profile. The birth is the identity unit: `add` deduplicates
 * on `birthJdUt + birthLat + birthLon` and generates the UUID.
 */
export interface Profile extends NewProfile {
	id: string;
	createdAt: string;
	updatedAt: string;
}

export interface AddResult {
	profile: Profile;
	/** false when a profile with the same birth (birthJdUt + birthLat + birthLon) already existed. */
	created: boolean;
}

/**
 * The persistence port — what the command arms, the top-level home and the
 * CLI wiring see of a store: four operations, no file policy, no lifecycle.
 * The command never creates or closes a store, and never sees a constructor —
 * the composition root provides one through context. The SQLite adapter
 * (`SqliteProfileStore` in `src/storage/profile-store.ts`) implements this.
 */
export interface ProfileStore {
	/** Every saved profile, ordered by id. */
	list(): Profile[];
	/** One profile by its UUID; `undefined` when unknown. */
	get(id: string): Profile | undefined;
	/** Inserts a profile (generating its UUID), deduplicating on the birth. */
	add(profile: NewProfile): AddResult;
	/** Removes one profile by UUID; false when unknown. */
	remove(id: string): boolean;
}

// ---------------------------------------------------------------------------
// CLI context — the composition root's shape, consumed by commands and wiring.
// core/ defines the port; storage/ implements it — no storage import here.
// ---------------------------------------------------------------------------

export interface CliContext {
	profiles: ProfileStore;
}
