/**
 * The model — the flat `birth*` vocabulary of a profile as the contracts and
 * the store know it (ADR-0005). The transient derivation read the birth-input
 * contract feeds to `julianDayUt` is not here: `LocalTime` lives beside the
 * arithmetic that consumes it (`src/core/jd.ts`).
 */
export const MIN_LAT = -90;
export const MAX_LAT = 90;
export const MIN_LON = -180;
export const MAX_LON = 180;

export interface BirthInput {
	/** Canonical ISO 8601 datetime with UTC offset, e.g. `1990-06-10T14:30-04:00`. The stored `birthDateTime`. */
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	/** Human-readable place — the stored `birthPlace`. */
	birthPlace: string;
	/** Derived Julian Day (UT) — Meeus ch. 7, computed by the birth-input contract (via `julianDayUt`). */
	birthJdUt: number;
}

/** What the store persists for a new profile: a required, unique `name` plus the complete birth. */
export type NewProfile = {
	name: string;
} & BirthInput;

/**
 * A stored birth profile. The birth is the storage-identity unit: `add`
 * deduplicates on `birthJdUt + birthLat + birthLon` and generates the UUID.
 * The `name` is the required, unique CLI lookup key.
 */
export interface Profile extends NewProfile {
	id: string;
	createdAt: string;
	updatedAt: string;
}
