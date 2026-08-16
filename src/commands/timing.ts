import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { BODIES, EXTRA_BODIES, julianDay } from "caelus";
import type { CliContext } from "../cli/context";
import { requestFromProfile } from "../cli/profile-args";
import {
	findAspect,
	normalizeLongitude,
	projectPoint,
	roundPrecision,
} from "../core/celestial-coordinates";
import { CaelusEphemeris } from "../core/ephemeris-gateway";

const KNOWN_TIMING_BODIES = new Set<string>([...BODIES, ...EXTRA_BODIES]);
const MAX_STATION_YEARS = 100;
const DEFAULT_STATION_LIMIT = 30;

export const timingUsage = [
	"lumen timing progressed --profile <id> --date 2026-08-13 [--bodies moon,sun,pluto]",
	"lumen timing stations --profile <id> --body mercury [--years 1] [--limit 30]",
	"",
	"progressed: longitudes secundarias progresadas (día por año).",
	"stations:   estaciones de un cuerpo en una ventana desde el nacimiento.",
].join("\n");

const timingProgressedUsage = [
	"lumen timing progressed --profile <id> --date 2026-08-13 [--bodies moon,sun,pluto]",
	"",
	"  --profile   Perfil guardado con `lumen profile add`",
	"  --date      Fecha objetivo en formato YYYY-MM-DD (posterior al nacimiento)",
	"  --bodies    Cuerpos a progresar, separados por comas (default: moon,sun,pluto)",
	"",
	"  Cada fila incluye evolutionaryContacts: aspectos de la posición progresada",
	"  a Plutón natal, su punto de polaridad y el eje nodal (orbe 3°).",
].join("\n");

