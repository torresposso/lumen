import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./client";

export const classicalUsage = [
	"lumen classical chart [...]",
	"lumen classical draconic [...]",
	"lumen classical synastry [...]",
	"",
	"Mecánica técnica y proyecciones tradicionales auxiliares (Lots, Dracónica, Estrellas).",
].join("\n");

export const classicalCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return classicalUsage;

	if (sub === "chart") {
		return chartCommand(["natal", ...rest], context);
	}
	if (sub === "draconic") {
		return chartCommand(["draconic", ...rest], context);
	}
	if (sub === "synastry") {
		return synastryCommand(rest, context);
	}

	throw new AxiError(`Unknown classical command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen classical --help` for valid subcommands",
	]);
};

// ============================================================================
// Chart engine (application layer; core stays pure)
// ============================================================================

import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris-gateway";
import {
	type AspectPattern,
	type ChartSignature,
	computeChartSignature,
	computeDeclinationAspects,
	computeFixedStarMatches,
	computeHermeticLots,
	computePrenatalEclipses,
	type DeclinationAspectProjection,
	type DraconicChart,
	detectAspectPatterns,
	type EclipseInfo,
	type EclipsesResult,
	type FixedStarMatch,
	generateFactAtoms,
	type InterpretationContext,
	type LotsResult,
	toDraconicChart,
} from "../core/classical";
import {
	computeEvolutionaryReading,
	type EvolutionaryResult,
} from "../core/soul";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest as EngineNatalRequest,
	ResolvedBirth,
} from "../core/types";
import { projectPoint, roundPrecision as round } from "../core/types";

export type {
	AspectPattern,
	ChartSignature,
	DeclinationAspectProjection,
	DraconicChart,
	EclipseInfo,
	EclipsesResult,
	FixedStarMatch,
	InterpretationContext,
	LotsResult,
};

export interface LonProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: AspectPhase;
	strength: number;
}

export interface Projection {
	meta: {
		jdUt: number;
		zodiac: Zodiac;
		houseSystem: HouseSystem;
		houseSystemRequested: HouseSystem;
		unavailable: string[];
	};
	bodies: Partial<Record<string, ChartBody>>;
	angles: {
		asc: LonProjection;
		mc: LonProjection;
		vertex: LonProjection;
		eastPoint: LonProjection;
	};
	cusps: LonProjection[];
	aspects: AspectProjection[];
	declinationAspects?: DeclinationAspectProjection[];
	patterns?: AspectPattern[];
	signature?: ChartSignature;
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicProjection;
}

export interface DraconicBodyProjection {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	dignities: string[];
}

export interface DraconicProjection {
	nodeUsed: "true_node" | "mean_node";
	bodies: Partial<Record<string, DraconicBodyProjection>>;
	angles: {
		asc: LonProjection;
		mc: LonProjection;
		vertex: LonProjection;
		eastPoint: LonProjection;
	};
	cusps: LonProjection[];
}

export interface BirthEcho {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	lat: number;
	lon: number;
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
	requested: ChartRequestOptions;
}

export type AstrologicalReading = {
	chart: Projection & { birth: BirthEcho };
	summary: {
		bodies: number;
		aspects: number;
		applying: number;
		separating: number;
		exact: number;
	};
	interpretationContext?: InterpretationContext;
	help?: string[];
};

/** Node ids to drop from the chart per `--node` selection. The engine always
 *  computes both nodes; this module owns the selection policy so the chart
 *  that leaves the seam is already final. */
const DROPPED_BY_NODE: Record<EngineNatalRequest["options"]["node"], string[]> =
	{
		both: [],
		mean: ["true_node"],
		true: ["mean_node"],
	};

function renderLon(input: number | { lon: number }): LonProjection {
	const rawLon = typeof input === "number" ? input : input.lon;
	const { lon, sign, signDeg } = projectPoint(rawLon);
	return { lon, sign, signDeg };
}

