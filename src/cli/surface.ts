/**
 * The command surface — the single home of the whole agent-facing CLI
 * vocabulary (ADR-0007): the command and arm tokens, the flag literals, the
 * canonical add example, the arm help catalog, the derived top-level
 * "Commands:" block and the shared empty-state / NOT_FOUND hints.
 * The top-level help, the command's usage text and the subcommand group name
 * reference these tokens; none re-types a literal, so a command, arm or flag
 * rename is one edit in this module. The command surface holds the *names*
 * and the *presentation* rules; the contracts hold the *meanings* (ADR-0006).
 * The **home view** (`homeView` in `src/cli/home.ts`) composes the profile
 * count plus the empty-state hint a bare invocation publishes.
 */

/** The top-level command token — "lumen profile". */
export const PROFILE_COMMAND = "lumen profile";

/** The four arm command-lines as an agent sees them in help and usage text. */
export const PROFILE_ARMS = {
	add: `${PROFILE_COMMAND} add`,
	list: `${PROFILE_COMMAND} list`,
	get: `${PROFILE_COMMAND} get`,
	delete: `${PROFILE_COMMAND} delete`,
} as const;

export const ADD_FLAGS = {
	when: "--when",
	where: "--where",
	name: "--name",
} as const;

/** The canonical `add` example — the single source for every usage and empty-state reference. */
export const PROFILE_ADD_EXAMPLE = `${PROFILE_ARMS.add} ${ADD_FLAGS.when} "1981-01-26T00:50-05:00" ${ADD_FLAGS.where} "9.15, -74.75, Magangué, Colombia"`;

/** The empty-state hint pointing an agent at `add` (list arm, top-level home). */
export const PROFILE_ADD_HINT = `Run \`${PROFILE_ADD_EXAMPLE}\``;

/** The not-found hint pointing an agent at `list` (get/delete arms, top-level home). */
export const PROFILE_LIST_HINT = `Run \`${PROFILE_ARMS.list}\` to see saved profiles`;

/** The one-liner for each arm, interpolating the flag tokens. */
export const PROFILE_ARM_HELP = {
	add: `Register a birth (ISO ${ADD_FLAGS.when} + ${ADD_FLAGS.where} coordinates/place)`,
	list: "List saved profiles",
	get: "Show one profile by UUID",
	delete: "Remove one profile by UUID",
} as const;

/**
 * The top-level "Commands:" block, derived from the registered arm catalog.
 */
export function formatCommandsHelp(
	catalog: readonly { line: string; help: string }[],
): string {
	const width = Math.max(...catalog.map((entry) => entry.line.length));

	return [
		"Commands:",
		...catalog.map((entry) => `  ${entry.line.padEnd(width + 1)}${entry.help}`),
	].join("\n");
}

/**
 * The shared empty-state rule: an empty store points the agent at `add`, a
 * non-empty one at `list`. `true` for a non-empty store. The hint tokens and
 * the rule that selects between them live here, in the surface module.
 */
export function emptyStateHint(hasProfiles: boolean): string {
	return hasProfiles ? PROFILE_LIST_HINT : PROFILE_ADD_HINT;
}

// Compat barrel: `homeView` used to live here; it now lives in `./home`
// (vocabulary vs view is the split, ADR-0007). Re-exported so existing
// consumers keep working during the transition.
export { homeView } from "./home";
