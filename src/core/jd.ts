import type { BirthClock, BirthInput } from "./types";

export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;
export const MIN_OFFSET_MINUTES = -840;
export const MAX_OFFSET_MINUTES = 840;

export function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
	switch (month) {
		case 2:
			return isLeapYear(year) ? 29 : 28;
		case 4:
		case 6:
		case 9:
		case 11:
			return 30;
		default:
			return 31;
	}
}

/**
 * Julian Day (UT) from local wall-clock time and a fixed UTC offset — Meeus,
 * "Astronomical Algorithms" (2nd ed., 1998), ch. 7. Pure arithmetic, no
 * timezone database: the offset is resolved by the caller (the agent), never by
 * lumen. Verified bit-for-bit identical to caelus's `julianDay` for the same UT
 * instant over 1800–2100 (see research/calculo-jd-y-deps.md).
 */
export function meeusJdUt(local: BirthClock, offsetMinutes: number): number {
	const utDay =
		local.day + (local.hour + local.minute / 60 - offsetMinutes / 60) / 24;
	const y = local.month <= 2 ? local.year - 1 : local.year;
	const m = local.month <= 2 ? local.month + 12 : local.month;
	const a = Math.floor(y / 100);
	const b = 2 - a + Math.floor(a / 4);
	return (
		Math.floor(365.25 * (y + 4716)) +
		Math.floor(30.6001 * (m + 1)) +
		utDay +
		b -
		1524.5
	);
}

/**
 * Validates the birth input contract. Each returned string is a human-readable
 * rule violation, ready to be surfaced as an AXI suggestion.
 */
export function validateBirthInput(input: BirthInput): string[] {
	const issues: string[] = [];
	const { local, offsetMinutes, lat, lon } = input;

	if (
		!Number.isInteger(offsetMinutes) ||
		offsetMinutes < MIN_OFFSET_MINUTES ||
		offsetMinutes > MAX_OFFSET_MINUTES
	) {
		issues.push(
			`--offset must be an integer between ${MIN_OFFSET_MINUTES} and +${MAX_OFFSET_MINUTES} minutes`,
		);
	}
	if (
		!Number.isInteger(local.year) ||
		local.year < MIN_YEAR ||
		local.year > MAX_YEAR
	) {
		issues.push(`--when year out of supported range ${MIN_YEAR}-${MAX_YEAR}`);
	}
	if (!Number.isInteger(local.month) || local.month < 1 || local.month > 12) {
		issues.push("--when month must be 1-12");
	}
	if (
		!Number.isInteger(local.day) ||
		local.day < 1 ||
		local.day > daysInMonth(local.year, local.month)
	) {
		issues.push("--when day is invalid for that month");
	}
	if (!Number.isInteger(local.hour) || local.hour < 0 || local.hour > 23) {
		issues.push("--when hour must be 0-23");
	}
	if (
		!Number.isInteger(local.minute) ||
		local.minute < 0 ||
		local.minute > 59
	) {
		issues.push("--when minute must be 0-59");
	}
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
		issues.push("--at latitude must be between -90 and 90");
	}
	if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
		issues.push("--at longitude must be between -180 and 180");
	}

	return issues;
}
