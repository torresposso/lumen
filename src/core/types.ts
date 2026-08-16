import type {
	BodyId,
	Chart,
	Engine,
	HouseSystem,
	LunarEclipse,
	SolarEclipse,
	Zodiac,
} from "caelus";
import { SIGNS } from "caelus";
import type { UTResult } from "caelus-birth";

// ============================================================================
// Birth & Intake Types
// ============================================================================

/** Caelus's UT provenance status is the single source of truth for birth resolution. */
export type BirthStatus = UTResult["status"];

export interface BirthClockFields {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

export interface ResolvedBirth {
	jdUt: number;
	lat: number;
	lon: number;
	local: BirthClockFields;
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
}

export interface GeocodeResult {
	name: string;
	lat: number;
	lon: number;
	country?: string;
	admin1?: string;
	timezone?: string;
}

export interface Geocoder {
	search(query: string, limit?: number): Promise<GeocodeResult[]>;
}

export interface ChartRequestOptions {
	houseSystem: HouseSystem;
	zodiac: Zodiac;
	node: "both" | "mean" | "true";
	bodies: BodyId[];
	topocentric: boolean;
	draconic: boolean;
}

export interface NatalRequest {
	birth: ResolvedBirth;
	options: ChartRequestOptions;
}

export interface ChartBodyLite {
	lon: number;
	speed: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde?: boolean;
}

/** Minimal body map accepted by evolutionary calculators (tests and projections). */
export type ChartBodiesLite = Partial<Record<string, ChartBodyLite>>;

// ============================================================================
// Ephemeris Capability Seam
// ============================================================================

export type EphemerisChartAtOptions = Parameters<Engine["chartAt"]>[3];

/** Pure capability seam over the ephemeris engine. Adapters implement this
 *  interface; core modules depend only on the interface, never on I/O. */
export interface Ephemeris {
	chartAt(
		jdUt: number,
		lat: number,
		lonEast: number,
		opts?: EphemerisChartAtOptions,
	): Chart;
	solarEclipses(jdStart: number, jdEnd: number): SolarEclipse[];
	lunarEclipses(jdStart: number, jdEnd: number): LunarEclipse[];
	progressedLongitude?(body: BodyId, natalJd: number, targetJd: number): number;
	stations?(
		body: BodyId,
		jdStart: number,
		jdEnd: number,
		maxHits?: number,
	): Array<[number, "retrograde" | "direct"]>;
}

// ============================================================================
// Evolutionary Astrology & Chart Types (JWG)
// ============================================================================

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

export type NodeMotionStatus = "retrograde" | "direct" | "stationary";

export interface SkippedStep {
	body: string;
	aspect: string;
	orb: number;
}

export interface NodalRulerPlacement {
	body: string;
	sign: string;
	signDeg: number;
	house: number;
	motion: "direct" | "retrograde" | "stationary";
	description: string;
}

export interface DispositorChainNode {
	body: string;
	rules: string;
	sign: string;
	next?: string;
}

export interface PlutoPolarityPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	active: boolean;
	description: string;
}

// ============================================================================
// Shared Zodiacal Geometry
// ============================================================================

/** A celestial longitude projected into zodiac sign, sign degree, and 1-based house. */
export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

/** Normalizes any ecliptic degree value into the canonical astronomical range [0, 360). */
export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

/** Shifts a celestial longitude relative to a reference node (e.g. Draconic shift). */
export function shiftLongitude(lon: number, nodeLon: number): number {
	return normalizeLongitude(lon - nodeLon);
}

/** Shortest angular separation between two ecliptic longitudes, degrees [0, 180]. */
export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

/** Direct counter-clockwise arc from lonFrom to lonTo, degrees [0, 360). */
export function angularDistanceDirect(lonFrom: number, lonTo: number): number {
	return normalizeLongitude(lonTo - lonFrom);
}

export function isOrbWithin(
	lonA: number,
	lonB: number,
	maxOrb: number,
): boolean {
	return angularDistance(lonA, lonB) <= maxOrb;
}

