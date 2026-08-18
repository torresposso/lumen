import { AxiError } from "axi-sdk-js";
import type { ProfileStore } from "./store";

/**
 * The composition root's shape, consumed by commands and the top-level home
 * view. `core/` defines the port; `storage/` implements it — no storage
 * import here.
 */
export interface CliContext {
	profiles: ProfileStore;
}

/**
 * The one seam the command arms and the top-level home reach through to
 * persistence. The command never creates a store — the CLI wiring provides it
 * through context — so a store operation without context fails loud instead
 * of default-constructing (which would silently create `./lumen.db` in the
 * cwd).
 */
export function requireProfileStore(
	context: CliContext | undefined,
): ProfileStore {
	if (context === undefined) {
		throw new AxiError("No profile store in context", "PROFILE_ERROR", [
			"The CLI always provides one — this is a lumen bug",
		]);
	}
	return context.profiles;
}
