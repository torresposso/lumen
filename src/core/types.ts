export interface BirthClock {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

/** What `profile add` receives: local wall-clock time, UTC offset and coordinates. */
export interface BirthInput {
	local: BirthClock;
	offsetMinutes: number;
	lat: number;
	lon: number;
}

/** A stored birth profile. `jdUt` is derived by lumen (Meeus); everything else is the input as given. */
export interface Profile {
	id: string;
	name: string | null;
	city: string;
	birth: {
		local: BirthClock;
		offsetMinutes: number;
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
