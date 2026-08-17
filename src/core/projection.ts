import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import {
	type AspectPattern,
	type ChartSignature,
	computeChartSignature,
	computeDeclinationAspects,
	type DeclinationAspectProjection,
	type DraconicChart,
	detectAspectPatterns,
} from "./classical";
import { projectPoint, roundPrecision } from "./types";

// ============================================================================
// Chart projection (TOON surface)
//
// Deep module (ADR-0011): owns the mapping from a computed caelus chart (and
// its draconic re-projection) into the published `lon`/`sign`/`signDeg`/`house`
// shape used by `chart`, the `evo` block, and `journey progressed`, plus the
// rounding policy itself. Every published number crosses these helpers, so a
// precision decision is made in exactly one place. Pure data-in/data-out:
// no I/O, no AxiError.
// ============================================================================

// --- Precision policy (ADR-0011) -------------------------------------------

/** Coordinates (`lon`, `signDeg`, `lat`, `dist`, `ra`, `dec`) and `jdUt` at the TOON surface. */
export const TOON_LON_DIGITS = 4;
/** Planetary `speed` at the TOON surface (a derivative, so it keeps more digits). */
export const TOON_SPEED_DIGITS = 6;
/** Aspect `orb` at the TOON surface. */
export const TOON_ORB_DIGITS = 4;
/** Aspect `strength` at the TOON surface. */
export const TOON_STRENGTH_DIGITS = 3;
/** `evo.ppp.separation` (Pluto–North Node separation, degrees). */
export const TOON_SEPARATION_DIGITS = 2;

/** Rounds a published coordinate (`lon`, `signDeg`, `lat`, `dist`, `ra`, `dec`, `jdUt`). */
export function roundToon(val: number): number {
	return roundPrecision(val, TOON_LON_DIGITS);
}

/** Rounds a published planetary `speed`. */
export function roundSpeed(val: number): number {
	return roundPrecision(val, TOON_SPEED_DIGITS);
}

/** Rounds an aspect `orb`. */
export function roundOrb(val: number): number {
	return roundPrecision(val, TOON_ORB_DIGITS);
}

/** Rounds an aspect `strength`. */
export function roundStrength(val: number): number {
	return roundPrecision(val, TOON_STRENGTH_DIGITS);
}

/** Rounds `evo.ppp.separation` (Pluto–North Node separation, degrees). */
export function roundSeparation(val: number): number {
	return roundPrecision(val, TOON_SEPARATION_DIGITS);
}

// --- Published shapes -------------------------------------------------------

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

// --- Mapping ----------------------------------------------------------------

/** Maps a raw ecliptic longitude into the published `lon`/`sign`/`signDeg` shape.
 *  Reads `TOON_LON_DIGITS` so angles and cusps cross the same named policy as
 *  every body. */
function projectLon(rawLon: number): LonProjection {
	const { lon, sign, signDeg } = projectPoint(
		rawLon,
		undefined,
		TOON_LON_DIGITS,
	);
	return { lon, sign, signDeg };
}

function projectBodies(
	source: Chart["bodies"],
): Partial<Record<string, ChartBody>> {
	const bodies: Partial<Record<string, ChartBody>> = {};
	for (const [id, body] of Object.entries(source)) {
		if (body === undefined) continue;
		bodies[id] = {
			lon: roundToon(body.lon),
			sign: body.sign,
			signDeg: roundToon(body.signDeg),
			house: body.house,
			retrograde: body.retrograde,
			speed: roundSpeed(body.speed),
			lat: roundToon(body.lat),
			dist: body.dist === null ? null : roundToon(body.dist),
			ra: roundToon(body.ra),
			dec: roundToon(body.dec),
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
			lon: roundToon(body.lon),
			sign: body.sign,
			signDeg: roundToon(body.signDeg),
			house: body.house,
			retrograde: body.retrograde,
			speed: roundSpeed(body.speed),
			dignities: body.dignities,
		};
	}
	return bodies;
}

function projectAngles(angles: Chart["angles"]): Projection["angles"] {
	return {
		asc: projectLon(angles.asc),
		mc: projectLon(angles.mc),
		vertex: projectLon(angles.vertex),
		eastPoint: projectLon(angles.eastPoint),
	};
}

function projectDraconic(draconic: DraconicChart): DraconicProjection {
	return {
		nodeUsed: draconic.nodeUsed,
		bodies: projectDraconicBodies(draconic.bodies),
		angles: projectAngles(draconic.angles),
		cusps: draconic.cusps.map((c) => projectLon(c)),
	};
}

export interface ProjectionInput {
	chart: Chart;
	bodies: Chart["bodies"];
	draconic?: DraconicChart;
}

/** Publishes a computed chart (and optional draconic re-projection) into the TOON shape. */
export function project(input: ProjectionInput): Projection {
	const { chart, bodies: rawBodies, draconic } = input;
	const bodies = projectBodies(rawBodies);

	const aspects = chart.aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: roundOrb(a.orb),
		phase: a.phase,
		strength: roundStrength(a.strength),
	}));

	const declinationAspects = computeDeclinationAspects(rawBodies);
	const signature = computeChartSignature(rawBodies);
	const patterns = detectAspectPatterns(aspects, rawBodies);

	return {
		meta: {
			jdUt: roundToon(chart.jdUt),
			zodiac: chart.zodiac,
			houseSystem: chart.houseSystem,
			houseSystemRequested: chart.houseSystemRequested,
			unavailable: chart.unavailable,
		},
		bodies,
		angles: projectAngles(chart.angles),
		cusps: chart.cusps.map((c) => projectLon(c)),
		aspects,
		declinationAspects,
		patterns,
		signature,
		...(draconic ? { draconic: projectDraconic(draconic) } : {}),
	};
}
