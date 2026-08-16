import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { BODIES, type BodyId, EXTRA_BODIES, julianDay } from "caelus";
import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeProgressions, computeStations } from "../core/journey";
import type { ResolvedBirth } from "../core/types";
import type { CliContext } from "./client";
import { requestFromProfile } from "./client";

const KNOWN_TIMING_BODIES = new Set<string>([...BODIES, ...EXTRA_BODIES]);
const MAX_STATION_YEARS = 100;
const DEFAULT_STATION_LIMIT = 30;

export const journeyUsage = [
	"lumen journey progressed <client> --at 2026-08-13 [--bodies moon,sun,pluto] [--orb 3]",
	"lumen journey stations <client> --body mercury [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 30]",
	"",
	"El reloj temporal del Alma: progresiones secundarias y estaciones planetarias.",
].join("\n");

export const journeyProgressedUsage = [
	"lumen journey progressed <client> --at 2026-08-13 [--bodies moon,sun,pluto] [--orb 3]",
	"",
	"  <client>    ID del consultante o `--profile <id>`",
	"  --at        Fecha objetivo en formato YYYY-MM-DD (alias: `--date`)",
	"  --bodies    Cuerpos a progresar, separados por comas (default: moon,sun,pluto)",
	"  --orb       Orbe máximo para contactos a puntos evolutivos (default: 3°)",
	"",
	"  Incluye la fase Sol-Luna progresada y aspectos a Plutón, PPP y Eje Nodal.",
].join("\n");

export const journeyStationsUsage = [
	"lumen journey stations <client> --body mercury [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--limit 30]",
	"",
	"  <client>    ID del consultante o `--profile <id>`",
	"  --body      Cuerpo a buscar estaciones (mercury, venus, mars, etc.)",
	"  --years     Ventana en años desde el nacimiento (default: 1, máx: 100)",
	"  --limit     Límite de eventos de estación (default: 30)",
].join("\n");

interface TargetDate {
	year: number;
	month: number;
	day: number;
	jdUt: number;
}

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
	if (month === 2) return isLeapYear(year) ? 29 : 28;
	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseDate(raw: string): TargetDate {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (match === null) {
		throw new AxiError(`Invalid date: ${raw}`, "VALIDATION_ERROR", [
			"Use YYYY-MM-DD, for example 2026-08-13",
		]);
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (
		year < 1 ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > daysInMonth(year, month)
	) {
		throw new AxiError(`Invalid calendar date: ${raw}`, "VALIDATION_ERROR", [
			"Use a real YYYY-MM-DD date, for example 2026-08-13",
		]);
	}
	return { year, month, day, jdUt: julianDay(year, month, day) };
}

function assertDateAfterBirth(
	target: TargetDate,
	birth: { year: number; month: number; day: number },
): void {
	const birthValue = birth.year * 10000 + birth.month * 100 + birth.day;
	const targetValue = target.year * 10000 + target.month * 100 + target.day;
	if (targetValue <= birthValue) {
		throw new AxiError(
			"Flag --date must be after the birth date",
			"VALIDATION_ERROR",
			[
				`Birth date: ${birth.year}-${String(birth.month).padStart(2, "0")}-${String(birth.day).padStart(2, "0")}`,
			],
		);
	}
}

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

function assertOnce(seen: Set<string>, flag: string): void {
	if (seen.has(flag)) {
		throw new AxiError(
			`Flag ${flag} was provided more than once`,
			"VALIDATION_ERROR",
			[`Use ${flag} exactly once`],
		);
	}
	seen.add(flag);
}

function parseClientAndArgs(args: string[]): {
	client: string;
	rest: string[];
} {
	let client: string | undefined;
	const seen = new Set<string>();
	const rest: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		if (arg === "--profile" || arg.startsWith("--profile=")) {
			assertOnce(seen, "--profile");
			if (arg === "--profile") {
				const taken = takeValue(args, i, "profile");
				client = taken.value;
				i = taken.next;
			} else {
				client = arg.slice("--profile=".length);
			}
			continue;
		}

		if (client === undefined && !arg.startsWith("-")) {
			client = arg;
			continue;
		}

		rest.push(arg);
	}

	if (client === undefined) {
		throw new AxiError(
			"Client ID or --profile is required",
			"VALIDATION_ERROR",
			["Run `lumen journey --help`"],
		);
	}

	return { client, rest };
}

function validateBodies(bodies: string[]): void {
	if (bodies.length === 0) {
		throw new AxiError(
			"Flag --bodies requires at least one body",
			"VALIDATION_ERROR",
			["Example: --bodies moon,sun,pluto"],
		);
	}
	const unknown = bodies.find((body) => !KNOWN_TIMING_BODIES.has(body));
	if (unknown !== undefined) {
		throw new AxiError(`Unknown body: ${unknown}`, "VALIDATION_ERROR", [
			"Use a known caelus body id, for example moon, sun, pluto",
		]);
	}
}

