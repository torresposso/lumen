import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { parseBirthInput } from "../src/core/birth-input";
import type { BirthInput } from "../src/core/types";

const VALID = {
	birthDateTime: "1990-06-10T14:30-04:00",
	birthLat: "27.95",
	birthLon: "-82.46",
};

function issuesFor(raw: {
	birthDateTime?: string;
	birthLat?: string;
	birthLon?: string;
}): string[] {
	try {
		parseBirthInput({
			birthDateTime: raw.birthDateTime ?? VALID.birthDateTime,
			birthLat: raw.birthLat ?? VALID.birthLat,
			birthLon: raw.birthLon ?? VALID.birthLon,
		});
		return [];
	} catch (error) {
		expect(error).toBeInstanceOf(AxiError);
		return (error as AxiError).suggestions ?? [];
	}
}

describe("parseBirthInput — contract", () => {
	test("accepts valid raw input and returns the parsed BirthInput", () => {
		const input = parseBirthInput(VALID);
		expect(input).toEqual<BirthInput>({
			birthDateTime: "1990-06-10T14:30-04:00",
			local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
			offsetMinutes: -240,
			birthLat: 27.95,
			birthLon: -82.46,
		});
	});

	test("accepts Z, explicit +, and single-digit fields, canonicalizing the local time", () => {
		const input = parseBirthInput({
			birthDateTime: "1990-6-10T14:5Z",
			birthLat: "9.15",
			birthLon: "-74.75",
		});
		expect(input.birthDateTime).toBe("1990-06-10T14:05Z");
		expect(input.offsetMinutes).toBe(0);
		expect(input.local).toEqual({
			year: 1990,
			month: 6,
			day: 10,
			hour: 14,
			minute: 5,
		});
		expect(input.birthLat).toBe(9.15);
		expect(input.birthLon).toBe(-74.75);
	});

	test("rejects a malformed --birthdatetime with a cited rule", () => {
		expect(issuesFor({ birthDateTime: "not-a-date" })).toEqual([
			expect.stringContaining("--birthdatetime"),
		]);
	});

	test("rejects a malformed --birthlat with a cited rule", () => {
		expect(issuesFor({ birthLat: "zz" })).toEqual([
			expect.stringContaining("--birthlat"),
		]);
	});

	test("rejects a malformed --birthlon with a cited rule", () => {
		expect(issuesFor({ birthLon: "zz" })).toEqual([
			expect.stringContaining("--birthlon"),
		]);
	});

	test("rejects a malformed offset inside --birthdatetime with a cited rule", () => {
		expect(
			issuesFor({ birthDateTime: "1990-06-10T14:30+05:99" }).join(" "),
		).toContain("--birthdatetime offset");
	});

	test("accumulates every checkable violation in one error", () => {
		const issues = issuesFor({
			birthDateTime: "1799-02-30T24:60-04:00",
			birthLat: "90.1",
			birthLon: "180.1",
		});
		expect(issues).toEqual([
			expect.stringContaining("year"),
			expect.stringContaining("day"),
			expect.stringContaining("hour"),
			expect.stringContaining("minute"),
			expect.stringContaining("--birthlat"),
			expect.stringContaining("--birthlon"),
		]);
	});

	test("a malformed --birthdatetime does not block checking lat/lon", () => {
		const issues = issuesFor({
			birthDateTime: "not-a-date",
			birthLat: "zz",
			birthLon: "zz",
		});
		expect(issues).toEqual([
			expect.stringContaining("--birthdatetime"),
			expect.stringContaining("--birthlat"),
			expect.stringContaining("--birthlon"),
		]);
	});

	test("error carries the VALIDATION_ERROR code", () => {
		try {
			parseBirthInput({
				...VALID,
				birthDateTime: "1990-06-10T14:30+16:00",
			});
			expect.unreachable();
		} catch (error) {
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});
});

describe("parseBirthInput — semantic ranges", () => {
	test("feb 29 only in leap years", () => {
		expect(issuesFor({ birthDateTime: "2000-02-29T12:00-05:00" })).toEqual([]);
		expect(issuesFor({ birthDateTime: "1900-02-29T12:00-05:00" })).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test("rejects nonexistent dates", () => {
		expect(issuesFor({ birthDateTime: "2000-02-30T12:00-05:00" })).toEqual([
			expect.stringContaining("day"),
		]);
		expect(issuesFor({ birthDateTime: "2026-04-31T12:00-05:00" })).toEqual([
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
			expect(issuesFor({ birthDateTime: dateTime })).toEqual([
				expect.stringContaining(field),
			]);
		},
	);

	test("rejects offsets out of range or non-integer", () => {
		expect(issuesFor({ birthDateTime: "1990-06-10T14:30+15:00" })[0]).toContain(
			"--birthdatetime offset",
		);
		expect(issuesFor({ birthDateTime: "1990-06-10T14:30-15:00" })[0]).toContain(
			"--birthdatetime offset",
		);
		expect(issuesFor({ birthDateTime: "1990-06-10T14:30+05:99" })[0]).toContain(
			"--birthdatetime offset",
		);
	});

	test("rejects years outside 1800-2100", () => {
		expect(issuesFor({ birthDateTime: "1799-01-01T12:00-05:00" })[0]).toContain(
			"year",
		);
		expect(issuesFor({ birthDateTime: "2101-01-01T12:00-05:00" })[0]).toContain(
			"year",
		);
	});

	test("rejects coordinates out of range", () => {
		expect(issuesFor({ birthLat: "90.1" })[0]).toContain("--birthlat");
		expect(issuesFor({ birthLon: "180.1" })[0]).toContain("--birthlon");
	});
});
