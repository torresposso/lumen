import { SIGNS } from "caelus";

/** A celestial longitude projected into zodiac sign, sign degree, and 1-based house.
 *  Serves as the canonical representation for all derived points in the natal matrix. */
export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

/** Backward compatibility alias for ProjectedEclipticPoint. */
export type LotInfo = ProjectedEclipticPoint;

/** Normalizes any ecliptic degree value into the canonical astronomical range [0, 360). */
export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

/** Shifts a celestial longitude relative to a reference node (e.g. North Node for Draconic shift). */
export function shiftLongitude(lon: number, nodeLon: number): number {
	return normalizeLongitude(lon - nodeLon);
}

/** Computes the shortest angular separation between two ecliptic longitudes in degrees [0, 180]. */
export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

/** Computes the direct counterclockwise angular distance from lonFrom to lonTo in degrees [0, 360). */
export function angularDistanceDirect(lonFrom: number, lonTo: number): number {
	return normalizeLongitude(lonTo - lonFrom);
}

/** Evaluates whether two celestial longitudes fall within a specified max orb distance. */
export function isOrbWithin(
	lonA: number,
	lonB: number,
	maxOrb: number,
): boolean {
	return angularDistance(lonA, lonB) <= maxOrb;
}

/** Returns the tropical zodiac sign for an ecliptic longitude in degrees. */
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

/** Determines the 1-based astrological house for a longitude given the chart's 12 cusp longitudes. */
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

/** Rounds an astronomical coordinate value to a fixed number of decimal digits (default 4). */
export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}

/** Projects an ecliptic longitude into a canonical ProjectedEclipticPoint with degree normalization,
 *  sign determination, 30° edge boundary protection, precision rounding, and optional house lookup. */
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

/** Aspect definition with name, target angle, and maximum orb in degrees. */
export interface AspectDef {
	name: string;
	target: number;
	orb: number;
}

/** Result of matching an angular separation to an aspect definition. */
export interface AspectMatch {
	aspect: string;
	target: number;
	orb: number;
}

/** Evaluates whether two longitudes form an aspect from a given list of aspect definitions. */
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

/** Result of matching celestial declinations for parallel or contraparallel aspects. */
export interface DeclinationAspectMatch {
	aspect: "parallel" | "contraparallel";
	orb: number;
}

/** Evaluates whether two celestial declinations form a parallel or contraparallel aspect.
 *  - Parallel: Same side of celestial equator (same sign), difference <= maxOrb.
 *  - Contraparallel: Opposite sides (opposite signs), absolute difference <= maxOrb. */
export function findDeclinationAspect(
	decA: number,
	decB: number,
	maxOrb = 1.2,
): DeclinationAspectMatch | undefined {
	const isSameHemisphere = (decA >= 0 && decB >= 0) || (decA <= 0 && decB <= 0);

	if (isSameHemisphere) {
		const diff = Math.abs(decA - decB);
		if (diff <= maxOrb) {
			return {
				aspect: "parallel",
				orb: roundPrecision(diff),
			};
		}
	} else {
		const diff = Math.abs(Math.abs(decA) - Math.abs(decB));
		if (diff <= maxOrb) {
			return {
				aspect: "contraparallel",
				orb: roundPrecision(diff),
			};
		}
	}

	return undefined;
}

/** Standard planetary sign rulership mapping (modern / evolutionary). */
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
