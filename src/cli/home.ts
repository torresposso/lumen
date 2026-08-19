import type { ProfileStore } from "../domain/store";
import { emptyStateHint } from "./surface";

/**
 * The home view — what a bare `lumen` invocation (no command) publishes: the
 * profile count plus the empty-state hint. Owns the "snapshot the store, apply
 * the empty-state rule" composition; the `list` arm applies the same rule to
 * its rows, but only this seam composes the count-and-hint shape the root
 * wiring publishes.
 */
export function homeView(store: ProfileStore): {
	profiles: number;
	help: [string];
} {
	const profiles = store.list();
	const hasProfiles = profiles.length > 0;
	return { profiles: profiles.length, help: [emptyStateHint(hasProfiles)] };
}
