import type { Profile } from "./model";

/**
 * The TOON-shaped view of a profile — the shape lumen *publishes*. The
 * published key set derives from the stored `Profile` (every stored field but
 * the timestamps is published); this module authors only the display policy —
 * field order and precision. Stored values always keep full float64 precision;
 * these round only on output (the outer envelope is TOON, the AXI
 * structured-output encoding).
 */
export type ToonProfile = Omit<Profile, "createdAt" | "updatedAt">;

const JDUT_DIGITS = 6;
const COORD_DIGITS = 4;

function roundTo(value: number, digits: number): number {
	return Number(value.toFixed(digits));
}

/** Rounds a published `birthJdUt` (~0.09 s of time at 6 decimals). */
function roundBirthJdUt(birthJdUt: number): number {
	return roundTo(birthJdUt, JDUT_DIGITS);
}

/** Rounds a published `birthLat`/`birthLon` (~11 m at 4 decimals). */
function roundCoordinate(value: number): number {
	return roundTo(value, COORD_DIGITS);
}

/** The published profile: same fields as the stored one, display-precision numbers. */
export function toonProfile(profile: Profile): ToonProfile {
	return {
		id: profile.id,
		name: profile.name,
		birthPlace: profile.birthPlace,
		birthDateTime: profile.birthDateTime,
		birthLat: roundCoordinate(profile.birthLat),
		birthLon: roundCoordinate(profile.birthLon),
		birthJdUt: roundBirthJdUt(profile.birthJdUt),
	};
}
