import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { assertKnownFlags, deriveFlagSpec, parseFlags } from "./flags";
import { birthSchema, chartFlagSpec, optionsSchema } from "./schema";

const SPEC = {
	value: ["year", "house-system"],
	boolean: ["topocentric"],
} as const;

describe("parseFlags", () => {
	test("parses --flag value pairs", () => {
		const { values, flags, positionals } = parseFlags([
			"--year",
			"1990",
			"--month",
			"6",
		]);
		expect(values).toEqual({ year: "1990", month: "6" });
		expect(flags.size).toBe(0);
		expect(positionals).toEqual([]);
	});

	test("parses --flag=value", () => {
		const { values } = parseFlags(["--year=1990"]);
		expect(values.year).toBe("1990");
	});

	test("parses boolean flags", () => {
		const { flags } = parseFlags(["--topocentric"]);
		expect(flags.has("topocentric")).toBe(true);
	});

	test("stops a value at the next --flag", () => {
		const { flags, values } = parseFlags(["--topocentric", "--help"]);
		expect(flags.has("topocentric")).toBe(true);
		expect(flags.has("help")).toBe(true);
		expect(values).toEqual({});
	});

	test("collects positionals", () => {
		const { positionals } = parseFlags(["chart", "--year", "1990"]);
		expect(positionals).toEqual(["chart"]);
	});
});

describe("assertKnownFlags", () => {
	test("accepts known value and boolean flags", () => {
		const parsed = parseFlags(["--year", "1990", "--topocentric"]);
		expect(() => assertKnownFlags(parsed, SPEC, "chart")).not.toThrow();
	});

	test("rejects unknown flags by name with exit-2 validation error", () => {
		const parsed = parseFlags(["--stat", "closed"]);
		try {
			assertKnownFlags(parsed, SPEC, "chart");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			const axi = error as AxiError;
			expect(axi.code).toBe("VALIDATION_ERROR");
			expect(axi.message).toContain("--stat");
			expect(axi.suggestions[0]).toContain("--year");
		}
	});

	test("rejects unknown value flags from --flag=value", () => {
		const parsed = parseFlags(["--zodiac=sidereal:lahiri"]);
		expect(() => assertKnownFlags(parsed, SPEC, "chart")).toThrow(AxiError);
	});

	test("rejects positionals", () => {
		const parsed = parseFlags(["extra"]);
		expect(() => assertKnownFlags(parsed, SPEC, "chart")).toThrow(AxiError);
	});

	test("allows --help unconditionally", () => {
		const parsed = parseFlags(["--help"]);
		expect(() => assertKnownFlags(parsed, SPEC, "chart")).not.toThrow();
	});
});

describe("deriveFlagSpec", () => {
	test("derives value flags from schema keys and kebab-cases them", () => {
		const spec = deriveFlagSpec([{ shape: { houseSystem: {}, year: {} } }], {
			value: ["when"],
			boolean: ["topocentric"],
		});
		expect([...spec.value].sort()).toEqual(
			["house-system", "when", "year"].sort(),
		);
		expect([...spec.boolean]).toEqual(["topocentric"]);
	});

	test("chart flag spec covers exactly the schema keys plus intake extras", () => {
		const schemaKeys = [
			...Object.keys(birthSchema.shape),
			...Object.keys(optionsSchema.shape),
		].map((key) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));

		expect([...chartFlagSpec.value].sort()).toEqual(
			[...schemaKeys, "when", "place"].sort(),
		);
		expect([...chartFlagSpec.boolean].sort()).toEqual(["topocentric"]);
	});
});
