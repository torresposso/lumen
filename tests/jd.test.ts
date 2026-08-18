import { describe, expect, test } from "bun:test";
import { daysInMonth, isLeapYear, julianDayUt } from "../src/core/jd";
import type { LocalTime } from "../src/core/types";

function local(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
): LocalTime {
	return { year, month, day, hour, minute };
}

describe("isLeapYear / daysInMonth", () => {
	test("gregorian leap rule", () => {
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(1900)).toBe(false);
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2026)).toBe(false);
	});

	test("days in month", () => {
		expect(daysInMonth(2000, 2)).toBe(29);
		expect(daysInMonth(1900, 2)).toBe(28);
		expect(daysInMonth(2026, 4)).toBe(30);
		expect(daysInMonth(2026, 1)).toBe(31);
	});
});

describe("julianDayUt — reference vectors (research 02)", () => {
	test.each([
		// [local time, offsetMinutes, expected jdUt]
		[local(2000, 1, 1, 12, 0), 0, 2451545.0],
		[local(1900, 1, 1, 0, 0), 0, 2415020.5],
		[local(1999, 1, 1, 0, 0), 0, 2451179.5],
		[local(1957, 10, 4, 19, 26), 0, 2436116.3097222224],
		[local(1987, 1, 27, 0, 0), 0, 2446822.5],
		// proleptic Gregorian cross-checks (research 02, #6-8): historical
		// Julian 1582-10-04 = proleptic Gregorian 1582-10-14.
		[local(1582, 10, 4, 0, 0), 0, 2299149.5],
		[local(1582, 10, 14, 0, 0), 0, 2299159.5],
		[local(1582, 10, 15, 0, 0), 0, 2299160.5],
		[local(2000, 1, 1, 7, 0), -300, 2451545.0],
		[local(2000, 1, 1, 0, 0), 570, 2451544.1041666665],
		[local(2000, 1, 1, 0, 0), 330, 2451544.2708333335],
		[local(2000, 1, 1, 12, 0), 840, 2451544.4166666665],
		[local(2000, 1, 1, 12, 0), -840, 2451545.5833333335],
	] as Array<[LocalTime, number, number]>)(
		"jdUt(%o, offset=%i) === %f",
		(lt, offsetMinutes, expected) => {
			expect(julianDayUt(lt, offsetMinutes)).toBeCloseTo(expected, 9);
		},
	);

	// Research 02 vector #12 (seconds) is not expressible: the v2 contract is
	// minute-granular by decision (ticket 01).
	test("offset round-trip: local+offset ⇄ shifted time + offset 0 give the same jdUt", () => {
		const samples: Array<[LocalTime, number]> = [
			[local(1981, 1, 26, 0, 50), 60],
			[local(1990, 6, 10, 14, 30), -240],
			[local(2000, 12, 31, 23, 59), 840],
			[local(2000, 1, 1, 0, 0), -840],
			[local(1957, 10, 4, 19, 26), 0],
		];
		for (const [lt, offset] of samples) {
			const asUt = { ...lt, minute: lt.minute - offset };
			expect(julianDayUt(lt, offset)).toBe(julianDayUt(asUt, 0));
		}
	});
});
