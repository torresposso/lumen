/** The broken-down wall-clock reading, used transiently to derive the Julian Day. */
export interface BirthClock {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** What `profile add` receives, parsed by the birth-input contract. */
export interface BirthInput {
	/** Canonical ISO 8601 datetime with UTC offset, e.g. `1990-06-10T14:30-04:00`. The stored `when`. */
	when: string;
	/** Transient civil wall-clock (not stored) — the Meeus input. */
	clock: BirthClock;
	/** Transient UTC offset in minutes (not stored) — the Meeus input. */
	offsetMinutes: number;
	lat: number;
	lon: number;
}

/** A stored birth profile. The birth is the identity unit (dedupe on jdUt + lat + lon). */
export interface Profile {
	id: string;
	name: string | null;
	birthplace: string;
	birth: {
		/** The birth moment as ISO 8601 with UTC offset — the single stored time value. */
		when: string;
		lat: number;
		lon: number;
		jdUt: number;
	};
	createdAt: string;
	updatedAt: string;
}

export type NewProfile = Omit<Profile, "createdAt" | "updatedAt">;

export interface AddResult {
	profile: Profile;
	/** false when a profile with the same birth (jdUt + lat + lon) already existed. */
	created: boolean;
}
