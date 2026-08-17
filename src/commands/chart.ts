import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./intake";

export const chartUsage = [
	"lumen chart natal <profile> | lumen chart draconic <profile>",
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Carta natal (insumo base) y proyección draconic (experimento etiquetado).",
	"Con --evo: agrega la mecánica evolutiva (Plutón/PPP + eje nodal) a la natal.",
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
import {
	computeNodalReading,
	computePrenatalEclipses,
	type EclipsesResult,
	type NodeAspect,
	type SkippedStep,
} from "../core/nodes";
import { computeSolLunaPhase } from "../core/phases";
import {
	computeSoulReading,
	type DispositorStep,
	type PlutoAspect,
	type PPPAspect,
} from "../core/soul";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest as EngineNatalRequest,
	NodeMotionStatus,
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

export interface ChartOutputSelection {
	evo: boolean;
}

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
	evo?: EvoOutput;
	interpretationContext?: InterpretationContext;
	help?: string[];
};

export interface EvoNodalPoint {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	ruler?: string;
	rulerPlacement?: {
		body: string;
		sign: string;
		signDeg: number;
		house: number;
		motion: NodeMotionStatus;
	};
	aspects: NodeAspect[];
}

export interface EvoNodalAxis {
	north: EvoNodalPoint;
	south: EvoNodalPoint;
	motion: NodeMotionStatus;
	skippedSteps: SkippedStep[];
}

export interface EvoOutput {
	pluto: {
		sign: string;
		lon: number;
		house: number;
		signDeg: number;
		retrograde: boolean;
		stressfulCount: number;
		nonstressfulCount: number;
		aspects: PlutoAspect[];
	};
	ppp: {
		sign: string;
		lon: number;
		house: number;
		signDeg: number;
		active: boolean;
		aspects: PPPAspect[];
	};
	midpoint?: string;
	antiMidpoint?: string;
	nodalAxis: EvoNodalAxis;
	phase?: string;
	dispositorChains: {
		pluto: DispositorStep[];
		southNodeRuler?: DispositorStep[];
		northNodeRuler?: DispositorStep[];
	};
	prenatalEclipses: EclipsesResult;
}

/** Node ids to drop from the chart. The engine always computes both nodes;
 *  lumen is dedicated to the true node (North Node canon), so the mean node
 *  never leaves the seam. */
