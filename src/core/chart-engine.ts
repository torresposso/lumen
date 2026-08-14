import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest,
	ResolvedBirth,
} from "../cli/intake";
import { type DraconicChart, toDraconicChart } from "./draconic";
import { CaelusEphemeris, type Ephemeris } from "./ephemeris";
import {
	computeEvolutionaryReading,
	type EvolutionaryResult,
} from "./evolutionary";
import {
	applyExtensions,
	type EclipseInfo,
	type EclipsesResult,
	type FixedStarMatch,
	type LotsResult,
} from "./extensions";
import { projectPoint, roundPrecision as round } from "./zodiac";

export type {
	DraconicChart,
	EclipseInfo,
	EclipsesResult,
	FixedStarMatch,
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
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicProjection;
}

export interface DraconicProjection {
	nodeUsed: "true_node" | "mean_node";
	bodies: Partial<Record<string, ChartBody>>;
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
	help?: string[];
};

export type LumenChart = import("caelus").Chart & {
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicChart;
};

/** Node ids to drop from the chart per `--node` selection. The engine always
 *  computes both nodes; this module owns the selection policy so the chart
 *  that leaves the seam is already final. */
const DROPPED_BY_NODE: Record<NatalRequest["options"]["node"], string[]> = {
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
		bodies: projectBodies(draconic.bodies),
		angles: projectAngles(draconic.angles),
		cusps: draconic.cusps.map((c) => renderLon(c)),
	};
}

function project(chart: LumenChart): Projection {
	const bodies = projectBodies(chart.bodies);

	const aspects = chart.aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: round(a.orb),
		phase: a.phase,
		strength: round(a.strength, 3),
	}));

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
		...(chart.eclipses ? { eclipses: chart.eclipses } : {}),
		...(chart.lots ? { lots: chart.lots } : {}),
		...(chart.stars ? { stars: chart.stars } : {}),
		...(chart.evolutionary ? { evolutionary: chart.evolutionary } : {}),
		...(chart.draconic ? { draconic: projectDraconic(chart.draconic) } : {}),
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

function analyzeChart(
	chart: LumenChart,
	request: NatalRequest,
	ephemeris: Ephemeris,
): LumenChart {
	const { birth, options } = request;
	const result = applyExtensions(ephemeris, chart, birth, options);

	if (options.evolutionary) {
		result.evolutionary = computeEvolutionaryReading(result);
	}

	if (options.draconic) {
		result.draconic = toDraconicChart(result, options.node);
	}

	for (const dropped of DROPPED_BY_NODE[options.node]) {
		delete result.bodies[dropped];
	}

	return result;
}

export class AstrologicalEngine {
	private ephemeris: Ephemeris;

	constructor(ephemeris?: Ephemeris) {
		this.ephemeris = ephemeris ?? new CaelusEphemeris();
	}

	compute(request: NatalRequest): AstrologicalReading {
		const { birth, options } = request;
		const rawChart: LumenChart = this.ephemeris.chartAt(
			birth.jdUt,
			birth.lat,
			birth.lon,
			{
				houseSystem: options.houseSystem,
				zodiac: options.zodiac,
				bodies: options.bodies,
				topocentric: options.topocentric,
			},
		);

		const analyzedChart = analyzeChart(rawChart, request, this.ephemeris);
		const projected = project(analyzedChart);

		const help: string[] = [];
		if (analyzedChart.houseSystem !== analyzedChart.houseSystemRequested) {
			help.push(
				`House system "${analyzedChart.houseSystemRequested}" fell back to "${analyzedChart.houseSystem}" (undefined above the polar circle)`,
			);
		}
		if (analyzedChart.unavailable.length > 0) {
			help.push(
				`Bodies omitted (outside fitted ephemeris range): ${analyzedChart.unavailable.join(", ")}`,
			);
		}
		if (request.birth.status !== "ok") {
			help.push(
				`Timezone resolution provenance status: ${request.birth.status}`,
			);
		}

		const aspects = projected.aspects;
		return {
			chart: { ...projected, birth: echoBirth(request.birth, request.options) },
			summary: {
				bodies: Object.keys(projected.bodies).length,
				aspects: aspects.length,
				applying: aspects.filter((a) => a.phase === "applying").length,
				separating: aspects.filter((a) => a.phase === "separating").length,
				exact: aspects.filter((a) => a.phase === "exact").length,
			},
			...(help.length > 0 ? { help } : {}),
		};
	}
}