function projectBodies(
	source: Chart["bodies"],
): Partial<Record<string, ChartBody>> {
	const bodies: Partial<Record<string, ChartBody>> = {};
	for (const [id, body] of Object.entries(source)) {
		if (body === undefined) continue;
		bodies[id] = {
			lon: round(body.lon),
			sign: body.sign,
			signDeg: round(body.signDeg),
			house: body.house,
			retrograde: body.retrograde,
			speed: round(body.speed, 6),
			lat: round(body.lat),
			dist: body.dist === null ? null : round(body.dist),
			ra: round(body.ra),
			dec: round(body.dec),
			dignities: body.dignities,
		};
	}
	return bodies;
}

function projectDraconicBodies(
	source: Partial<Record<string, ChartBody>>,
): Partial<Record<string, DraconicBodyProjection>> {
	const bodies: Partial<Record<string, DraconicBodyProjection>> = {};
	for (const [id, body] of Object.entries(source)) {
		if (body === undefined) continue;
		bodies[id] = {
			lon: round(body.lon),
			sign: body.sign,
			signDeg: round(body.signDeg),
			house: body.house,
			retrograde: body.retrograde,
			speed: round(body.speed, 6),
			dignities: body.dignities,
		};
	}
	return bodies;
}

function projectAngles(angles: Chart["angles"]): Projection["angles"] {
	return {
		asc: renderLon(angles.asc),
		mc: renderLon(angles.mc),
		vertex: renderLon(angles.vertex),
		eastPoint: renderLon(angles.eastPoint),
	};
}

function projectDraconic(draconic: DraconicChart): DraconicProjection {
	return {
		nodeUsed: draconic.nodeUsed,
		bodies: projectDraconicBodies(draconic.bodies),
		angles: projectAngles(draconic.angles),
		cusps: draconic.cusps.map((c) => renderLon(c)),
	};
}

interface ProjectionInput {
	chart: Chart;
	bodies: Chart["bodies"];
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicChart;
}

function project(input: ProjectionInput): Projection {
	const {
		chart,
		bodies: rawBodies,
		eclipses,
		lots,
		stars,
		evolutionary,
		draconic,
	} = input;
	const bodies = projectBodies(rawBodies);

	const aspects = chart.aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: round(a.orb),
		phase: a.phase,
		strength: round(a.strength, 3),
	}));

	const declinationAspects = computeDeclinationAspects(rawBodies);
	const signature = computeChartSignature(rawBodies);
	const patterns = detectAspectPatterns(aspects, rawBodies);

	return {
		meta: {
			jdUt: round(chart.jdUt),
			zodiac: chart.zodiac,
			houseSystem: chart.houseSystem,
			houseSystemRequested: chart.houseSystemRequested,
			unavailable: chart.unavailable,
		},
		bodies,
		angles: projectAngles(chart.angles),
		cusps: chart.cusps.map((c) => renderLon(c)),
		aspects,
		declinationAspects,
		patterns,
		signature,
		...(eclipses ? { eclipses } : {}),
		...(lots ? { lots } : {}),
		...(stars ? { stars } : {}),
		...(evolutionary ? { evolutionary } : {}),
		...(draconic ? { draconic: projectDraconic(draconic) } : {}),
	};
}

function echoBirth(
	birth: ResolvedBirth,
	options: ChartRequestOptions,
): BirthEcho {
	return {
		year: birth.local.year,
		month: birth.local.month,
		day: birth.local.day,
		hour: birth.local.hour,
		minute: birth.local.minute,
		lat: birth.lat,
		lon: birth.lon,
		zone: birth.zone,
		offsetMinutes: birth.offsetMinutes,
		dst: birth.dst,
		status: birth.status,
		requested: { ...options },
	};
}

export class AstrologicalEngine {
	private ephemeris: Ephemeris;

	constructor(ephemeris?: Ephemeris) {
		this.ephemeris = ephemeris ?? new CaelusEphemeris();
	}

