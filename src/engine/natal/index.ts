import type { BodyId, Chart, Position } from "caelus";
import { lotFortune, lotSpirit } from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import { toonProfile } from "../../domain/toon";
import {
	angularDistanceDirect,
	projectPoint,
	roundPrecision,
} from "../shared/geometry";
import { SIGN_RULERS } from "../shared/rulers";
import { computePrenatalEclipses } from "./eclipses";
import { computeNodalAxisFact } from "./nodal";
import {
	calculateAstrologicalSignature,
	detectAspectPatterns,
} from "./patterns";
import { computePlutoPolarityFact } from "./pluto-polarity";
import type {
	AngleProjection,
	AspectProjection,
	ChartBodyProjection,
	CuspProjection,
	DeclinationAspectProjection,
	EclipticGeometryProjection,
	HouseRulerRow,
	NatalChartOutput,
	SoulLotsProjection,
} from "./types";

export type { NatalChartOutput, SoulLotsProjection } from "./types";

const DEFAULT_BODIES: BodyId[] = [
	"sun",
	"moon",
	"mercury",
	"venus",
	"mars",
	"jupiter",
	"saturn",
	"uranus",
	"neptune",
	"pluto",
	"chiron",
	"true_node",
	"true_lilith",
];

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

const PHASES: readonly { name: SolLunaPhaseName; max: number }[] = [
	{ name: "New", max: 45 },
	{ name: "Crescent", max: 90 },
	{ name: "First Quarter", max: 135 },
	{ name: "Gibbous", max: 180 },
	{ name: "Full", max: 225 },
	{ name: "Disseminating", max: 270 },
	{ name: "Last Quarter", max: 315 },
	{ name: "Balsamic", max: 360 },
];

function computeSolLunaPhase(sunLon: number, moonLon: number): string {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];
	return phase ? phase.name : "Balsamic";
}

export function computeSoulLots(
	rawChart: Chart,
	cusps: number[],
): SoulLotsProjection {
	const asc = typeof rawChart.angles.asc === "number" ? rawChart.angles.asc : rawChart.angles.asc.lon;
	const sun = rawChart.bodies.sun?.lon ?? 0;
	const moon = rawChart.bodies.moon?.lon ?? 0;
	const sunHouse = rawChart.bodies.sun?.house;
	// Diurnal when Sun is in upper hemisphere (houses 7, 8, 9, 10, 11, 12)
	const isDay = sunHouse !== undefined ? sunHouse >= 7 && sunHouse <= 12 : true;

	const fortuneLon = lotFortune(asc, sun, moon, isDay);
	const spiritLon = lotSpirit(asc, sun, moon, isDay);

	return {
		fortune: projectPoint(fortuneLon, cusps, 4),
		spirit: projectPoint(spiritLon, cusps, 4),
		isDay,
	};
}

function projectBodies(
	rawBodies: Chart["bodies"],
	cusps: number[],
	jdUt?: number,
	ephemeris?: Ephemeris,
): Record<string, ChartBodyProjection> {
	const result: Record<string, ChartBodyProjection> = {};

	for (const [id, body] of Object.entries(rawBodies)) {
		if (!body) continue;
		const point = projectPoint(body.lon, cusps, 4);
		const oob =
			ephemeris && jdUt !== undefined
				? ephemeris.outOfBounds(id as BodyId, jdUt)
				: Math.abs(body.dec) > 23.44;
		result[id] = {
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			lat: roundPrecision(body.lat, 4),
			dist: body.dist !== null ? roundPrecision(body.dist, 4) : null,
			ra: roundPrecision(body.ra, 4),
			dec: roundPrecision(body.dec, 4),
			outOfBounds: oob,
			dignities: body.dignities ?? [],
		};
	}

	return result;
}

function angleLon(val: number | { lon: number }): number {
	return typeof val === "number" ? val : val.lon;
}

function projectAngles(angles: Chart["angles"]): {
	asc: AngleProjection;
	mc: AngleProjection;
	vertex: AngleProjection;
	eastPoint: AngleProjection;
} {
	const project = (val: number | { lon: number }): AngleProjection => {
		const pt = projectPoint(angleLon(val));
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	};

	return {
		asc: project(angles.asc),
		mc: project(angles.mc),
		vertex: project(angles.vertex),
		eastPoint: project(angles.eastPoint),
	};
}

function projectCusps(rawCusps: number[]): CuspProjection[] {
	return rawCusps.map((cuspLon) => {
		const pt = projectPoint(cuspLon);
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	});
}

function computeHouseRulers(cusps: CuspProjection[]): HouseRulerRow[] {
	return cusps.map((c, idx) => ({
		house: idx + 1,
		sign: c.sign,
		ruler: SIGN_RULERS[c.sign] ?? "unknown",
	}));
}

function computeAspects(
	rawBodies: Chart["bodies"],
	ephemeris: Ephemeris = new CaelusEphemeris(),
): AspectProjection[] {
	const bodyMap: Record<string, Position> = {};
	for (const [id, body] of Object.entries(rawBodies)) {
		if (body && id !== "mean_node") {
			bodyMap[id] = body;
		}
	}

	const orbs: Record<string, number> = {
		conjunction: 8,
		sextile: 6,
		square: 7,
		trine: 8,
		opposition: 8,
	};

	const aspects = ephemeris.aspects(bodyMap, orbs);
	return aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: roundPrecision(a.orb, 2),
		phase: a.phase,
		strength: roundPrecision(a.strength, 3),
	}));
}

