import { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../cli/args";
import { parseBirthInput } from "../domain/birth-input";
import {
	ADD_FLAGS,
	emptyStateHint,
	PROFILE_ADD_EXAMPLE,
	PROFILE_ARM_HELP,
	PROFILE_ARMS,
	PROFILE_COMMAND,
	PROFILE_LIST_HINT,
} from "../cli/surface";
import type { CliContext } from "../cli/context";
import { createSubcommandGroup } from "../cli/subcommand";
import { toonProfile } from "../domain/toon";

const profileUsage = [
	`${PROFILE_ADD_EXAMPLE} [${ADD_FLAGS.name} slug]`,
	PROFILE_ARMS.list,
	`${PROFILE_ARMS.get} <uuid>`,
	`${PROFILE_ARMS.delete} <uuid>`,
	"",
	"Manage local birth profiles.",
].join("\n");

const profileAddUsage = [
	`${PROFILE_ARMS.add} ${ADD_FLAGS.when} "YYYY-MM-DDTHH:MM±HH:MM" ${ADD_FLAGS.where} "lat, lon, Place, Country" [${ADD_FLAGS.name} slug]`,
	"",
	"Register a birth profile. The agent resolves coordinates and the UTC",
	`offset, formats them into ${ADD_FLAGS.when} and ${ADD_FLAGS.where}, and calls lumen; lumen`,
	"validates, computes the Julian Day and stores it.",
	"",
	"Flags:",
	`  ${ADD_FLAGS.when}    ISO 8601 datetime with UTC offset, e.g. 1990-06-10T14:30-04:00 or ...Z (required)`,
	`  ${ADD_FLAGS.where}   Coordinates then the place: "lat, lon, Place" (required); the place may contain commas`,
	`  ${ADD_FLAGS.name}    Optional descriptive slug (no lookup)`,
	"",
	"Adding the same birth twice (same birthJdUt + coordinates) returns the existing",
	"profile unchanged.",
].join("\n");

const profileListUsage = [
	PROFILE_ARMS.list,
	"",
	"Lists saved profiles: id, name, birthplace, birthDateTime, coordinates and birthJdUt.",
].join("\n");

const profileGetUsage = [
	`${PROFILE_ARMS.get} <uuid>`,
	"",
	"Shows one profile by its UUID.",
].join("\n");

const profileDeleteUsage = [
	`${PROFILE_ARMS.delete} <uuid>`,
	"",
	"Deletes one profile by its UUID. Deleting an unknown profile raises NOT_FOUND.",
].join("\n");

/** `profile add` — flags required, no positionals. */
const ADD_SPEC: ArgsSpec = {
	known: new Set(Object.values(ADD_FLAGS)),
	required: new Set([ADD_FLAGS.when, ADD_FLAGS.where]),
	positionals: 0,
	rules: {
		[ADD_FLAGS.name]: { trim: true, emptyAsNull: true },
	},
};

/** `profile list` — no flags, no positionals. */
const LIST_SPEC: ArgsSpec = { known: new Set(), positionals: 0 };

/** `profile get | delete` — no flags, exactly one positional id. */
const ID_SPEC: ArgsSpec = {
	known: new Set(),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
};

export const profileCommand = createSubcommandGroup<CliContext>({
	name: PROFILE_COMMAND,
	usage: profileUsage,
	subcommands: {
		add: {
			spec: ADD_SPEC,
			summary: PROFILE_ARM_HELP.add,
			usage: profileAddUsage,
			run: (parsed, context) => {
				const { profiles } = context;
				const when = parsed.flags.get(ADD_FLAGS.when) as string;
				const where = parsed.flags.get(ADD_FLAGS.where) as string;
				const name = parsed.flags.get(ADD_FLAGS.name) ?? null;

				// One seam: the raw flags in, the complete birth (birthJdUt derived)
				// out — the store generates the profile's UUID.
				const birth = parseBirthInput({ when, where });
				const { profile, created } = profiles.add({
					...birth,
					name,
				});
				return {
					status: created ? "added" : "already exists",
					...toonProfile(profile),
				};
			},
		},

		list: {
			spec: LIST_SPEC,
			summary: PROFILE_ARM_HELP.list,
			usage: profileListUsage,
			run: (_parsed, context) => {
				const { profiles } = context;
				const rows = profiles.list().map(toonProfile);
				const hasProfiles = rows.length > 0;
				return hasProfiles
					? { profiles: rows }
					: { profiles: [], help: [emptyStateHint(hasProfiles)] };
			},
		},

		get: {
			spec: ID_SPEC,
			summary: PROFILE_ARM_HELP.get,
			usage: profileGetUsage,
			run: (parsed, context) => {
				const { profiles } = context;
				const id = parsed.positionals[0] as string;
				const profile = profiles.get(id);
				if (profile === undefined) {
					throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
						PROFILE_LIST_HINT,
					]);
				}
				return toonProfile(profile);
			},
		},

		delete: {
			spec: ID_SPEC,
			summary: PROFILE_ARM_HELP.delete,
			usage: profileDeleteUsage,
			run: (parsed, context) => {
				const { profiles } = context;
				const id = parsed.positionals[0] as string;
				const removed = profiles.remove(id);
				if (!removed) {
					throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
						PROFILE_LIST_HINT,
					]);
				}
				return { profile: id, status: "deleted" };
			},
		},
	},
});
