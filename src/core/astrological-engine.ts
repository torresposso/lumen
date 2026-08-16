import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import { projectPoint, roundPrecision as round } from "./celestial-coordinates";
import {
	type AspectPattern,
	type ChartSignature,
	computeChartSignature,
	computeDeclinationAspects,
	type DeclinationAspectProjection,
	detectAspectPatterns,
} from "./chart-patterns";
import {
	computeFixedStarMatches,
	computeHermeticLots,
	type FixedStarMatch,
	type LotsResult,
} from "./classical-extensions";
import { type DraconicChart, toDraconicChart } from "./draconic-zodiac";
import { CaelusEphemeris, type Ephemeris } from "./ephemeris-gateway";
import {
	computeEvolutionaryReading,
	type EvolutionaryResult,
} from "./evolutionary-astrology";
import { generateFactAtoms, type InterpretationContext } from "./fact-atoms";
import {
	computePrenatalEclipses,
	type EclipseInfo,
	type EclipsesResult,
} from "./prenatal-eclipses";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest,
	ResolvedBirth,
} from "./types";

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
	chartFor(request: NatalRequest): Chart {
		const { birth, options } = request;
		return this.ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, {
			houseSystem: options.houseSystem,
			zodiac: options.zodiac,
			bodies: options.bodies,
			topocentric: options.topocentric,
		});
	}

	compute(request: NatalRequest): AstrologicalReading {
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
