import type { BirthClock } from "./types";

/**
 * lumen's display-precision policy — the numbers lumen *publishes*. Stored
 * values always keep full float64 precision; these round only on output (the
 * outer envelope is TOON, the AXI structured-output encoding).
 */
export const TOON_JDUT_DIGITS = 6;
export const TOON_COORD_DIGITS = 4;

function roundTo(value: number, digits: number): number {
	return Number(value.toFixed(digits));
}

/** Rounds a published `jdUt` (~0.09 s of time at 6 decimals). */
export function roundJdUt(jdUt: number): number {
	return roundTo(jdUt, TOON_JDUT_DIGITS);
}

/** Rounds a published `lat`/`lon` (~11 m at 4 decimals). */
export function roundCoordinate(value: number): number {
	return roundTo(value, TOON_COORD_DIGITS);
}

export function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/** `1988-03-14T08:30` — the local time as given (no seconds). */
export function formatWhen(local: BirthClock): string {
	return `${local.year}-${pad2(local.month)}-${pad2(local.day)}T${pad2(local.hour)}:${pad2(local.minute)}`;
}
