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