export function projectEclipticGeometry(
	rawChart: Chart,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): EclipticGeometryProjection {
	const cusps = projectCusps(rawChart.cusps);
	const bodies = projectBodies(
		rawChart.bodies,
		rawChart.cusps,
		rawChart.jdUt,
		ephemeris,
	);
	const angles = projectAngles(rawChart.angles);
	const aspects = computeAspects(rawChart.bodies, ephemeris);

	let declinationAspects: DeclinationAspectProjection[] = [];
	if (ephemeris) {
		const activeBodies = Object.keys(rawChart.bodies).filter(
			(id) => rawChart.bodies[id] !== undefined,
		);
		const declPairs = ephemeris.declinationAspects(
			activeBodies,
			rawChart.jdUt,
			1.2,
		);
		declinationAspects = declPairs
			.filter((p) => p.kind !== null)
			.map((p) => {
				const decA = rawChart.bodies[p.a]?.dec ?? 0;
				const decB = rawChart.bodies[p.b]?.dec ?? 0;
				const orb =
					p.kind === "parallel"
						? Math.abs(decA - decB)
						: Math.abs(Math.abs(decA) - Math.abs(decB));
				return {
					a: p.a,
					b: p.b,
					aspect: p.kind as string,
					orb: roundPrecision(orb, 4),
				};
			});
	}

	const houseRulers = computeHouseRulers(cusps);
	const sun = rawChart.bodies.sun;
	const moon = rawChart.bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon) : undefined;

	return {
		bodies,
		angles,
		cusps,
		aspects,
		declinationAspects,
		houseRulers,
		phase,
	};
}

function computeRawChart(
	jdUt: number,
	lat: number,
	lon: number,
	ephemeris: Ephemeris,
): Chart {
	const raw = ephemeris.chartAt(jdUt, lat, lon, {
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: DEFAULT_BODIES,
		topocentric: true,
	});

	const bodies = Object.fromEntries(
		Object.entries(raw.bodies).filter(([id]) => id !== "mean_node"),
	) as Chart["bodies"];

	if (!bodies.pluto || !bodies.true_node) {
		throw new Error(
			"Ephemeris calculation failed: natal chart must carry pluto and true_node",
		);
	}

	return { ...raw, bodies };
}

function describeEvoCriteria(): string {
	return "JWGEA canon; orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8° square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx, 2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped: squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the north node (orb 3°)";
}

function computeMeasurements(profile: Profile, ephemeris: Ephemeris) {
	const rawChart = computeRawChart(
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		ephemeris,
	);

	const geom = projectEclipticGeometry(rawChart, ephemeris);

	return {
		rawChart,
		...geom,
	};
}

function synthesizeEvolutionaryCanon(
	profile: Profile,
	measurements: ReturnType<typeof computeMeasurements>,
	ephemeris: Ephemeris,
) {
	const { rawChart, bodies } = measurements;
	const northNodeLon = rawChart.bodies.true_node?.lon;
	const soul = computePlutoPolarityFact(bodies, rawChart.cusps, northNodeLon);
	const nodal = computeNodalAxisFact(bodies, rawChart.cusps);
	const prenatalEclipses = computePrenatalEclipses(
		ephemeris,
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		rawChart.cusps,
	);
	const lots = computeSoulLots(rawChart, rawChart.cusps);
	const patterns = detectAspectPatterns(rawChart);
	const signature = calculateAstrologicalSignature(rawChart);

	const counts = {
		plutoAspects: soul.pluto.aspects.length,
		nodeAspects:
			nodal.nodalAxis.north.aspects.length +
			nodal.nodalAxis.south.aspects.length,
		skippedSteps: nodal.nodalAxis.skippedSteps.length,
		eclipses:
			(prenatalEclipses.solar ? 1 : 0) + (prenatalEclipses.lunar ? 1 : 0),
	};

	return {
		pluto: soul.pluto,
		ppp: soul.ppp,
		midpoint: soul.midpoint,
		antiMidpoint: soul.antiMidpoint,
		nodalAxis: nodal.nodalAxis,
		dispositorChains: {
			pluto: soul.dispositorChain,
			southNodeRuler: nodal.dispositorChains.southNodeRuler,
			northNodeRuler: nodal.dispositorChains.northNodeRuler,
		},
		prenatalEclipses,
		lots,
		patterns,
		signature,
		counts,
		method: describeEvoCriteria(),
	};
}

/**
 * Computes exact natal chart geometry and evolutionary mechanics as a pure function
 * over a stored Profile (ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0015).
 */
export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): NatalChartOutput {
	const measurements = computeMeasurements(profile, ephemeris);
	const evo = synthesizeEvolutionaryCanon(profile, measurements, ephemeris);

	return {
		birth: toonProfile(profile),
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: measurements.bodies,
		angles: measurements.angles,
		cusps: measurements.cusps,
		aspects: measurements.aspects,
		...(measurements.declinationAspects.length > 0
			? { declinationAspects: measurements.declinationAspects }
			: {}),
		pluto: evo.pluto,
		ppp: evo.ppp,
		...(evo.midpoint ? { midpoint: evo.midpoint } : {}),
		...(evo.antiMidpoint ? { antiMidpoint: evo.antiMidpoint } : {}),
		nodalAxis: evo.nodalAxis,
		...(measurements.phase ? { phase: measurements.phase } : {}),
		dispositorChains: {
			pluto: evo.dispositorChains.pluto,
			...(evo.dispositorChains.southNodeRuler
				? { southNodeRuler: evo.dispositorChains.southNodeRuler }
				: {}),
			...(evo.dispositorChains.northNodeRuler
				? { northNodeRuler: evo.dispositorChains.northNodeRuler }
				: {}),
		},
		prenatalEclipses: evo.prenatalEclipses,
		lots: evo.lots,
		patterns: evo.patterns,
		signature: evo.signature,
		houseRulers: measurements.houseRulers,
		counts: evo.counts,
		method: evo.method,
	};
}
