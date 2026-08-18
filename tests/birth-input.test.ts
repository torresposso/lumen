import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { parseBirthInput } from "../src/core/birth-input";
import type { BirthInput } from "../src/core/types";

const VALID = { when: "1990-06-10T14:30", offset: "-240", at: "27.95,-82.46" };

function issuesFor(raw: {
	when?: string;
	offset?: string;
	at?: string;
}): string[] {
	try {
		parseBirthInput({
			when: raw.when ?? VALID.when,
			offset: raw.offset ?? VALID.offset,
			at: raw.at ?? VALID.at,
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
			local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
			offsetMinutes: -240,
			lat: 27.95,
			lon: -82.46,
		});
	});

	test("accepts space separator, explicit +, and single-digit fields", () => {
		const input = parseBirthInput({
			when: "1990-6-10 14:5",
			offset: "+60",
			at: "9.15, -74.75",
		});
		expect(input.local).toEqual({
			year: 1990,
			month: 6,
			day: 10,
			hour: 14,
			minute: 5,
		});
		expect(input.offsetMinutes).toBe(60);
		expect(input.lat).toBe(9.15);
		expect(input.lon).toBe(-74.75);
	});

	test("rejects a malformed --when with a cited rule", () => {
		expect(issuesFor({ when: "not-a-date" })).toEqual([
			expect.stringContaining("--when"),
		]);
	});

	test("rejects a malformed --at with a cited rule", () => {
		expect(issuesFor({ at: "zz" })).toEqual([expect.stringContaining("--at")]);
	});

	test("rejects a malformed --offset with a cited rule", () => {
		expect(issuesFor({ offset: "abc" })).toEqual([
			expect.stringContaining("--offset"),
		]);
	});

	test("accumulates every checkable violation in one error", () => {
		const issues = issuesFor({
			when: "1799-02-30T24:60",
			offset: "841",
			at: "90.1,180.1",
		});
		expect(issues).toEqual([
			expect.stringContaining("year"),
			expect.stringContaining("day"),
			expect.stringContaining("hour"),
			expect.stringContaining("minute"),
			expect.stringContaining("--offset"),
			expect.stringContaining("latitude"),
			expect.stringContaining("longitude"),
		]);
	});

	test("a malformed --when does not block checking --offset and --at", () => {
		const issues = issuesFor({ when: "not-a-date", offset: "841", at: "zz" });
		expect(issues).toEqual([
			expect.stringContaining("--when"),
			expect.stringContaining("--offset"),
			expect.stringContaining("--at"),
		]);
	});

	test("error carries the VALIDATION_ERROR code", () => {
		try {
			parseBirthInput({ ...VALID, offset: "841" });
			expect.unreachable();
		} catch (error) {
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});
});

describe("parseBirthInput — semantic ranges", () => {
	test("feb 29 only in leap years", () => {
		expect(issuesFor({ when: "2000-02-29T12:00" })).toEqual([]);
		expect(issuesFor({ when: "1900-02-29T12:00" })).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test("rejects nonexistent dates", () => {
		expect(issuesFor({ when: "2000-02-30T12:00" })).toEqual([
			expect.stringContaining("day"),
		]);
		expect(issuesFor({ when: "2026-04-31T12:00" })).toEqual([
			expect.stringContaining("day"),
		]);
	});

	test.each([
		["2000-01-01T24:00", "hour"],
		["2000-01-01T12:60", "minute"],
		["2000-13-01T12:00", "month"],
		["2000-00-01T12:00", "month"],
		["2000-01-00T12:00", "day"],
	] as Array<[string, string]>)(
		"rejects out-of-range clock fields (%j)",
		(when, field) => {
			expect(issuesFor({ when })).toEqual([expect.stringContaining(field)]);
		},
	);

	test("rejects offsets out of range or non-integer", () => {
		expect(issuesFor({ offset: "841" })[0]).toContain("--offset");
		expect(issuesFor({ offset: "-841" })[0]).toContain("--offset");
		expect(issuesFor({ offset: "60.5" })[0]).toContain("--offset");
	});

	test("rejects years outside 1800-2100", () => {
		expect(issuesFor({ when: "1799-01-01T12:00" })[0]).toContain("year");
		expect(issuesFor({ when: "2101-01-01T12:00" })[0]).toContain("year");
	});

	test("rejects coordinates out of range", () => {
		expect(issuesFor({ at: "90.1,0" })[0]).toContain("latitude");
		expect(issuesFor({ at: "0,180.1" })[0]).toContain("longitude");
	});
});