async function progressed(args: string[], context: CliContext | undefined) {
	const { client, rest: clientRest } = parseClientAndArgs(args);
	let dateRaw: string | undefined;
	let bodiesRaw = "moon,sun,pluto";
	let orb = 3;
	const rest: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < clientRest.length; i++) {
		const arg = clientRest[i];
		if (arg === undefined) continue;

		if (
			arg === "--at" ||
			arg.startsWith("--at=") ||
			arg === "--date" ||
			arg.startsWith("--date=")
		) {
			assertOnce(seen, "--date");
			const isAt = arg.startsWith("--at");
			const prefix = isAt ? "--at" : "--date";
			if (arg === prefix) {
				const taken = takeValue(clientRest, i, isAt ? "at" : "date");
				dateRaw = taken.value;
				i = taken.next;
			} else {
				dateRaw = arg.slice(`${prefix}=`.length);
			}
			continue;
		}

		if (arg === "--bodies" || arg.startsWith("--bodies=")) {
			assertOnce(seen, "--bodies");
			if (arg === "--bodies") {
				const taken = takeValue(clientRest, i, "bodies");
				bodiesRaw = taken.value;
				i = taken.next;
			} else {
				bodiesRaw = arg.slice("--bodies=".length);
			}
			continue;
		}

		if (arg === "--orb" || arg.startsWith("--orb=")) {
			assertOnce(seen, "--orb");
			const raw =
				arg === "--orb"
					? takeValue(clientRest, i, "orb").value
					: arg.slice("--orb=".length);
			if (arg === "--orb") i++;
			orb = Number(raw);
			if (!Number.isFinite(orb) || orb <= 0) {
				throw new AxiError(
					"Flag --orb expects a positive number",
					"VALIDATION_ERROR",
					["Example: --orb 3"],
				);
			}
			continue;
		}

		rest.push(arg);
	}

	if (rest.length > 0) {
		throw new AxiError(
			`Unexpected argument: ${rest.join(" ")}`,
			"VALIDATION_ERROR",
			["Run `lumen journey progressed --help`"],
		);
	}

	if (dateRaw === undefined) {
		throw new AxiError(
			"Target date is required via --at or --date",
			"VALIDATION_ERROR",
			["Example: --at 2026-08-13"],
		);
	}

	const request = requestFromProfile(context, client);
	const target = parseDate(dateRaw);
	assertDateAfterBirth(target, request.birth.local);

	const bodyList = bodiesRaw
		.split(",")
		.map((b) => b.trim())
		.filter(Boolean);
	validateBodies(bodyList);

	const ephemeris = new CaelusEphemeris();
	const natal = ephemeris.chartAt(
		request.birth.jdUt,
		request.birth.lat,
		request.birth.lon,
		{ houseSystem: request.options.houseSystem },
	);

	const resolvedBirth: ResolvedBirth = {
		jdUt: request.birth.jdUt,
		lat: request.birth.lat,
		lon: request.birth.lon,
		zone: request.birth.zone,
		offsetMinutes: request.birth.offsetMinutes,
		dst: request.birth.dst,
		status: request.birth.status,
		local: request.birth.local,
	};

	const result = computeProgressions(
		resolvedBirth,
		natal,
		target.jdUt,
		dateRaw,
		ephemeris,
		bodyList as BodyId[],
		orb,
	);

	return {
		journey: {
			kind: "progressed",
			client,
			targetDate: dateRaw,
			ageYears: result.ageYears,
			solLunaPhase: result.solLunaPhase?.name,
		},
		progressed: result.bodies.map((b) => ({
			body: b.body,
			lon: b.lon,
			sign: b.sign,
			signDeg: b.signDeg,
			house: b.house,
			...(b.evolutionaryContacts.length > 0
				? {
						evolutionaryContacts: b.evolutionaryContacts.map((c) => ({
							target: c.natalPoint,
							aspect: c.aspect,
							orb: c.orb,
						})),
					}
				: {}),
		})),
	};
}

