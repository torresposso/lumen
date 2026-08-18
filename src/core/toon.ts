import type { BirthClock, Profile } from "./types";

/**
 * The TOON-shaped view of a profile — the shape lumen *publishes*. Stored
 * values always keep full float64 precision; these round only on output (the
 * outer envelope is TOON, the AXI structured-output encoding). This module is
 * the single display policy: field selection, order and precision.
 */
export type ToonProfile = {
	id: string;
	name: string | null;
	birthplace: string;
	when: string;
	offset: number;
	lat: number;
	lon: number;
	jdUt: number;
};

const JDUT_DIGITS = 6;
const COORD_DIGITS = 4;

function roundTo(value: number, digits: number): number {
	return Number(value.toFixed(digits));
}

/** Rounds a published `jdUt` (~0.09 s of time at 6 decimals). */
function roundJdUt(jdUt: number): number {
	return roundTo(jdUt, JDUT_DIGITS);
}

/** Rounds a published `lat`/`lon` (~11 m at 4 decimals). */
function roundCoordinate(value: number): number {
	return roundTo(value, COORD_DIGITS);
}

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/** `1988-03-14T08:30` — the local time as given (no seconds). */
function formatWhen(local: BirthClock): string {
	return `${local.year}-${pad2(local.month)}-${pad2(local.day)}T${pad2(local.hour)}:${pad2(local.minute)}`;
}

/** The published profile: same fields as the stored one, display-precision numbers. */
export function toonProfile(profile: Profile): ToonProfile {
	return {
		id: profile.id,
		name: profile.name,
		birthplace: profile.birthplace,
		when: formatWhen(profile.birth.local),
		offset: profile.birth.offsetMinutes,
		lat: roundCoordinate(profile.birth.lat),
		lon: roundCoordinate(profile.birth.lon),
		jdUt: roundJdUt(profile.birth.jdUt),
	};
}
