import { AxiError } from "axi-sdk-js";
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
	/** One profile by its UUID; `undefined` when unknown. */
	get(id: string): Profile | undefined;
	/** Inserts a profile (generating its UUID), deduplicating on the birth. */
	add(profile: NewProfile): AddResult;
	/** Removes one profile by UUID; false when unknown. */
	remove(id: string): boolean;
}

/** The composition root's context shape, consumed by command arms and home view. */
export interface CliContext {
	profiles: ProfileStore;
}

/**
 * Asserts that CLI context is present, throwing a loud PROFILE_ERROR if missing.
 */
export function requireCliContext(context: CliContext | undefined): CliContext {
	if (context === undefined) {
		throw new AxiError("No profile store in context", "PROFILE_ERROR", [
			"The CLI always provides one — this is a lumen bug",
		]);
	}
	return context;
}