	/** Computes the raw caelus chart for a validated request. Kept public for
	 *  synastry and timing commands that need the underlying engine chart. */
	chartFor(request: EngineNatalRequest): Chart {
		const { birth, options } = request;
		return this.ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, {
			houseSystem: options.houseSystem,
			zodiac: options.zodiac,
			bodies: options.bodies,
			topocentric: options.topocentric,
		});
	}

	compute(request: EngineNatalRequest): AstrologicalReading {
		const { birth, options } = request;
		const rawChart: Chart = this.chartFor(request);

		const evolutionary = options.evolutionary
			? computeEvolutionaryReading(rawChart, options.node)
			: undefined;

		const draconic = options.draconic
			? toDraconicChart(rawChart, options.node)
			: undefined;

		const eclipses = options.eclipses
			? computePrenatalEclipses(
					this.ephemeris,
					birth,
					rawChart.cusps,
					options.houseSystem,
					options.topocentric,
				)
			: undefined;

		const lots = options.lots
			? computeHermeticLots(this.ephemeris, birth, rawChart.cusps)
			: undefined;

		const natalBodies = { ...rawChart.bodies };
		for (const dropped of DROPPED_BY_NODE[options.node]) {
			delete natalBodies[dropped];
		}

		const stars = options.stars
			? computeFixedStarMatches(
					this.ephemeris,
					birth,
					natalBodies,
					rawChart.angles,
				)
			: undefined;

		const projected = project({
			chart: rawChart,
			bodies: natalBodies,
			eclipses,
			lots,
			stars,
			evolutionary,
			draconic,
		});

		const help: string[] = [];
		if (rawChart.houseSystem !== rawChart.houseSystemRequested) {
			help.push(
				`House system "${rawChart.houseSystemRequested}" fell back to "${rawChart.houseSystem}" (undefined above the polar circle)`,
			);
		}
		if (rawChart.unavailable.length > 0) {
			help.push(
				`Bodies omitted (outside fitted ephemeris range): ${rawChart.unavailable.join(", ")}`,
			);
		}
		if (request.birth.status !== "ok") {
			help.push(
				`Timezone resolution provenance status: ${request.birth.status}`,
			);
		}
		if (options.evolutionary) {
			help.push(
				"The four natural evolutionary conditions (dimly evolved, herd, individuated, spiritual) cannot be determined from the chart alone; the evolutionary reading reports evidence, not a final condition.",
			);
		}

		const aspects = projected.aspects;
		const interpretationContext = generateFactAtoms(projected);

		return {
			chart: { ...projected, birth: echoBirth(request.birth, request.options) },
			summary: {
				bodies: Object.keys(projected.bodies).length,
				aspects: aspects.length,
				applying: aspects.filter((a) => a.phase === "applying").length,
				separating: aspects.filter((a) => a.phase === "separating").length,
				exact: aspects.filter((a) => a.phase === "exact").length,
			},
			interpretationContext,
			...(help.length > 0 ? { help } : {}),
		};
	}
}

// ============================================================================
// `lumen chart` command (retrocompatible alias for `lumen classical chart`)
// ============================================================================

import {
	NatalIntake,
	type NatalRequest,
	requestFromProfile,
	takeProfileArg,
} from "./client";

const FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const chartUsage = [
	"lumen chart (default: evolutionary) | lumen chart natal | lumen chart draconic",
	"",
	NatalIntake.usage,
].join("\n");

export const chartNatalUsage = [
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal base (efemérides caelus) sin lectura evolutiva.",
	"Usa `lumen chart` para la lectura evolutiva completa.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal y su proyección draconic con lectura evolutiva.",
].join("\n");

type ChartMode = "evolutionary" | "natal" | "draconic";

const CHART_MODES = new Set(["natal", "evolutionary", "draconic"]);

function usageFor(mode: ChartMode): string {
	if (mode === "natal") return `${chartNatalUsage}\n\n${FLAG_REFERENCE}`;
	if (mode === "draconic") return `${chartDraconicUsage}\n\n${FLAG_REFERENCE}`;
	return chartUsage;
}

function applyMode(request: NatalRequest, mode: ChartMode): NatalRequest {
	const options = { ...request.options };
	if (mode === "natal") {
		options.evolutionary = false;
	} else if (mode === "draconic") {
		options.draconic = true;
		options.evolutionary = true;
	} else {
		options.evolutionary = true;
	}
	return { ...request, options };
}

