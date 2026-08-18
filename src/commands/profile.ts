import { randomUUID } from "node:crypto";
import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../core/args";
import { parseBirthInput } from "../core/birth-input";
import { julianDayUt } from "../core/jd";
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
	'lumen profile add --birthdatetime "1981-01-26T00:50-05:00" --birthlat 9.15 --birthlon -74.75 --birthplace "Magangué, Colombia"';

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
	'lumen profile add --birthdatetime "YYYY-MM-DDTHH:MM±HH:MM" --birthlat <lat> --birthlon <lon> --birthplace "City, Country" [--name slug]',
	"",
	"Register a birth profile. The agent resolves coordinates and the UTC",
	"offset, formats them into --birthdatetime, and calls lumen; lumen",
	"validates, computes the Julian Day and stores it.",
	"",
	"Flags:",
	"  --birthdatetime  ISO 8601 datetime with UTC offset, e.g. 1990-06-10T14:30-04:00 or ...Z (required)",
	"  --birthlat       Latitude in decimal degrees, -90..90 (required)",
	"  --birthlon       Longitude in decimal degrees, -180..180 (required)",
	'  --birthplace     Human-readable place, e.g. "Madrid, Spain" (required)',
	"  --name           Optional descriptive slug (no lookup)",
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

const ADD_FLAGS = new Set([
	"--birthdatetime",
	"--birthlat",
	"--birthlon",
	"--birthplace",
	"--name",
]);

/** `profile add` — flags required, no positionals. */
const ADD_SPEC: ArgsSpec = {
	known: ADD_FLAGS,
	required: new Set([
		"--birthdatetime",
		"--birthlat",
		"--birthlon",
		"--birthplace",
	]),
	positionals: 0,
	rules: {
		"--birthplace": { trim: true, nonEmpty: true },
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

			const birthDateTime = parsed.flags.get("--birthdatetime") as string;
			const birthLat = parsed.flags.get("--birthlat") as string;
			const birthLon = parsed.flags.get("--birthlon") as string;
			const birthPlace = parsed.flags.get("--birthplace") as string;
			const name = parsed.flags.get("--name") ?? null;

			const {
				birthDateTime: canonicalDateTime,
				local,
				offsetMinutes,
				birthLat: lat,
				birthLon: lon,
			} = parseBirthInput({ birthDateTime, birthLat, birthLon });
			const birthJdUt = julianDayUt(local, offsetMinutes);

			const { profile, created } = requireProfileStore(context).add({
				id: randomUUID(),
				name,
				birthPlace,
				birthDateTime: canonicalDateTime,
				birthLat: lat,
				birthLon: lon,
				birthJdUt,
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