async function stations(args: string[], context: CliContext | undefined) {
	const { client, rest: clientRest } = parseClientAndArgs(args);
	let body: string | undefined;
	let fromRaw: string | undefined;
	let toRaw: string | undefined;
	let years: number | undefined;
	let limit = DEFAULT_STATION_LIMIT;
	const seen = new Set<string>();

	const parsePositiveInteger = (raw: string, flag: string): number => {
		const value = Number(raw);
		if (!Number.isInteger(value) || value <= 0) {
			throw new AxiError(
				`Flag --${flag} expects a positive integer`,
				"VALIDATION_ERROR",
				[`Example: --${flag} 30`],
			);
		}
		return value;
	};

	for (let i = 0; i < clientRest.length; i++) {
		const arg = clientRest[i];
		if (arg === undefined) continue;

		if (arg === "--body" || arg.startsWith("--body=")) {
			assertOnce(seen, "--body");
			body =
				arg === "--body"
					? takeValue(clientRest, i, "body").value
					: arg.slice("--body=".length);
			if (arg === "--body") i++;
			continue;
		}

		if (arg === "--from" || arg.startsWith("--from=")) {
			assertOnce(seen, "--from");
			fromRaw =
				arg === "--from"
					? takeValue(clientRest, i, "from").value
					: arg.slice("--from=".length);
			if (arg === "--from") i++;
			continue;
		}

		if (arg === "--to" || arg.startsWith("--to=")) {
			assertOnce(seen, "--to");
			toRaw =
				arg === "--to"
					? takeValue(clientRest, i, "to").value
					: arg.slice("--to=".length);
			if (arg === "--to") i++;
			continue;
		}

		if (arg === "--years" || arg.startsWith("--years=")) {
			assertOnce(seen, "--years");
			const raw =
				arg === "--years"
					? takeValue(clientRest, i, "years").value
					: arg.slice("--years=".length);
			if (arg === "--years") i++;
			years = Number(raw);
			if (!Number.isFinite(years) || years <= 0 || years > MAX_STATION_YEARS) {
				throw new AxiError(
					`Flag --years expects a positive number no greater than ${MAX_STATION_YEARS}`,
					"VALIDATION_ERROR",
					["Example: --years 1"],
				);
			}
			continue;
		}

		if (arg === "--limit" || arg.startsWith("--limit=")) {
			assertOnce(seen, "--limit");
			const raw =
				arg === "--limit"
					? takeValue(clientRest, i, "limit").value
					: arg.slice("--limit=".length);
			if (arg === "--limit") i++;
			limit = parsePositiveInteger(raw, "limit");
			continue;
		}

		throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
			"Run `lumen journey stations --help`",
		]);
	}

	if (body === undefined) {
		throw new AxiError("Flag --body is required", "VALIDATION_ERROR", [
			"Example: --body mercury",
		]);
	}
	if (!KNOWN_TIMING_BODIES.has(body)) {
		throw new AxiError(`Unknown body: ${body}`, "VALIDATION_ERROR", [
			"Use a known caelus body id, for example mercury, venus, mars",
		]);
	}
	if (fromRaw !== undefined && toRaw !== undefined) {
		const from = parseDate(fromRaw);
		const to = parseDate(toRaw);
		if (to.jdUt <= from.jdUt) {
			throw new AxiError("Flag --to must be after --from", "VALIDATION_ERROR", [
				"Example: --from 2026-01-01 --to 2026-12-31",
			]);
		}
	}

	const request = requestFromProfile(context, client);
	const ephemeris = new CaelusEphemeris();

	const resolvedBirth: ResolvedBirth = {
		jdUt: request.birth.jdUt,
		lat: request.birth.lat,
		lon: request.birth.lon,
		zone: request.birth.zone,
		offsetMinutes: request.birth.offsetMinutes,
		dst: request.birth.dst,
		status: request.birth.status,
		local: request.birth.local,
	};

	const fromJd = fromRaw !== undefined ? parseDate(fromRaw).jdUt : undefined;
	const toJd = toRaw !== undefined ? parseDate(toRaw).jdUt : undefined;
	const result = computeStations(
		resolvedBirth,
		body as BodyId,
		ephemeris,
		{ startJd: fromJd, endJd: toJd, years },
		limit,
	);

	const projected = result.stations.map((s) => ({
		jdUt: s.jdUt,
		direction: s.type,
	}));

	const windowYears = result.windowYears;
	const help: string[] = [];
	if (projected.length >= limit && projected.length > 0) {
		help.push(
			`Run \`lumen journey stations ${client} --body ${body} --limit ${limit + 50}\` for up to ${limit + 50} stations`,
		);
	}

	return {
		journey: {
			kind: "stations",
			client,
			body,
			from: fromRaw ?? "birth",
			to: toRaw ?? `${windowYears.toFixed(2)} years after birth`,
			limit,
		},
		stations: projected,
		...(help.length > 0 ? { help } : {}),
	};
}

export const journeyCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return journeyUsage;

	if (sub === "progressed") {
		if (rest.includes("--help")) return journeyProgressedUsage;
		return progressed(rest, context);
	}

	if (sub === "stations") {
		if (rest.includes("--help")) return journeyStationsUsage;
		return stations(rest, context);
	}

	throw new AxiError(`Unknown journey command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen journey --help` for valid subcommands",
	]);
};

/** Retrocompatible `timing` aliases; `lumen timing` is routed to journey. */
export const timingCommand = journeyCommand;
export const timingUsage = journeyUsage;