async function resolveRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth or chart flags",
				"VALIDATION_ERROR",
				["Use `lumen chart --profile <id>` or inline flags, not both"],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(rest);
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen chart --help` for chart options",
		]);
	}
	return result.request;
}

export const chartCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const first = args[0];

	if (args.includes("--help")) {
		const mode =
			first !== undefined && CHART_MODES.has(first)
				? (first as ChartMode)
				: "evolutionary";
		return usageFor(mode);
	}

	let mode: ChartMode = "evolutionary";
	let rest = args;
	if (first !== undefined && CHART_MODES.has(first)) {
		mode = first as ChartMode;
		rest = args.slice(1);
	} else if (first !== undefined && first !== "-" && first.startsWith("-")) {
		// Flags without a subcommand are the default evolutionary reading.
	} else if (first !== undefined) {
		throw new AxiError(`Unknown chart command: ${first}`, "VALIDATION_ERROR", [
			"Run `lumen chart --help` for valid subcommands",
		]);
	}

	const request = applyMode(await resolveRequest(rest, context), mode);
	const engine = new AstrologicalEngine();
	return engine.compute(request);
};

// ============================================================================
// `lumen synastry` command (retrocompatible alias for `lumen classical synastry`)
// ============================================================================

import {
	computeSynastry,
	type SynastryContact,
	type SynastryOptions,
	type SynastryResult,
	toSynastryChart,
} from "../core/karma";

const SYNASTRY_FLAGS_HELP = [
	"Flags:",
	"  --focus   evolutionary (default) | classical | all",
	"  --orb     Orbe máximo en grados, 0-180 (default 3)",
	"  --limit   Contactos mostrados por defecto (default 12)",
	"  --full    Incluye overlays de casas y campos completos",
].join("\n");

export const synastryUsage = [
	"lumen synastry self --profile <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"lumen synastry pair --a <id> --b <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"self: compara la carta natal con la draconic de la misma persona.",
	"pair: compara las cartas de dos perfiles guardados.",
	"",
	SYNASTRY_FLAGS_HELP,
].join("\n");

export const synastrySelfUsage = [
	"lumen synastry self --profile <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"Compara la carta natal con la proyección draconic de la misma persona.",
	"También acepta flags de nacimiento inline en lugar de --profile.",
	"",
	SYNASTRY_FLAGS_HELP,
].join("\n");

export const synastryPairUsage = [
	"lumen synastry pair --a <id> --b <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"Compara las cartas de dos perfiles guardados.",
	"",
	"  --a, --b   Perfiles guardados con `lumen profile add`",
	SYNASTRY_FLAGS_HELP,
].join("\n");

const VALID_FOCUS = new Set<NonNullable<SynastryOptions["focus"]>>([
	"evolutionary",
	"classical",
	"all",
]);

interface SynastryFlags {
	orb: number;
	focus: NonNullable<SynastryOptions["focus"]>;
	limit: number;
	full: boolean;
}

function parseOrb(raw: string): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0 || value > 180) {
		throw new AxiError(
			"Flag --orb expects a positive number of degrees (max 180)",
			"VALIDATION_ERROR",
			["Example: --orb 3"],
		);
	}
	return value;
}

function parseLimit(raw: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new AxiError(
			"Flag --limit expects a positive integer",
			"VALIDATION_ERROR",
			["Example: --limit 12"],
		);
	}
	return value;
}

function parseFocus(raw: string): NonNullable<SynastryOptions["focus"]> {
	if (!VALID_FOCUS.has(raw as NonNullable<SynastryOptions["focus"]>)) {
		throw new AxiError(`Invalid focus: ${raw}`, "VALIDATION_ERROR", [
			"Valid focus values: evolutionary, classical, all",
		]);
	}
	return raw as NonNullable<SynastryOptions["focus"]>;
}

function takeFlagValue(
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

function parseOptionalValue(arg: string, name: string): string | undefined {
	if (!arg.startsWith(`--${name}=`)) return undefined;
	const value = arg.slice(name.length + 3);
	if (value === "") {
		throw new AxiError(`Flag --${name} requires a value`, "VALIDATION_ERROR", [
			`Example: --${name} <value>`,
		]);
	}
	return value;
}

function extractSelfFlags(args: string[]): {
	chartArgs: string[];
	flags: SynastryFlags;
} {
	const chartArgs: string[] = [];
	let orb = 3;
	let focus: NonNullable<SynastryOptions["focus"]> = "evolutionary";
	let limit = 12;
	let full = false;
	const seen = new Set<string>();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		const inlineOrb = parseOptionalValue(arg, "orb");
		if (arg === "--orb" || inlineOrb !== undefined) {
			assertOnce(seen, "--orb");
			if (arg === "--orb") {
				const taken = takeFlagValue(args, i, "orb");
				orb = parseOrb(taken.value);
				i = taken.next;
			} else {
				orb = parseOrb(inlineOrb as string);
			}
			continue;
		}

		const inlineFocus = parseOptionalValue(arg, "focus");
		if (arg === "--focus" || inlineFocus !== undefined) {
			assertOnce(seen, "--focus");
			if (arg === "--focus") {
				const taken = takeFlagValue(args, i, "focus");
				focus = parseFocus(taken.value);
				i = taken.next;
			} else {
				focus = parseFocus(inlineFocus as string);
			}
			continue;
		}

		const inlineLimit = parseOptionalValue(arg, "limit");
		if (arg === "--limit" || inlineLimit !== undefined) {
			assertOnce(seen, "--limit");
			if (arg === "--limit") {
				const taken = takeFlagValue(args, i, "limit");
				limit = parseLimit(taken.value);
				i = taken.next;
			} else {
				limit = parseLimit(inlineLimit as string);
			}
			continue;
		}

		if (arg === "--full") {
			assertOnce(seen, "--full");
			full = true;
			continue;
		}

		chartArgs.push(arg);
	}

	return { chartArgs, flags: { orb, focus, limit, full } };
}

function parsePairFlags(args: string[]): {
	a: string | undefined;
	b: string | undefined;
	flags: SynastryFlags;
} {
	let a: string | undefined;
	let b: string | undefined;
	let orb = 3;
	let focus: NonNullable<SynastryOptions["focus"]> = "evolutionary";
	let limit = 12;
	let full = false;
	const seen = new Set<string>();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		const inlineA = parseOptionalValue(arg, "a");
		if (arg === "--a" || inlineA !== undefined) {
			assertOnce(seen, "--a");
			a =
				arg === "--a" ? takeFlagValue(args, i, "a").value : (inlineA as string);
			if (arg === "--a") i++;
			continue;
		}

		const inlineB = parseOptionalValue(arg, "b");
		if (arg === "--b" || inlineB !== undefined) {
			assertOnce(seen, "--b");
			b =
				arg === "--b" ? takeFlagValue(args, i, "b").value : (inlineB as string);
			if (arg === "--b") i++;
			continue;
		}

		const inlineOrb = parseOptionalValue(arg, "orb");
		if (arg === "--orb" || inlineOrb !== undefined) {
			assertOnce(seen, "--orb");
			orb =
				arg === "--orb"
					? parseOrb(takeFlagValue(args, i, "orb").value)
					: parseOrb(inlineOrb as string);
			if (arg === "--orb") i++;
			continue;
		}

		const inlineFocus = parseOptionalValue(arg, "focus");
		if (arg === "--focus" || inlineFocus !== undefined) {
			assertOnce(seen, "--focus");
			focus =
				arg === "--focus"
					? parseFocus(takeFlagValue(args, i, "focus").value)
					: parseFocus(inlineFocus as string);
			if (arg === "--focus") i++;
			continue;
		}

		const inlineLimit = parseOptionalValue(arg, "limit");
		if (arg === "--limit" || inlineLimit !== undefined) {
			assertOnce(seen, "--limit");
			limit =
				arg === "--limit"
					? parseLimit(takeFlagValue(args, i, "limit").value)
					: parseLimit(inlineLimit as string);
			if (arg === "--limit") i++;
			continue;
		}

		if (arg === "--full") {
			assertOnce(seen, "--full");
			full = true;
			continue;
		}

		if (arg.startsWith("-")) {
			throw new AxiError(
				`Unknown flag --${arg.startsWith("--") ? arg.slice(2) : arg.slice(1)} for \`synastry pair\``,
				"VALIDATION_ERROR",
				[
					"Valid flags: --a, --b, --focus, --orb, --limit, --full",
					"Run `lumen synastry pair --help`",
				],
			);
		}
		throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
			"Run `lumen synastry pair --help`",
		]);
	}

	return { a, b, flags: { orb, focus, limit, full } };
}