/** Tropical zodiac sign for an ecliptic longitude in degrees. */
export function signOf(lon: number): string {
	const norm = normalizeLongitude(lon);
	const idx = Math.floor(norm / 30) % 12;
	const sign = SIGNS[idx];
	if (sign === undefined) {
		throw new Error(
			`unreachable: sign index ${idx} out of range for lon ${lon}`,
		);
	}
	return sign;
}

/** 1-based astrological house for a longitude given 12 cusp longitudes. */
export function houseOf(cusps: number[], lon: number): number {
	if (!cusps || cusps.length < 12) {
		throw new Error(
			`houseOf requires 12 cusps, got ${cusps?.length ?? 0}; is the chart missing house cusps?`,
		);
	}
	const normLon = normalizeLongitude(lon);
	for (let i = 0; i < 12; i++) {
		const curr = cusps[i];
		const next = cusps[(i + 1) % 12];
		if (curr === undefined || next === undefined) {
			throw new Error(`houseOf: cusp ${i} is undefined`);
		}
		if (curr < next) {
			if (normLon >= curr && normLon < next) return i + 1;
		} else {
			if (normLon >= curr || normLon < next) return i + 1;
		}
	}
	return 1;
}

/** Rounds an astronomical coordinate to a fixed number of decimal digits (default 4). */
export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}

/** Projects an ecliptic longitude into sign / degree / house with rounding. */
export function projectPoint(
	rawLon: number,
	cusps?: number[],
	digits = 4,
): ProjectedEclipticPoint {
	const norm = normalizeLongitude(rawLon);
	const lon = normalizeLongitude(roundPrecision(norm, digits));
	let signDeg = roundPrecision(norm % 30, digits);
	let sign = signOf(norm);
	if (signDeg >= 30) {
		signDeg = 0;
		sign = signOf((norm + 30) % 360);
	}
	const house = cusps && cusps.length >= 12 ? houseOf(cusps, norm) : 1;
	return { lon, sign, signDeg, house };
}

export interface AspectDef {
	name: string;
	target: number;
	orb: number;
}

export interface AspectMatch {
	aspect: string;
	target: number;
	orb: number;
}

/** Matches two longitudes against the first aspect whose orb contains them. */
export function findAspect(
	lonA: number,
	lonB: number,
	aspects: readonly AspectDef[],
): AspectMatch | undefined {
	const dist = angularDistance(lonA, lonB);
	for (const asp of aspects) {
		const diff = Math.abs(dist - asp.target);
		if (diff <= asp.orb) {
			return {
				aspect: asp.name,
				target: asp.target,
				orb: roundPrecision(diff),
			};
		}
	}
	return undefined;
}

export interface DeclinationAspectMatch {
	aspect: "parallel" | "contraparallel";
	orb: number;
}

/** Matches celestial declinations as parallel or contraparallel. */
export function findDeclinationAspect(
	decA: number,
	decB: number,
	maxOrb = 1.2,
): DeclinationAspectMatch | undefined {
	const isSameHemisphere = (decA >= 0 && decB >= 0) || (decA <= 0 && decB <= 0);

	if (isSameHemisphere) {
		const diff = Math.abs(decA - decB);
		if (diff <= maxOrb) {
			return { aspect: "parallel", orb: roundPrecision(diff) };
		}
	} else {
		const diff = Math.abs(Math.abs(decA) - Math.abs(decB));
		if (diff <= maxOrb) {
			return { aspect: "contraparallel", orb: roundPrecision(diff) };
		}
	}

	return undefined;
}

/** Standard modern / evolutionary planetary sign rulership matrix. */
export const SIGN_RULERS: Record<string, string> = {
	Aries: "mars",
	Taurus: "venus",
	Gemini: "mercury",
	Cancer: "moon",
	Leo: "sun",
	Virgo: "mercury",
	Libra: "venus",
	Scorpio: "pluto",
	Sagittarius: "jupiter",
	Capricorn: "saturn",
	Aquarius: "uranus",
	Pisces: "neptune",
};
