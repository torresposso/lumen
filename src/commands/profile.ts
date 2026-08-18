import { randomUUID } from "node:crypto";
import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { meeusJdUt, validateBirthInput } from "../core/jd";
import { formatWhen, roundCoordinate, roundJdUt } from "../core/toon";
import type { BirthClock, BirthInput, Profile } from "../core/types";
import { ProfileStore as DefaultProfileStore } from "../storage/profile-store";

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
	"Removes one profile by its UUID. Removing an absent profile is a successful no-op.",
].join("\n");

const ADD_FLAGS = new Set(["--when", "--offset", "--at", "--city", "--name"]);

function store(context: CliContext | undefined): DefaultProfileStore {
	return context?.profiles ?? new DefaultProfileStore();
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

function parseWhen(value: string): BirthClock {
	const match = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})$/.exec(
		value.trim(),
	);
	if (match === null) {
		throw new AxiError(
			`Invalid --when format: "${value}"`,
			"VALIDATION_ERROR",
			['Expected "YYYY-MM-DDTHH:MM" (local time, no seconds)'],
		);
	}
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
		hour: Number(match[4]),
		minute: Number(match[5]),
	};
}

function parseAt(value: string): { lat: number; lon: number } {
	const match = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(
		value.trim(),
	);
	if (match === null) {
		throw new AxiError(`Invalid --at format: "${value}"`, "VALIDATION_ERROR", [
			'Expected "lat,lon" in decimal degrees',
		]);
	}
	return { lat: Number(match[1]), lon: Number(match[2]) };
}

function parseOffset(value: string): number {
	if (!/^[+-]?\d+$/.test(value.trim())) {
		throw new AxiError(`Invalid --offset: "${value}"`, "VALIDATION_ERROR", [
			"Expected an integer number of minutes",
		]);
	}
	return Number(value.trim());
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

			const local = parseWhen(
				requiredFlag(flags, "--when", "lumen profile add"),
			);
			const offsetMinutes = parseOffset(
				requiredFlag(flags, "--offset", "lumen profile add"),
			);
			const { lat, lon } = parseAt(
				requiredFlag(flags, "--at", "lumen profile add"),
			);
			const city = requiredFlag(flags, "--city", "lumen profile add").trim();
			if (city === "") {
				throw new AxiError("--city must not be empty", "VALIDATION_ERROR", [
					'Example: --city "Madrid, Spain"',
				]);
			}
			const name = flags.get("--name")?.trim() || null;

			const input: BirthInput = { local, offsetMinutes, lat, lon };
			const issues = validateBirthInput(input);
			if (issues.length > 0) {
				throw new AxiError("Invalid birth input", "VALIDATION_ERROR", issues);
			}
			const jdUt = meeusJdUt(local, offsetMinutes);

			const { profile, created } = store(context).add({
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
			const profiles = store(context).list().map(displayProfile);
			return profiles.length > 0
				? { profiles }
				: {
						profiles: [],
						help: [
							'Run `lumen profile add --when "..." --offset ... --at "..." --city "..."`',
						],
					};
		}

		case "get": {
			assertNoFlags(rest, "lumen profile get");
			const id = singleId(rest, "lumen profile get");
			const profile = store(context).get(id);
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
			const removed = store(context).remove(id);
			return {
				profile: id,
				status: removed ? "removed" : "already absent (no-op)",
			};
		}

		default:
			throw validationError("lumen profile", `Unknown profile command: ${sub}`);
	}
};
