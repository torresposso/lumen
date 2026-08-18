/** The broken-down local wall-clock reading, used transiently to derive the Julian Day (never stored). */
export interface LocalTime {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** What `profile add` receives, parsed by the birth-input contract. */
export interface BirthInput {
	/** Canonical ISO 8601 datetime with UTC offset, e.g. `1990-06-10T14:30-04:00`. The stored `birthDateTime`. */
	birthDateTime: string;
	/** Transient local wall-clock (not stored) — the Julian-Day input. */
	local: LocalTime;
	/** Transient UTC offset in minutes (not stored) — the Julian-Day input. */
	offsetMinutes: number;
	birthLat: number;
	birthLon: number;
	/** Human-readable place — the stored `birthPlace`. */
	birthPlace: string;
}

/**
 * A stored birth profile. The birth is the identity unit: `add` deduplicates
 * on `birthJdUt + birthLat + birthLon`.
 */
export interface Profile {
	id: string;
	name: string | null;
	/** Human-readable place (e.g. `Magangué, Colombia`) — display only, never identity. */
	birthPlace: string;
	/** The birth moment as ISO 8601 with UTC offset — the single stored time value. */
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	/** Derived Julian Day (UT) via `julianDayUt` (Meeus ch. 7, pure arithmetic). */
	birthJdUt: number;
	createdAt: string;
	updatedAt: string;
}

export type NewProfile = Omit<Profile, "createdAt" | "updatedAt">;

export interface AddResult {
	profile: Profile;
	/** false when a profile with the same birth (birthJdUt + birthLat + birthLon) already existed. */
	created: boolean;
}
