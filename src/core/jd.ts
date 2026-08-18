import type { LocalTime } from "./types";

/**
 * Julian Day (UT) from local wall-clock time and a fixed UTC offset — Meeus,
 * "Astronomical Algorithms" (2nd ed., 1998), ch. 7. Pure arithmetic, no
 * timezone database: the offset is resolved by the caller (the agent), never by
 * lumen. Verified bit-for-bit identical to caelus's `julianDay` for the same UT
 * instant over 1800–2100 (see research/calculo-jd-y-deps.md).
 *
 * The birth-input contract (parse + validation) lives in `core/birth-input.ts`;
 * this module owns only the arithmetic.
 */
export function julianDayUt(local: LocalTime, offsetMinutes: number): number {
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
