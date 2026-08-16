import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./intake";

export const chartUsage = [
	"lumen chart natal <profile> | lumen chart draconic <profile>",
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Carta natal (insumo base) y proyección draconic (experimento etiquetado).",
	"La lectura evolutiva vive en `lumen soul <profile>`.",
].join("\n");

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
	type DeclinationAspectProjection,
	type DraconicChart,
	detectAspectPatterns,
	generateFactAtoms,
	type InterpretationContext,
	toDraconicChart,
} from "../core/classical";
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
	InterpretationContext,
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
	draconic?: DraconicChart;
}

function project(input: ProjectionInput): Projection {
	const { chart, bodies: rawBodies, draconic } = input;
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

	/** Computes the raw caelus chart for a validated request. */
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
		const { options } = request;
		const rawChart: Chart = this.chartFor(request);

		const draconic = options.draconic
			? toDraconicChart(rawChart, options.node)
			: undefined;

		const natalBodies = { ...rawChart.bodies };
		for (const dropped of DROPPED_BY_NODE[options.node]) {
			delete natalBodies[dropped];
		}

		const projected = project({
			chart: rawChart,
			bodies: natalBodies,
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
// Chart engine commands backing `lumen chart natal|draconic`
// ============================================================================

import {
	NatalIntake,
	type NatalRequest,
	requestFromProfile,
	takeProfileArg,
} from "./intake";

const FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const chartNatalUsage = [
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal base (efemérides caelus) sin lectura evolutiva.",
	"Usa `lumen soul <profile>` para la lectura evolutiva completa.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal y su proyección draconic (experimento etiquetado,",
	"fuera del canon; sin lectura evolutiva).",
].join("\n");

type ChartMode = "natal" | "draconic";

const CHART_MODES = new Set(["natal", "draconic"]);

function usageFor(mode: ChartMode): string {
	if (mode === "natal") return `${chartNatalUsage}\n\n${FLAG_REFERENCE}`;
	return `${chartDraconicUsage}\n\n${FLAG_REFERENCE}`;
}

function applyMode(request: NatalRequest, mode: ChartMode): NatalRequest {
	return {
		...request,
		options: { ...request.options, draconic: mode === "draconic" },
	};
}

async function resolveRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const first = args[0];
	if (first !== undefined && !first.startsWith("-")) {
		const rest = args.slice(1);
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine positional profile id with extra flags",
				"VALIDATION_ERROR",
				[`Use \`lumen chart natal ${first}\` or inline birth flags`],
			);
		}
		return requestFromProfile(context, first);
	}

	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth flags",
				"VALIDATION_ERROR",
				[`Use \`lumen chart natal ${name}\` or inline birth flags`],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(rest);
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen chart natal --help` for chart options",
		]);
	}
	return result.request;
}

export const chartCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const first = args[0];

	if (
		first !== undefined &&
		!first.startsWith("-") &&
		!CHART_MODES.has(first)
	) {
		throw new AxiError(`Unknown chart command: ${first}`, "VALIDATION_ERROR", [
			"Run `lumen chart --help` for valid subcommands",
		]);
	}

	if (first === undefined || args.includes("--help")) {
		const mode =
			first !== undefined && CHART_MODES.has(first)
				? (first as ChartMode)
				: undefined;
		return mode === undefined ? chartUsage : usageFor(mode);
	}

	if (first.startsWith("-")) {
		throw new AxiError(
			"chart requires a subcommand: natal | draconic",
			"VALIDATION_ERROR",
			["Run `lumen chart --help` for usage"],
		);
	}

	const mode = first as ChartMode;
	const request = applyMode(await resolveRequest(args.slice(1), context), mode);
	const engine = new AstrologicalEngine();
	return engine.compute(request);
};
