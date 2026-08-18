/**
 * The add surface — the single home of the ergonomic `profile add` vocabulary
 * (ADR-0007): the flag literals and the canonical add example. The command's
 * args spec, its usage text and the birth-input contract's messages reference
 * these tokens; none re-types a literal, so a flag rename is one edit in this
 * module. The add surface holds the *names*; the birth-input contract holds
 * the *meanings* (ADR-0006).
 */
export const ADD_FLAGS = {
	when: "--when",
	where: "--where",
	name: "--name",
} as const;

/** The canonical `add` example — the single source for every usage and empty-state reference. */
export const PROFILE_ADD_EXAMPLE = `lumen profile add ${ADD_FLAGS.when} "1981-01-26T00:50-05:00" ${ADD_FLAGS.where} "9.15, -74.75, Magangué, Colombia"`;
