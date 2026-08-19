import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import {
	daysInMonth,
	isLeapYear,
	julianDayUt,
	type LocalTime,
	parseBirthInput,
} from "../src/domain/birth-input";
import type { BirthInput } from "../src/domain/model";

function local(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
): LocalTime {
	return { year, month, day, hour, minute };
}

const VALID = {
	when: "1990-06-10T14:30-04:00",
	where: "27.95, -82.46, Tampa, USA",
};

const DEFAULT_LABELS = { when: "--when", where: "--where" };

function issuesFor(
	raw: { when?: string; where?: string },
	labels = DEFAULT_LABELS,
): string[] {
	try {
		parseBirthInput(
			{
				when: raw.when ?? VALID.when,
				where: raw.where ?? VALID.where,
			},
			labels,
		);
		return [];
	} catch (error) {
		expect(error).toBeInstanceOf(AxiError);
		return (error as AxiError).suggestions ?? [];
	}
}

describe("parseBirthInput — contract", () => {
	test("accepts valid raw input and returns the parsed BirthInput", () => {
		const input = parseBirthInput(VALID, DEFAULT_LABELS);
		expect(input).toEqual<BirthInput>({
			birthDateTime: "1990-06-10T14:30-04:00",
			birthLat: 27.95,
			birthLon: -82.46,
			birthPlace: "Tampa, USA",
			// Derived by the contract — Meeus ch. 7 via julianDayUt.
			birthJdUt: 2448053.2708333335,
		});
	});

	test("accepts Z, explicit +, single-digit fields and a place with commas, canonicalizing the datetime", () => {
		const input = parseBirthInput(
			{
				when: "1990-6-10T14:5Z",
				where: "9.15, -74.75, Magangué, Colombia",
			},
			DEFAULT_LABELS,
		);
		expect(input.birthDateTime).toBe("1990-06-10T14:05Z");
		expect(input.birthJdUt).toBe(2448053.0868055555);
		expect(input.birthLat).toBe(9.15);
		expect(input.birthLon).toBe(-74.75);
		expect(input.birthPlace).toBe("Magangué, Colombia");
	});

	test("derives the canonical example's birthJdUt (1981 Magangué)", () => {
		const input = parseBirthInput(
			{
				when: "1981-01-26T00:50-05:00",
				where: "9.15, -74.75, Magangué, Colombia",
			},
			DEFAULT_LABELS,
		);
		expect(input.birthJdUt).toBe(2444630.7430555555);
	});

	test("rejects a malformed --when with a cited rule", () => {
		expect(issuesFor({ when: "not-a-date" })).toEqual([
			expect.stringContaining("--when"),
		]);
	});

	test("rejects a --where without at least three parts (coords + place)", () => {
		expect(issuesFor({ where: "zz" })).toEqual([
			expect.stringContaining("--where"),
		]);
		expect(issuesFor({ where: "9.15, -74.75" })).toEqual([
			expect.stringContaining("--where"),
		]);
	});

	test("rejects a malformed latitude with a cited rule", () => {
		expect(issuesFor({ where: "zz, -74.75, Magangué" })).toEqual([
			expect.stringContaining("--where latitude"),
		]);
	});

	test("rejects a malformed longitude with a cited rule", () => {
		expect(issuesFor({ where: "9.15, zz, Magangué" })).toEqual([
			expect.stringContaining("--where longitude"),
		]);
	});

	test("rejects an empty place with a cited rule", () => {
		expect(issuesFor({ where: "9.15, -74.75,   " })).toEqual([
			expect.stringContaining("--where place"),
		]);
	});

	test("rejects a malformed offset inside --when with a cited rule", () => {
		expect(issuesFor({ when: "1990-06-10T14:30+05:99" }).join(" ")).toContain(
			"--when offset",
		);
	});

	test("accumulates every checkable violation in one error", () => {
		const issues = issuesFor({
			when: "1799-02-30T24:60-04:00",
			where: "90.1, 180.1, Place",
		});
		expect(issues).toEqual([
			expect.stringContaining("year"),
			expect.stringContaining("day"),
			expect.stringContaining("hour"),
			expect.stringContaining("minute"),
			expect.stringContaining("--where latitude"),
			expect.stringContaining("--where longitude"),
		]);
	});

	test("a malformed --when does not block checking --where", () => {
		const issues = issuesFor({
			when: "not-a-date",
			where: "zz, zz, Place",
		});
		expect(issues).toEqual([
			expect.stringContaining("--when"),
			expect.stringContaining("--where latitude"),
			expect.stringContaining("--where longitude"),
		]);
	});

	test("error carries the VALIDATION_ERROR code", () => {
		try {
			parseBirthInput(
				{
					when: "1990-06-10T14:30+16:00",
					where: VALID.where,
				},
				DEFAULT_LABELS,
			);
			expect.unreachable();
		} catch (error) {
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});
});

describe("parseBirthInput — semantic ranges", () => {
	test("feb 29 only in leap years", () => {
		expect(issuesFor({ when: "2000-02-29T12:00-05:00" })).toEqual([]);
		expect(issuesFor({ when: "1900-02-29T12:00-05:00" })).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test("rejects nonexistent dates", () => {
		expect(issuesFor({ when: "2000-02-30T12:00-05:00" })).toEqual([
			expect.stringContaining("day"),
		]);
		expect(issuesFor({ when: "2026-04-31T12:00-05:00" })).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test.each([
		["2000-01-01T24:00-05:00", "hour"],
		["2000-01-01T12:60-05:00", "minute"],
		["2000-13-01T12:00-05:00", "month"],
		["2000-00-01T12:00-05:00", "month"],
		["2000-01-00T12:00-05:00", "day"],
	] as Array<[string, string]>)(
		"rejects out-of-range clock fields (%j)",
		(dateTime, field) => {
			expect(issuesFor({ when: dateTime })).toEqual([
				expect.stringContaining(field),
			]);
		},
	);

	test("rejects offsets out of range or non-integer", () => {
		expect(issuesFor({ when: "1990-06-10T14:30+15:00" })[0]).toContain(
			"--when offset",
		);
		expect(issuesFor({ when: "1990-06-10T14:30-15:00" })[0]).toContain(
			"--when offset",
		);
		expect(issuesFor({ when: "1990-06-10T14:30+05:99" })[0]).toContain(
			"--when offset",
		);
	});

	test("rejects years outside 1800-2100", () => {
		expect(issuesFor({ when: "1799-01-01T12:00-05:00" })[0]).toContain("year");
		expect(issuesFor({ when: "2101-01-01T12:00-05:00" })[0]).toContain("year");
	});

	test("rejects coordinates out of range", () => {
		expect(issuesFor({ where: "90.1, -74.75, X" })[0]).toContain(
			"--where latitude",
		);
		expect(issuesFor({ where: "9.15, 180.1, X" })[0]).toContain(
			"--where longitude",
		);
	});
});

describe("parseBirthInput — flag-agnostic labels", () => {
	test("interpolates caller-supplied flag labels into every suggestion", () => {
		try {
			parseBirthInput(
				{ when: "garbage", where: "nope" },
				{ when: "--birth-when", where: "--birth-where" },
			);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			const err = error as AxiError;
			expect(err.code).toBe("VALIDATION_ERROR");
			expect(err.suggestions?.join(" ")).toContain("--birth-when");
			expect(err.suggestions?.join(" ")).toContain("--birth-where");
		}
	});

	test("custom labels propagate to all cited error rules", () => {
		const custom = issuesFor(
			{ when: "garbage", where: "zz" },
			{ when: "--custom-when", where: "--custom-where" },
		);
		expect(custom.join(" ")).toContain("--custom-when");
		expect(custom.join(" ")).toContain("--custom-where");
	});
});

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
