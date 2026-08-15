import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { julianDay } from "caelus";
import type { CliContext } from "../cli/context";
import { requestFromProfile } from "../cli/profile-args";
import { projectPoint, roundPrecision } from "../core/celestial-coordinates";
import { CaelusEphemeris } from "../core/ephemeris-gateway";

export const timingUsage = [
	"lumen timing progressed --profile <id> --date 2026-08-13 [--bodies moon,sun,pluto]",
	"lumen timing stations --profile <id> --body mercury [--years 1]",
	"",
	"progressed: longitudes secundarias progresadas (día por año).",
	"stations:   estaciones de un cuerpo en una ventana desde el nacimiento.",
].join("\n");

const timingProgressedUsage = [
	"lumen timing progressed --profile <id> --date 2026-08-13 [--bodies moon,sun,pluto]",
	"",
	"  --profile   Perfil guardado con `lumen profile add`",
	"  --date      Fecha objetivo en formato YYYY-MM-DD",
	"  --bodies    Cuerpos a progresar, separados por comas (default: moon,sun,pluto)",
].join("\n");

const timingStationsUsage = [
	"lumen timing stations --profile <id> --body mercury [--years 1]",
	"",
	"  --profile   Perfil guardado con `lumen profile add`",
	"  --body      Cuerpo a buscar estaciones",
	"  --years     Ventana en años desde el nacimiento (default: 1)",
].join("\n");

function takeValue(
	args: string[],
	index: number,
	name: string,
): { value: string; next: number } {
	const next = args[index + 1];
	if (next === undefined || next.startsWith("-")) {
		throw new AxiError(`Flag --${name} requires a value`, "VALIDATION_ERROR", [
			`Example: --${name} <value>`,
		]);
	}
	return { value: next, next: index + 1 };
}

function parseProfileArg(args: string[]): { profile: string; rest: string[] } {
	let profile: string | undefined;
	const rest: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--profile" || arg.startsWith("--profile=")) {
			if (arg === "--profile") {
				const taken = takeValue(args, i, "profile");
				profile = taken.value;
				i = taken.next;
			} else {
				profile = arg.slice("--profile=".length);
			}
			continue;
		}
		rest.push(arg);
	}
	if (profile === undefined) {
		throw new AxiError("Flag --profile is required", "VALIDATION_ERROR", [
			"Run `lumen timing --help`",
		]);
	}
	return { profile, rest };
}

function parseDate(raw: string): number {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (match === null) {
		throw new AxiError(`Invalid date: ${raw}`, "VALIDATION_ERROR", [
			"Use YYYY-MM-DD, for example 2026-08-13",
		]);
	}
	return julianDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

async function progressed(args: string[], context: CliContext | undefined) {
	const { profile, rest: profileRest } = parseProfileArg(args);
	let dateRaw: string | undefined;
	let bodiesRaw = "moon,sun,pluto";
	const rest: string[] = [];

	for (let i = 0; i < profileRest.length; i++) {
		const arg = profileRest[i];
		if (arg === undefined) continue;
		if (arg === "--date" || arg.startsWith("--date=")) {
			if (arg === "--date") {
				const taken = takeValue(profileRest, i, "date");
				dateRaw = taken.value;
				i = taken.next;
			} else {
				dateRaw = arg.slice("--date=".length);
			}
			continue;
		}
		if (arg === "--bodies" || arg.startsWith("--bodies=")) {
			if (arg === "--bodies") {
				const taken = takeValue(profileRest, i, "bodies");
				bodiesRaw = taken.value;
				i = taken.next;
			} else {
				bodiesRaw = arg.slice("--bodies=".length);
			}
			continue;
		}
		rest.push(arg);
	}

	if (rest.length > 0) {
		throw new AxiError(
			`Unexpected argument: ${rest.join(" ")}`,
			"VALIDATION_ERROR",
			["Run `lumen timing progressed --help`"],
		);
	}
	if (dateRaw === undefined) {
		throw new AxiError("Flag --date is required", "VALIDATION_ERROR", [
			"Example: --date 2026-08-13",
		]);
	}

	const request = requestFromProfile(context, profile);
	const targetJd = parseDate(dateRaw);
	const ephemeris = new CaelusEphemeris();
	const natal = ephemeris.chartAt(
		request.birth.jdUt,
		request.birth.lat,
		request.birth.lon,
		{ houseSystem: request.options.houseSystem },
	);

	const bodies = bodiesRaw
		.split(",")
		.map((body) => body.trim())
		.filter(Boolean);
	const rows = bodies.map((body) => {
		const lon = ephemeris.progressedLongitude?.(
			body as Parameters<
				NonNullable<CaelusEphemeris["progressedLongitude"]>
			>[0],
			request.birth.jdUt,
			targetJd,
		);
		if (lon === undefined) {
			throw new AxiError(`Cannot progress body: ${body}`, "VALIDATION_ERROR", [
				"Use a known caelus body id, for example moon, sun, pluto",
			]);
		}
		const point = projectPoint(lon, natal.cusps);
		return { body, lon: point.lon, sign: point.sign, signDeg: point.signDeg };
	});

	return {
		timing: { kind: "progressed", profile, date: dateRaw },
		progressed: rows,
	};
}

async function stations(args: string[], context: CliContext | undefined) {
	const { profile, rest: profileRest } = parseProfileArg(args);
	let body: string | undefined;
	let years = 1;

	for (let i = 0; i < profileRest.length; i++) {
		const arg = profileRest[i];
		if (arg === undefined) continue;
		if (arg === "--body" || arg.startsWith("--body=")) {
			if (arg === "--body") {
				const taken = takeValue(profileRest, i, "body");
				body = taken.value;
				i = taken.next;
			} else {
				body = arg.slice("--body=".length);
			}
			continue;
		}
		if (arg === "--years" || arg.startsWith("--years=")) {
			const raw =
				arg === "--years"
					? takeValue(profileRest, i, "years").value
					: arg.slice("--years=".length);
			if (arg === "--years") i++;
			years = Number(raw);
			if (!Number.isFinite(years) || years <= 0) {
				throw new AxiError(
					"Flag --years expects a positive number",
					"VALIDATION_ERROR",
					["Example: --years 1"],
				);
			}
			continue;
		}
		throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
			"Run `lumen timing stations --help`",
		]);
	}

	if (body === undefined) {
		throw new AxiError("Flag --body is required", "VALIDATION_ERROR", [
			"Example: --body mercury",
		]);
	}

	const request = requestFromProfile(context, profile);
	const ephemeris = new CaelusEphemeris();
	const rows = ephemeris.stations?.(
		body as Parameters<NonNullable<CaelusEphemeris["stations"]>>[0],
		request.birth.jdUt,
		request.birth.jdUt + years * 365.24219,
	);
	if (rows === undefined) {
		throw new AxiError(
			"Station search is not available in this build",
			"INVALID_VALUE",
		);
	}

	return {
		timing: { kind: "stations", profile, body, years },
		stations: rows.map(([jdUt, direction]) => ({
			jdUt: roundPrecision(jdUt),
			direction,
		})),
	};
}

export const timingCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return timingUsage;
	if (sub === "progressed") {
		if (rest.includes("--help")) return timingProgressedUsage;
		return progressed(rest, context);
	}
	if (sub === "stations") {
		if (rest.includes("--help")) return timingStationsUsage;
		return stations(rest, context);
	}
	throw new AxiError(`Unknown timing command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen timing --help` for valid subcommands",
	]);
};
