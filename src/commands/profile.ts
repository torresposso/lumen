import { randomUUID } from "node:crypto";
import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { parseBirthInput } from "../core/birth-input";
import { meeusJdUt } from "../core/jd";
import { formatWhen, roundCoordinate, roundJdUt } from "../core/toon";
import type { Profile } from "../core/types";
import type { ProfileStore as DefaultProfileStore } from "../storage/profile-store";

export interface CliContext {
	profiles: DefaultProfileStore;
}

export const profileUsage = [
	'lumen profile add --when 1981-01-26T00:50 --offset 60 --at "9.15,-74.75" --city "Magangué, Colombia" [--name slug]',
	"lumen profile list",
	"lumen profile get <uuid>",
	"lumen profile rm <uuid>",
	"",
	"Manage local birth profiles.",
].join("\n");

export const profileAddUsage = [
	'lumen profile add --when "YYYY-MM-DDTHH:MM" --offset ±N --at "lat,lon" --city "City, Country" [--name slug]',
	"",
	"Register a birth profile. The agent resolves coordinates and UTC offset",
	"from the place; lumen validates, computes the Julian Day and stores it.",
	"",
	"Flags:",
	"  --when    Local date/time, no seconds (required)",
	"  --offset  UTC offset in minutes, integer -840..840 (required)",
	'  --at      "lat,lon" in decimal degrees (required)',
	'  --city    Human-readable place, e.g. "Madrid, Spain" (required)',
	"  --name    Optional descriptive slug (no lookup)",
	"",
	"Adding the same birth twice (same jdUt + coordinates) returns the existing",
	"profile unchanged.",
].join("\n");

/** The canonical `add` example, shared by the home screen and the empty `list` hint. */
export const PROFILE_ADD_EXAMPLE =
	'lumen profile add --when "1981-01-26T00:50" --offset 60 --at "9.15,-74.75" --city "Magangué, Colombia"';

export const profileListUsage = [
	"lumen profile list",
	"",
	"Lists saved profiles: id, name, city, local time, offset, coordinates and jdUt.",
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

const ADD_FLAGS = new Set(["--when", "--offset", "--at", "--city", "--name"]);

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

function parseFlags(
	args: string[],
	known: Set<string>,
	command: string,
): Map<string, string> {
	const values = new Map<string, string>();
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--help") {
			values.set("--help", "");
			continue;
		}
		if (!arg.startsWith("--")) {
			throw validationError(command, `Unexpected argument: ${arg}`);
		}
		const eq = arg.indexOf("=");
		const flag = eq === -1 ? arg : arg.slice(0, eq);
		if (!known.has(flag)) {
			throw validationError(command, `Unknown flag: ${flag}`);
		}
		let value: string;
		if (eq !== -1) {
			value = arg.slice(eq + 1);
		} else {
			const next = args[i + 1];
			if (next === undefined || next.startsWith("--")) {
				throw validationError(command, `Flag ${flag} requires a value`);
			}
			value = next;
			i++;
		}
		if (values.has(flag)) {
			throw validationError(command, `Flag ${flag} provided more than once`);
		}
		values.set(flag, value);
	}
	return values;
}

function requiredFlag(
	flags: Map<string, string>,
	flag: string,
	command: string,
): string {
	const value = flags.get(flag);
	if (value === undefined) {
		throw validationError(
			command,
			`Missing required flag ${flag} (value) for ${command}`,
		);
	}
	return value;
}

function assertNoFlags(args: string[], command: string): void {
	for (const arg of args) {
		if (arg.startsWith("-")) {
			throw validationError(command, `${command} takes no flags`);
		}
	}
}

function singleId(args: string[], command: string): string {
	const [id, ...extra] = args;
	if (extra.length > 0 && extra[0] !== undefined) {
		throw validationError(command, `Unexpected argument: ${extra[0]}`);
	}
	if (id === undefined || id.startsWith("-")) {
		throw new AxiError(`${command} requires a profile id`, "VALIDATION_ERROR", [
			"Use the UUID printed by `lumen profile add`",
		]);
	}
	return id;
}

/** The TOON-shaped view of a profile: same fields, display-precision numbers. */
function displayProfile(profile: Profile) {
	return {
		id: profile.id,
		name: profile.name,
		city: profile.city,
		when: formatWhen(profile.birth.local),
		offset: profile.birth.offsetMinutes,
		lat: roundCoordinate(profile.birth.lat),
		lon: roundCoordinate(profile.birth.lon),
		jdUt: roundJdUt(profile.birth.jdUt),
	};
}

export const profileCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") return profileUsage;
	if (rest.includes("--help")) return usageFor(sub);

	switch (sub) {
		case "add": {
			const flags = parseFlags(rest, ADD_FLAGS, "lumen profile add");
			if (flags.has("--help")) return profileAddUsage;

			const when = requiredFlag(flags, "--when", "lumen profile add");
			const offset = requiredFlag(flags, "--offset", "lumen profile add");
			const at = requiredFlag(flags, "--at", "lumen profile add");
			const city = requiredFlag(flags, "--city", "lumen profile add").trim();
			if (city === "") {
				throw new AxiError("--city must not be empty", "VALIDATION_ERROR", [
					'Example: --city "Madrid, Spain"',
				]);
			}
			const name = flags.get("--name")?.trim() || null;

			const { local, offsetMinutes, lat, lon } = parseBirthInput({
				when,
				offset,
				at,
			});
			const jdUt = meeusJdUt(local, offsetMinutes);

			const { profile, created } = requireProfileStore(context).add({
				id: randomUUID(),
				name,
				city,
				birth: { local, offsetMinutes, lat, lon, jdUt },
			});
			return {
				status: created ? "added" : "already exists",
				...displayProfile(profile),
			};
		}

		case "list": {
			assertNoFlags(rest, "lumen profile list");
			const profiles = requireProfileStore(context).list().map(displayProfile);
			return profiles.length > 0
				? { profiles }
				: { profiles: [], help: [`Run \`${PROFILE_ADD_EXAMPLE}\``] };
		}

		case "get": {
			assertNoFlags(rest, "lumen profile get");
			const id = singleId(rest, "lumen profile get");
			const profile = requireProfileStore(context).get(id);
			if (profile === undefined) {
				throw new AxiError(`Unknown profile: ${id}`, "NOT_FOUND", [
					"Run `lumen profile list` to see saved profiles",
				]);
			}
			return displayProfile(profile);
		}

		case "rm": {
			assertNoFlags(rest, "lumen profile rm");
			const id = singleId(rest, "lumen profile rm");
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
