import type { AspectPhase, ChartBody, HouseSystem, Zodiac } from "caelus";
import type {
	EclipsesResult,
	FixedStarMatch,
	LotsResult,
	LumenChart,
} from "../core/chart-engine";
import type { EvolutionaryResult } from "../core/evolutionary";
import { normalizeLongitude, signOf } from "../core/zodiac";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest,
	ResolvedBirth,
} from "./intake";

export interface LonProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: AspectPhase;
	strength: number;
}

export interface BodyProjection {
	id: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	lat: number;
	dist: number | null;
	ra: number;
	dec: number;
	dignities: string[];
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

export type ChartOutput = {
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

function round(value: number, digits = 4): number {
	return Number(value.toFixed(digits));
}

function renderLon(input: number | { lon: number }): LonProjection {
	const rawLon = typeof input === "number" ? input : input.lon;
	const lon = normalizeLongitude(rawLon);
	let signDeg = round(lon % 30);
	let sign = signOf(lon);
	if (signDeg >= 30) {
		signDeg = 0;
		sign = signOf((lon + 30) % 360);
	}
	return { lon: round(lon), sign, signDeg };
}

function project(chart: LumenChart): Projection {
	const bodies: Partial<Record<string, ChartBody>> = {};
	for (const [id, body] of Object.entries(chart.bodies)) {
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
		angles: {
			asc: renderLon(chart.angles.asc),
			mc: renderLon(chart.angles.mc),
			vertex: renderLon(chart.angles.vertex),
			eastPoint: renderLon(chart.angles.eastPoint),
		},
		cusps: chart.cusps.map((c) => renderLon(c)),
		aspects,
		...(chart.eclipses ? { eclipses: chart.eclipses } : {}),
		...(chart.lots ? { lots: chart.lots } : {}),
		...(chart.stars ? { stars: chart.stars } : {}),
		...(chart.evolutionary ? { evolutionary: chart.evolutionary } : {}),
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

/** Deep output module: encapsulates JSON projection, precision rounding,
 *  birth parameter echoing, and diagnostic message formatting. */
export function formatChart(
	chart: LumenChart,
	request: NatalRequest,
): ChartOutput {
	const projected = project(chart);

	const help: string[] = [];
	if (chart.houseSystem !== chart.houseSystemRequested) {
		help.push(
			`House system "${chart.houseSystemRequested}" fell back to "${chart.houseSystem}" (undefined above the polar circle)`,
		);
	}
	if (chart.unavailable.length > 0) {
		help.push(
			`Bodies omitted (outside fitted ephemeris range): ${chart.unavailable.join(", ")}`,
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
