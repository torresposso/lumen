import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { parseBirthInput } from "../src/domain/birth-input";
import type { BirthInput } from "../src/domain/model";

const VALID = {
	when: "1990-06-10T14:30-04:00",
	where: "27.95, -82.46, Tampa, USA",
};

function issuesFor(raw: { when?: string; where?: string }): string[] {
	try {
		parseBirthInput({
			when: raw.when ?? VALID.when,
			where: raw.where ?? VALID.where,
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
			birthLat: 27.95,
			birthLon: -82.46,
			birthPlace: "Tampa, USA",
			// Derived by the contract — Meeus ch. 7 via julianDayUt.
			birthJdUt: 2448053.2708333335,
		});
	});

	test("accepts Z, explicit +, single-digit fields and a place with commas, canonicalizing the datetime", () => {
		const input = parseBirthInput({
			when: "1990-6-10T14:5Z",
			where: "9.15, -74.75, Magangué, Colombia",
		});
		expect(input.birthDateTime).toBe("1990-06-10T14:05Z");
		expect(input.birthJdUt).toBe(2448053.0868055555);
		expect(input.birthLat).toBe(9.15);
		expect(input.birthLon).toBe(-74.75);
		expect(input.birthPlace).toBe("Magangué, Colombia");
	});

	test("derives the canonical example's birthJdUt (1981 Magangué)", () => {
		const input = parseBirthInput({
			when: "1981-01-26T00:50-05:00",
			where: "9.15, -74.75, Magangué, Colombia",
		});
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
			parseBirthInput({
				when: "1990-06-10T14:30+16:00",
				where: VALID.where,
			});
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

	test("the domain default keeps the historical --when/--where wording", () => {
		expect(issuesFor({ when: "garbage" })[0]).toContain("--when");
		expect(issuesFor({ where: "zz" })[0]).toContain("--where");
	});
});
