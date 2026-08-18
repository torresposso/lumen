import { randomUUID } from "node:crypto";
import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../core/args";
import { parseBirthInput } from "../core/birth-input";
import { meeusJdUt } from "../core/jd";
import { toonProfile } from "../core/toon";
import type { ProfileStore as DefaultProfileStore } from "../storage/profile-store";

export interface CliContext {
	profiles: DefaultProfileStore;
}

export const profileUsage = [
	'lumen profile add --when 1981-01-26T00:50 --offset 60 --at "9.15,-74.75" --birthplace "Magangué, Colombia" [--name slug]',
	"lumen profile list",
	"lumen profile get <uuid>",
	"lumen profile rm <uuid>",
	"",
	"Manage local birth profiles.",
].join("\n");

export const profileAddUsage = [
	'lumen profile add --when "YYYY-MM-DDTHH:MM" --offset ±N --at "lat,lon" --birthplace "City, Country" [--name slug]',
	"",
	"Register a birth profile. The agent resolves coordinates and UTC offset",
	"from the place; lumen validates, computes the Julian Day and stores it.",
	"",
	"Flags:",
	"  --when          Local date/time, no seconds (required)",
	"  --offset        UTC offset in minutes, integer -840..840 (required)",
	'  --at            "lat,lon" in decimal degrees (required)',
	'  --birthplace    Human-readable place, e.g. "Madrid, Spain" (required)',
	"  --name          Optional descriptive slug (no lookup)",
	"",
	"Adding the same birth twice (same jdUt + coordinates) returns the existing",
	"profile unchanged.",
].join("\n");

/** The canonical `add` example, shared by the home screen and the empty `list` hint. */
export const PROFILE_ADD_EXAMPLE =
	'lumen profile add --when "1981-01-26T00:50" --offset 60 --at "9.15,-74.75" --birthplace "Magangué, Colombia"';

export const profileListUsage = [
	"lumen profile list",
	"",
	"Lists saved profiles: id, name, birthplace, local time, offset, coordinates and jdUt.",
].join("\n");

export const profileGetUsage = [
	"lumen profile get <uuid>",
	"",
	"Shows one profile by its UUID.",
].join("\n");

export const profileRmUsage = [
	"lumen profile rm <uuid>",
	"",
	"Removes one profile by its UUID. Removing an unknown profile raises NOT_FOUND.",
].join("\n");

const ADD_FLAGS = new Set([
	"--when",
	"--offset",
	"--at",
	"--birthplace",
	"--name",
]);

/** `profile add` — flags required, no positionals. */
const ADD_SPEC: ArgsSpec = {
	known: ADD_FLAGS,
	required: new Set(["--when", "--offset", "--at", "--birthplace"]),
	positionals: 0,
	rules: {
		"--birthplace": { trim: true, nonEmpty: true },
		"--name": { trim: true, emptyAsNull: true },
	},
};

/** `profile list` — no flags, no positionals. */
const LIST_SPEC: ArgsSpec = { known: new Set(), positionals: 0 };

/** `profile get | rm` — no flags, exactly one positional id. */
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
		case "rm":
			return profileRmUsage;
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
			const offset = parsed.flags.get("--offset") as string;
			const at = parsed.flags.get("--at") as string;
			const birthplace = parsed.flags.get("--birthplace") as string;
			const name = parsed.flags.get("--name") ?? null;

			const { local, offsetMinutes, lat, lon } = parseBirthInput({
				when,
				offset,
				at,
			});
			const jdUt = meeusJdUt(local, offsetMinutes);

			const { profile, created } = requireProfileStore(context).add({
				id: randomUUID(),
				name,
				birthplace,
				birth: { local, offsetMinutes, lat, lon, jdUt },
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
				: { profiles: [], help: [`Run \`${PROFILE_ADD_EXAMPLE}\``] };
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

		case "rm": {
			const parsed = parseArgs(rest, ID_SPEC, "lumen profile rm");
			if (parsed.help) return usageFor(sub);
			const id = parsed.positionals[0] as string;
			const removed = requireProfileStore(context).remove(id);
			if (!removed) {
				throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
					"Run `lumen profile list` to see saved profiles",
				]);
			}
			return { profile: id, status: "removed" };
		}

		default:
			throw validationError("lumen profile", `Unknown profile command: ${sub}`);
	}
};
