import { describe, expect, test } from "bun:test";
import {
	daysInMonth,
	isLeapYear,
	meeusJdUt,
	validateBirthInput,
} from "../src/core/jd";
import type { BirthClock, BirthInput } from "../src/core/types";

function local(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
): BirthClock {
	return { year, month, day, hour, minute };
}

function input(
	clock: BirthClock,
	offsetMinutes: number,
	lat = 40.42,
	lon = -3.7,
): BirthInput {
	return { local: clock, offsetMinutes, lat, lon };
}

const VALID = input(local(1990, 6, 10, 14, 30), -240, 27.95, -82.46);

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

describe("meeusJdUt — reference vectors (research 02)", () => {
	test.each([
		// [local clock, offsetMinutes, expected jdUt]
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
	] as Array<[BirthClock, number, number]>)(
		"jdUt(%o, offset=%i) === %f",
		(clock, offsetMinutes, expected) => {
			expect(meeusJdUt(clock, offsetMinutes)).toBeCloseTo(expected, 9);
		},
	);

	// Research 02 vector #12 (seconds) is not expressible: the v2 contract is
	// minute-granular by decision (ticket 01).
	test("offset round-trip: local+offset ⇄ shifted clock + offset 0 give the same jdUt", () => {
		const samples: Array<[BirthClock, number]> = [
			[local(1981, 1, 26, 0, 50), 60],
			[local(1990, 6, 10, 14, 30), -240],
			[local(2000, 12, 31, 23, 59), 840],
			[local(2000, 1, 1, 0, 0), -840],
			[local(1957, 10, 4, 19, 26), 0],
		];
		for (const [clock, offset] of samples) {
			const asUt = { ...clock, minute: clock.minute - offset };
			expect(meeusJdUt(clock, offset)).toBe(meeusJdUt(asUt, 0));
		}
	});
});

describe("validateBirthInput", () => {
	test("accepts a valid input", () => {
		expect(validateBirthInput(VALID)).toEqual([]);
	});

	test("feb 29 only in leap years", () => {
		expect(validateBirthInput(input(local(2000, 2, 29, 12, 0), 0))).toEqual([]);
		expect(validateBirthInput(input(local(1900, 2, 29, 12, 0), 0))).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test("rejects nonexistent dates", () => {
		expect(validateBirthInput(input(local(2000, 2, 30, 12, 0), 0))).toEqual([
			expect.stringContaining("day"),
		]);
		expect(validateBirthInput(input(local(2026, 4, 31, 12, 0), 0))).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test.each([
		[local(2000, 1, 1, 24, 0), "hour"],
		[local(2000, 1, 1, 12, 60), "minute"],
		[local(2000, 13, 1, 12, 0), "month"],
		[local(2000, 0, 1, 12, 0), "month"],
		[local(2000, 1, 0, 12, 0), "day"],
	] as Array<[BirthClock, string]>)(
		"rejects out-of-range clock fields (%j)",
		(clock, field) => {
			const issues = validateBirthInput(input(clock, 0));
			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0]).toEqual(expect.stringContaining(field));
		},
	);

	test("rejects offsets out of range or non-integer", () => {
		expect(
			validateBirthInput(input(local(2000, 1, 1, 12, 0), 841))[0],
		).toContain("--offset");
		expect(
			validateBirthInput(input(local(2000, 1, 1, 12, 0), -841))[0],
		).toContain("--offset");
		expect(
			validateBirthInput(input(local(2000, 1, 1, 12, 0), 60.5))[0],
		).toContain("--offset");
	});

	test("rejects years outside 1800-2100", () => {
		expect(validateBirthInput(input(local(1799, 1, 1, 12, 0), 0))[0]).toContain(
			"year",
		);
		expect(validateBirthInput(input(local(2101, 1, 1, 12, 0), 0))[0]).toContain(
			"year",
		);
	});

	test("rejects coordinates out of range", () => {
		expect(
			validateBirthInput(input(local(2000, 1, 1, 12, 0), 0, 90.1, 0))[0],
		).toContain("latitude");
		expect(
			validateBirthInput(input(local(2000, 1, 1, 12, 0), 0, 0, 180.1))[0],
		).toContain("longitude");
	});
});
