import { SIGNS } from "caelus";

/** A longitude projected into sign, degree, and (optionally) house. Shared by
 *  the lots and evolutionary features so sign math has one home. */
export interface LotInfo {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

/** Normalizes any degree value into the range [0, 360). */
export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

/** Shifts a longitude relative to a reference node (e.g. North Node for Draconic). */
export function shiftLongitude(lon: number, nodeLon: number): number {
	return normalizeLongitude(lon - nodeLon);
}

/** Shortest angular distance between two longitudes in degrees (0 to 180). */
export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

/** Evaluates whether two longitudes fall within a specified max orb distance. */
export function isOrbWithin(
	lonA: number,
	lonB: number,
	maxOrb: number,
): boolean {
	return angularDistance(lonA, lonB) <= maxOrb;
}

/** Zodiac sign for a longitude in degrees, normalised to [0, 360). */
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

/** 1-based house for a longitude given the chart's twelve cusp longitudes. */
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

/** Rounds a numeric value to a fixed number of decimal digits (default 4). */
export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}
