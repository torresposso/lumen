import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import { SIGNS } from "caelus";
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
}

export interface BirthEcho {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
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

export function project(chart: Chart): Projection {
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
	};
}

export function echoBirth(
	birth: ResolvedBirth,
	options: ChartRequestOptions,
): BirthEcho {
	return {
		year: birth.local.year,
		month: birth.local.month,
		day: birth.local.day,
		hour: birth.local.hour,
		minute: birth.local.minute,
		second: birth.local.second,
		lat: birth.lat,
		lon: birth.lon,
		zone: birth.zone,
		offsetMinutes: birth.offsetMinutes,
		dst: birth.dst,
		status: birth.status,
		requested: { ...options },
	};
}

export function renderChart(chart: Chart, request: NatalRequest): ChartOutput {
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

export { renderChart as formatChart };

function signOf(lon: number): string {
	const sign = SIGNS[Math.floor(lon / 30) % 12];
	if (sign === undefined) {
		throw new Error("unreachable: sign index out of range");
	}
	return sign;
}

function round(value: number, digits = 4): number {
	return Number(value.toFixed(digits));
}

function renderLon(lon: number): LonProjection {
	return { lon: round(lon), sign: signOf(lon), signDeg: round(lon % 30) };
}
