import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../core/args";
import { parseBirthInput } from "../core/birth-input";
import { toonProfile } from "../core/toon";
import type { ProfileStore as DefaultProfileStore } from "../storage/profile-store";

export interface CliContext {
	profiles: DefaultProfileStore;
}

/**
 * The canonical `add` example — the single source for every usage and
 * empty-state reference. Never re-type it: interpolate this constant.
 */
export const PROFILE_ADD_EXAMPLE =
	'lumen profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia"';

/** The empty-state hint pointing an agent at `add`, shared by `list` and `home`. */
export const PROFILE_ADD_HINT = `Run \`${PROFILE_ADD_EXAMPLE}\``;

export const profileUsage = [
	`${PROFILE_ADD_EXAMPLE} [--name slug]`,
	"lumen profile list",
	"lumen profile get <uuid>",
	"lumen profile delete <uuid>",
	"",
	"Manage local birth profiles.",
].join("\n");

export const profileAddUsage = [
	'lumen profile add --when "YYYY-MM-DDTHH:MM±HH:MM" --where "lat, lon, Place, Country" [--name slug]',
	"",
	"Register a birth profile. The agent resolves coordinates and the UTC",
	"offset, formats them into --when and --where, and calls lumen; lumen",
	"validates, computes the Julian Day and stores it.",
	"",
	"Flags:",
	"  --when    ISO 8601 datetime with UTC offset, e.g. 1990-06-10T14:30-04:00 or ...Z (required)",
	'  --where   Coordinates then the place: "lat, lon, Place" (required); the place may contain commas',
	"  --name    Optional descriptive slug (no lookup)",
	"",
	"Adding the same birth twice (same birthJdUt + coordinates) returns the existing",
	"profile unchanged.",
].join("\n");

export const profileListUsage = [
	"lumen profile list",
	"",
	"Lists saved profiles: id, name, birthplace, birthDateTime, coordinates and birthJdUt.",
].join("\n");

export const profileGetUsage = [
	"lumen profile get <uuid>",
	"",
	"Shows one profile by its UUID.",
].join("\n");

export const profileDeleteUsage = [
	"lumen profile delete <uuid>",
	"",
	"Deletes one profile by its UUID. Deleting an unknown profile raises NOT_FOUND.",
].join("\n");

const ADD_FLAGS = new Set(["--when", "--where", "--name"]);

/** `profile add` — flags required, no positionals. */
const ADD_SPEC: ArgsSpec = {
	known: ADD_FLAGS,
	required: new Set(["--when", "--where"]),
	positionals: 0,
	rules: {
		"--name": { trim: true, emptyAsNull: true },
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

/**
 * The one seam the command module reaches through to persistence. The command
 * never creates a store — the CLI wiring provides it through context — so a
 * store operation without context fails loud instead of default-constructing
 * (which would silently create `./lumen.db` in the cwd).
 */
export function requireProfileStore(
	context: CliContext | undefined,
): DefaultProfileStore {
	if (context === undefined) {
		throw new AxiError("No profile store in context", "PROFILE_ERROR", [
			"The CLI always provides one — this is a lumen bug",
		]);
	}
	return context.profiles;
}

function usageFor(sub: string): string {
	switch (sub) {
		case "add":
			return profileAddUsage;
		case "list":
			return profileListUsage;
		case "get":
			return profileGetUsage;
		case "delete":
			return profileDeleteUsage;
		default:
			return profileUsage;
	}
}

function validationError(command: string, message: string): AxiError {
	return new AxiError(message, "VALIDATION_ERROR", [
		`Run \`${command} --help\` for usage`,
	]);
}

export const profileCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") return profileUsage;

	switch (sub) {
		case "add": {
			const parsed = parseArgs(rest, ADD_SPEC, "lumen profile add");
			if (parsed.help) return usageFor(sub);

			const when = parsed.flags.get("--when") as string;
			const where = parsed.flags.get("--where") as string;
			const name = parsed.flags.get("--name") ?? null;

			// One seam: the raw flags in, the complete birth (birthJdUt derived)
			// out — the store generates the profile's UUID.
			const birth = parseBirthInput({ when, where });
			const { profile, created } = requireProfileStore(context).add({
				...birth,
				name,
			});
			return {
				status: created ? "added" : "already exists",
				...toonProfile(profile),
			};
		}

		case "list": {
			const parsed = parseArgs(rest, LIST_SPEC, "lumen profile list");
			if (parsed.help) return usageFor(sub);
			const profiles = requireProfileStore(context).list().map(toonProfile);
			return profiles.length > 0
				? { profiles }
				: { profiles: [], help: [PROFILE_ADD_HINT] };
		}

		case "get": {
			const parsed = parseArgs(rest, ID_SPEC, "lumen profile get");
			if (parsed.help) return usageFor(sub);
			const id = parsed.positionals[0] as string;
			const profile = requireProfileStore(context).get(id);
			if (profile === undefined) {
				throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
					"Run `lumen profile list` to see saved profiles",
				]);
			}
			return toonProfile(profile);
		}

		case "delete": {
			const parsed = parseArgs(rest, ID_SPEC, "lumen profile delete");
			if (parsed.help) return usageFor(sub);
			const id = parsed.positionals[0] as string;
			const removed = requireProfileStore(context).remove(id);
			if (!removed) {
				throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
					"Run `lumen profile list` to see saved profiles",
				]);
			}
			return { profile: id, status: "deleted" };
		}

		default:
			throw validationError("lumen profile", `Unknown profile command: ${sub}`);
	}
};
