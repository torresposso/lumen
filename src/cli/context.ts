import { AxiError } from "axi-sdk-js";
import type { Ephemeris } from "../adapters/ephemeris";
import type { ProfileStore } from "../domain/store";

/** The composition root's context shape, consumed by command arms and home view. */
export interface CliContext {
	profiles: ProfileStore;
	ephemeris: Ephemeris;
}

/**
 * Asserts that CLI context is present, throwing a loud PROFILE_ERROR if missing.
 */
export function requireCliContext(context: CliContext | undefined): CliContext {
	if (context === undefined) {
		throw new AxiError("No context provided", "PROFILE_ERROR", [
			"The CLI always provides one — this is a lumen bug",
		]);
	}
	return context;
}