type ProjectedContact =
	| SynastryContact
	| {
			a: string;
			b: string;
			aspect: string;
			orb: number;
	  };

function renderContacts(
	result: SynastryResult,
	flags: SynastryFlags,
	command: "self" | "pair",
): { contacts: ProjectedContact[] | string; help?: string[] } {
	if (result.contacts.length === 0) {
		return {
			contacts: `0 contacts found within orb ${flags.orb}`,
		};
	}

	const limited = result.contacts.slice(0, flags.limit);
	const projected = limited.map((contact) =>
		flags.full
			? contact
			: {
					a: contact.a,
					b: contact.b,
					aspect: contact.aspect,
					orb: contact.orb,
				},
	);

	const help: string[] = [];
	const base =
		command === "self"
			? "lumen synastry self --profile <id>"
			: "lumen synastry pair --a <id> --b <id>";
	if (result.contacts.length > flags.limit) {
		help.push(
			`Run \`${base} ${flags.full ? "" : "--full "}--limit ${result.contacts.length}\` for all ${result.contacts.length} contacts`,
		);
	}
	if (!flags.full) {
		help.push(`Run \`${base} --full\` for overlays and full contact fields`);
	}

	return { contacts: projected, ...(help.length > 0 ? { help } : {}) };
}

async function resolveSelfRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth or chart flags",
				"VALIDATION_ERROR",
				["Use `lumen synastry self --profile <id>` or inline flags, not both"],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(rest, undefined, "synastry self");
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen synastry self --help`",
		]);
	}
	return result.request;
}

export const synastryCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") {
		return synastryUsage;
	}

	if (sub === "self") {
		if (rest.includes("--help")) return synastrySelfUsage;
		const { chartArgs, flags } = extractSelfFlags(rest);
		const request = await resolveSelfRequest(chartArgs, context);
		const engine = new AstrologicalEngine();
		const natal = engine.chartFor(request);
		const draconic = toDraconicChart(natal, request.options.node);
		const result = computeSynastry(
			toSynastryChart("natal", natal, request.options.node),
			toSynastryChart("draconic", draconic, request.options.node),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "self");
		const help = [
			"lumen synastry self (natal vs draconic) is an experimental extension and is not part of Jeffrey Wolf Green synastry doctrine.",
			...(rendered.help ?? []),
		];
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				contacts: rendered.contacts,
				...(flags.full ? { overlays: result.overlays } : {}),
				help,
			},
		};
	}

	if (sub === "pair") {
		if (rest.includes("--help")) return synastryPairUsage;
		const { a, b, flags } = parsePairFlags(rest);
		if (a === undefined || b === undefined) {
			throw new AxiError(
				"synastry pair requires --a and --b",
				"VALIDATION_ERROR",
				["Run `lumen synastry pair --a <id> --b <id>`"],
			);
		}
		const requestA = requestFromProfile(context, a);
		const requestB = requestFromProfile(context, b);
		const engine = new AstrologicalEngine();
		const chartA = engine.chartFor(requestA);
		const chartB = engine.chartFor(requestB);
		const result = computeSynastry(
			toSynastryChart(a, chartA, requestA.options.node),
			toSynastryChart(b, chartB, requestB.options.node),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "pair");
		const help = [
			"Jeffrey Wolf Green synastry reads Pluto-to-Pluto, Pluto-to-node, nodal ruler and house overlay evidence; the evolutionary condition of each person is required for a definitive reading.",
			...(rendered.help ?? []),
		];
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				contacts: rendered.contacts,
				...(flags.full ? { overlays: result.overlays } : {}),
				help,
			},
		};
	}

	throw new AxiError(`Unknown synastry command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen synastry --help` for valid subcommands",
	]);
};
