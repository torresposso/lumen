import type { NewProfile, Profile } from "./model";

export interface AddResult {
	profile: Profile;
	/** false when a profile with the same birth (birthJdUt + birthLat + birthLon) already existed. */
	created: boolean;
}

/**
 * The persistence port — what the command arms, the top-level home view and
 * the CLI wiring see of a store: four operations, no file policy, no lifecycle.
 * The command never creates or closes a store, and never sees a constructor —
 * the composition root provides one through context. The SQLite adapters
 * (`SqliteProfileStore` / `InMemoryProfileStore` in
 * `src/storage/profile-store.ts`) implement this port.
 */
export interface ProfileStore {
	/** Every saved profile, ordered by id. */
	list(): Profile[];
	/** One profile by its unique name; `undefined` when unknown. */
	getByName(name: string): Profile | undefined;
	/** Inserts a profile (generating its UUID), deduplicating on the birth and enforcing a unique name. */
	add(profile: NewProfile): AddResult;
	/** Removes one profile by its unique name; false when unknown. */
	removeByName(name: string): boolean;
}
