/**
 * The command surface — the single home of the whole agent-facing CLI
 * vocabulary (ADR-0007): the command and arm tokens, the flag literals, the
 * canonical add example and the shared empty-state / NOT_FOUND hints. The
 * top-level help, the command's usage text, the subcommand group name and the
 * birth-input contract's messages reference these tokens; none re-types a
 * literal, so a command, arm or flag rename is one edit in this module. The
 * command surface holds the *names*; the contracts hold the *meanings*
 * (ADR-0006).
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

/**
 * The shared empty-state rule: an empty store points the agent at `add`, a
 * non-empty one at `list`. `true` for a non-empty store. The hint tokens and
 * the rule that selects between them live here, in the surface module.
 */
export function emptyStateHint(hasProfiles: boolean): string {
	return hasProfiles ? PROFILE_LIST_HINT : PROFILE_ADD_HINT;
}