const DROPPED_NODE: readonly string[] = ["mean_node"];

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

	compute(
		request: EngineNatalRequest,
		selection: ChartOutputSelection = { evo: false },
	): AstrologicalReading {
		const { options } = request;
		const rawChart: Chart = this.chartFor(request);

		const draconic = options.draconic ? toDraconicChart(rawChart) : undefined;

		const natalBodies = { ...rawChart.bodies };
		for (const dropped of DROPPED_NODE) {
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
		const evo = selection.evo ? this.buildEvo(request, rawChart) : undefined;

		return {
			chart: { ...projected, birth: echoBirth(request.birth, request.options) },
			summary: {
				bodies: Object.keys(projected.bodies).length,
				aspects: aspects.length,
				applying: aspects.filter((a) => a.phase === "applying").length,
				separating: aspects.filter((a) => a.phase === "separating").length,
				exact: aspects.filter((a) => a.phase === "exact").length,
			},
			...(evo ? { evo } : {}),
			interpretationContext,
			...(help.length > 0 ? { help } : {}),
		};
	}

	private buildEvo(request: EngineNatalRequest, rawChart: Chart): EvoOutput {
		const bodies = rawChart.bodies;
		const cusps = rawChart.cusps;
		const soul = computeSoulReading(bodies, cusps, bodies.true_node?.lon);
		const nodal = computeNodalReading(bodies, cusps);
		if (!soul || !nodal) {
			throw new AxiError(
				"Could not compute evolutionary mechanics",
				"CALCULATION_ERROR",
				["Ensure --bodies includes pluto and true_node, or use default bodies"],
			);
		}
		const rulerPlacement = (
			input:
				| {
						body: string;
						sign: string;
						signDeg: number;
						house: number;
						motion: NodeMotionStatus;
				  }
				| undefined,
		) =>
			input
				? {
						body: input.body,
						sign: input.sign,
						signDeg: input.signDeg,
						house: input.house,
						motion: input.motion,
					}
				: undefined;

		const north = nodal.northNode;
		const south = nodal.southNode;
		const sun = bodies.sun;
		const moon = bodies.moon;
		const phase =
			sun && moon ? computeSolLunaPhase(sun.lon, moon.lon).name : undefined;

		return {
			pluto: {
				sign: soul.pluto.sign,
				lon: soul.pluto.lon,
				signDeg: soul.pluto.signDeg,
				house: soul.pluto.house,
				retrograde: soul.pluto.retrograde,
				stressfulCount: soul.pluto.stressfulAspects,
				nonstressfulCount: soul.pluto.nonstressfulAspects,
				aspects: soul.pluto.aspects,
			},
			ppp: {
				sign: soul.ppp.sign,
				lon: soul.ppp.lon,
				signDeg: soul.ppp.signDeg,
				house: soul.ppp.house,
				active: soul.ppp.active,
				aspects: soul.ppp.aspects,
			},
			midpoint: soul.plutoNorthNodeMidpoint?.formatted,
			antiMidpoint: soul.plutoNorthNodeAntiMidpoint?.formatted,
			nodalAxis: {
				north: {
					sign: north.sign,
					lon: north.lon,
					signDeg: north.signDeg,
					house: north.house,
					ruler: north.ruler,
					rulerPlacement: rulerPlacement(north.rulerPlacement),
					aspects: north.aspects,
				},
				south: {
					sign: south.sign,
					lon: south.lon,
					signDeg: south.signDeg,
					house: south.house,
					ruler: south.ruler,
					rulerPlacement: rulerPlacement(south.rulerPlacement),
					aspects: south.aspects,
				},
				motion: nodal.motionStatus,
				skippedSteps: nodal.skippedSteps,
			},
			phase,
			dispositorChains: {
				pluto: soul.dispositorChain,
				southNodeRuler: nodal.dispositorChains.southNodeRuler,
				northNodeRuler: nodal.dispositorChains.northNodeRuler,
			},
			prenatalEclipses: computePrenatalEclipses(
				this.ephemeris,
				request.birth,
				cusps,
				request.options.houseSystem,
				request.options.topocentric,
			),
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
	"Calcula la carta natal base (efemérides caelus).",
	"Con --evo agrega la mecánica evolutiva completa (Plutón/PPP, eje nodal, fase,",
	"cadenas y eclipses prenatales).",
	"Usa orbes PLUTO_ASPECTS; puede diferir de chart.aspects.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal y su proyección draconic (experimento etiquetado,",
	"fuera del canon; puramente geométrico, rechaza --evo).",
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

	const result = await NatalIntake.process(
		rest,
		undefined,
		"chart",
		context?.config,
	);
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen chart natal --help` for chart options",
		]);
	}
	return result.request;
}

function parseEvoFlag(args: string[]): { evo: boolean; rest: string[] } {
	let evo = false;
	const rest: string[] = [];
	for (const arg of args) {
		if (arg === "--evo") {
			evo = true;
			continue;
		}
		if (arg.startsWith("--evo=")) {
			const raw = arg.slice("--evo=".length).trim().toLowerCase();
			if (raw === "true") evo = true;
			else if (raw === "false") evo = false;
			else {
				throw new AxiError(
					"Flag --evo expects true or false",
					"VALIDATION_ERROR",
					["Example: --evo=true"],
				);
			}
			continue;
		}
		rest.push(arg);
	}
	return { evo, rest };
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
	const { evo, rest } = parseEvoFlag(args.slice(1));
	if (mode === "draconic" && evo) {
		throw new AxiError(
			"Chart draconic does not support --evo",
			"VALIDATION_ERROR",
			["Use `lumen chart natal --evo` for evolutionary mechanics"],
		);
	}
	const request = applyMode(await resolveRequest(rest, context), mode);
	const engine = new AstrologicalEngine();
	return engine.compute(request, { evo });
};