const timingStationsUsage = [
	"lumen timing stations --profile <id> --body mercury [--years 1] [--limit 30]",
	"",
	"  --profile   Perfil guardado con `lumen profile add`",
	"  --body      Cuerpo a buscar estaciones",
	"  --years     Ventana en años desde el nacimiento, entre 0 y 100 (default: 1)",
	"  --limit     Máximo de estaciones mostradas (default: 30)",
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

function parseProfileArg(args: string[]): { profile: string; rest: string[] } {
	let profile: string | undefined;
	const seen = new Set<string>();
	const rest: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--profile" || arg.startsWith("--profile=")) {
			assertOnce(seen, "--profile");
			if (arg === "--profile") {
				const taken = takeValue(args, i, "profile");
				profile = taken.value;
				i = taken.next;
			} else {
				profile = arg.slice("--profile=".length);
				if (profile === "") {
					throw new AxiError(
						"Flag --profile requires a value",
						"VALIDATION_ERROR",
						["Example: --profile <id>"],
					);
				}
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

function validateStationBody(body: string): void {
	if (!KNOWN_TIMING_BODIES.has(body)) {
		throw new AxiError(`Unknown body: ${body}`, "VALIDATION_ERROR", [
			"Use a known caelus body id, for example mercury, venus, mars",
		]);
	}
}

async function progressed(args: string[], context: CliContext | undefined) {
	const { profile, rest: profileRest } = parseProfileArg(args);
	let dateRaw: string | undefined;
	let bodiesRaw = "moon,sun,pluto";
	const rest: string[] = [];
	const seen = new Set<string>();

	for (let i = 0; i < profileRest.length; i++) {
		const arg = profileRest[i];
		if (arg === undefined) continue;
		if (arg === "--date" || arg.startsWith("--date=")) {
			assertOnce(seen, "--date");
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
			assertOnce(seen, "--bodies");
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
	const target = parseDate(dateRaw);
	assertDateAfterBirth(target, request.birth.local);

	const bodies = bodiesRaw
		.split(",")
		.map((body) => body.trim())
		.filter(Boolean);
	validateBodies(bodies);

	const ephemeris = new CaelusEphemeris();
	const natal = ephemeris.chartAt(
		request.birth.jdUt,
		request.birth.lat,
		request.birth.lon,
		{ houseSystem: request.options.houseSystem },
	);

	const selectedNode =
		request.options.node === "mean"
			? natal.bodies.mean_node
			: (natal.bodies.true_node ?? natal.bodies.mean_node);
	const evolutionaryTargets = [
		...(natal.bodies.pluto
			? [{ id: "pluto", lon: natal.bodies.pluto.lon }]
			: []),
		...(natal.bodies.pluto
			? [
					{
						id: "polarity_point",
						lon: normalizeLongitude(natal.bodies.pluto.lon + 180),
					},
				]
			: []),
		...(selectedNode
			? [
					{ id: "north_node", lon: selectedNode.lon },
					{
						id: "south_node",
						lon: normalizeLongitude(selectedNode.lon + 180),
					},
				]
			: []),
	];

	const progressedAspects = [
		{ name: "conjunction", target: 0, orb: 3 },
		{ name: "sextile", target: 60, orb: 3 },
		{ name: "square", target: 90, orb: 3 },
		{ name: "trine", target: 120, orb: 3 },
		{ name: "opposition", target: 180, orb: 3 },
	] as const;

	const rows = bodies.map((body) => {
		let lon: number;
		try {
			lon = ephemeris.progressedLongitude(
				body as Parameters<CaelusEphemeris["progressedLongitude"]>[0],
				request.birth.jdUt,
				target.jdUt,
			);
		} catch (_err) {
			throw new AxiError(`Cannot progress body: ${body}`, "INVALID_VALUE", [
				"Use a known caelus body id, for example moon, sun, pluto",
			]);
		}
		const point = projectPoint(lon, natal.cusps);
		const evolutionaryContacts = evolutionaryTargets
			.map((evolutionaryTarget) => {
				const match = findAspect(
					lon,
					evolutionaryTarget.lon,
					progressedAspects,
				);
				return match
					? {
							target: evolutionaryTarget.id,
							aspect: match.aspect,
							orb: match.orb,
						}
					: undefined;
			})
			.filter((contact) => contact !== undefined)
			.sort(
				(a, b) =>
					a.orb - b.orb ||
					a.target.localeCompare(b.target) ||
					a.aspect.localeCompare(b.aspect),
			);
		return {
			body,
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
			...(evolutionaryContacts.length > 0 ? { evolutionaryContacts } : {}),
		};
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
	let limit = DEFAULT_STATION_LIMIT;
	const seen = new Set<string>();

	for (let i = 0; i < profileRest.length; i++) {
		const arg = profileRest[i];
		if (arg === undefined) continue;
		if (arg === "--body" || arg.startsWith("--body=")) {
			assertOnce(seen, "--body");
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
			assertOnce(seen, "--years");
			const raw =
				arg === "--years"
					? takeValue(profileRest, i, "years").value
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
					? takeValue(profileRest, i, "limit").value
					: arg.slice("--limit=".length);
			if (arg === "--limit") i++;
			limit = Number(raw);
			if (!Number.isInteger(limit) || limit <= 0) {
				throw new AxiError(
					"Flag --limit expects a positive integer",
					"VALIDATION_ERROR",
					["Example: --limit 30"],
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
	validateStationBody(body);

	const request = requestFromProfile(context, profile);
	const ephemeris = new CaelusEphemeris();
	let rows: Array<[number, "retrograde" | "direct"]>;
	try {
		const found = ephemeris.stations(
			body as Parameters<CaelusEphemeris["stations"]>[0],
			request.birth.jdUt,
			request.birth.jdUt + years * 365.24219,
			limit,
		);
		if (found === undefined) {
			throw new AxiError(
				"Station search is not available in this build",
				"INVALID_VALUE",
			);
		}
		rows = found;
	} catch (err) {
		if (err instanceof AxiError) throw err;
		throw new AxiError(
			`Cannot search stations for body: ${body}`,
			"INVALID_VALUE",
			["Use a known caelus body id, for example mercury, venus, mars"],
		);
	}

	const projected = rows.map(([jdUt, direction]) => ({
		jdUt: roundPrecision(jdUt),
		direction,
	}));
	const help: string[] = [];
	if (projected.length >= limit && projected.length > 0) {
		help.push(
			`Run \`lumen timing stations --profile ${profile} --body ${body} --years ${years} --limit ${limit + 50}\` for up to ${limit + 50} stations`,
		);
	}

	return {
		timing: { kind: "stations", profile, body, years, limit },
		stations: projected,
		...(help.length > 0 ? { help } : {}),
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
