import { describe, expect, test } from "bun:test";
import type { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../src/core/args";

const ADD_SPEC: ArgsSpec = {
	known: new Set([
		"--birthdatetime",
		"--birthlat",
		"--birthlon",
		"--birthplace",
		"--name",
	]),
	required: new Set([
		"--birthdatetime",
		"--birthlat",
		"--birthlon",
		"--birthplace",
	]),
	positionals: 0,
};

const ID_SPEC: ArgsSpec = {
	known: new Set(),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
};

function code(error: unknown): string {
	return (error as AxiError).code;
}

function suggestions(error: unknown): string[] {
	return (error as AxiError).suggestions ?? [];
}

describe("parseArgs", () => {
	test("parses --flag value and --flag=value forms", () => {
		const parsed = parseArgs(
			[
				"--birthdatetime",
				"1990-06-10T14:30-05:00",
				"--birthlat=-15.5",
				"--birthlon",
				"74.7",
				"--birthplace",
				"Tampa, USA",
			],
			ADD_SPEC,
			"lumen profile add",
		);
		expect(parsed.help).toBe(false);
		expect(parsed.flags.get("--birthdatetime")).toBe("1990-06-10T14:30-05:00");
		expect(parsed.flags.get("--birthlat")).toBe("-15.5");
		expect(parsed.flags.get("--birthlon")).toBe("74.7");
		expect(parsed.flags.get("--birthplace")).toBe("Tampa, USA");
		expect(parsed.positionals).toEqual([]);
	});

	test("accepts a value starting with a single dash (--birthlon -74.75)", () => {
		const parsed = parseArgs(
			["--birthlon", "-74.75"],
			{ known: new Set(["--birthlon"]), positionals: 0 },
			"lumen profile add",
		);
		expect(parsed.flags.get("--birthlon")).toBe("-74.75");
	});

	test("rejects an unknown flag with VALIDATION_ERROR", () => {
		try {
			parseArgs(["--bogus", "1"], ADD_SPEC, "lumen profile add");
			expect.unreachable();
		} catch (error) {
			expect((error as Error).message).toContain("Unknown flag: --bogus");
			expect(code(error)).toBe("VALIDATION_ERROR");
		}
	});

	test("rejects a flag provided more than once", () => {
		expect(() =>
			parseArgs(
				["--birthdatetime", "a", "--birthdatetime", "b"],
				ADD_SPEC,
				"x",
			),
		).toThrow(/provided more than once/);
	});

	test("rejects a flag without a value", () => {
		expect(() => parseArgs(["--birthdatetime"], ADD_SPEC, "x")).toThrow(
			/requires a value/,
		);
		expect(() =>
			parseArgs(["--birthdatetime", "--birthlat", "1"], ADD_SPEC, "x"),
		).toThrow(/requires a value/);
	});

	test("rejects --help=value", () => {
		expect(() => parseArgs(["--help=1"], ADD_SPEC, "x")).toThrow(
			/does not take a value/,
		);
	});

	test("--help anywhere wins and skips all other validation", () => {
		const parsed = parseArgs(["--bogus", "--help"], ADD_SPEC, "x");
		expect(parsed.help).toBe(true);
		expect(parsed.flags.size).toBe(0);
		expect(parsed.positionals).toEqual([]);
	});

	test("reports missing required flags", () => {
		expect(() =>
			parseArgs(["--birthdatetime", "a"], ADD_SPEC, "lumen profile add"),
		).toThrow(/Missing required flag/);
	});

	test("positionals: 0 rejects any positional", () => {
		expect(() => parseArgs(["extra"], ADD_SPEC, "x")).toThrow(
			/Unexpected argument: extra/,
		);
	});

	test("positionals: 1 requires exactly one; reports extra", () => {
		const ok = parseArgs(["abc"], ID_SPEC, "lumen profile get");
		expect(ok.positionals).toEqual(["abc"]);
		expect(() => parseArgs([], ID_SPEC, "lumen profile get")).toThrow(
			/requires a profile id/,
		);
		expect(() => parseArgs(["a", "b"], ID_SPEC, "lumen profile get")).toThrow(
			/Unexpected argument: b/,
		);
	});

	test("a missing required positional carries the hint as a suggestion", () => {
		try {
			parseArgs([], ID_SPEC, "lumen profile get");
			expect.unreachable();
		} catch (error) {
			expect(suggestions(error).join(" ")).toContain(
				"Use the UUID printed by `lumen profile add`",
			);
		}
	});

	test("a flag-shaped token is rejected for no-flag commands", () => {
		expect(() =>
			parseArgs(
				["-x"],
				{ known: new Set(), positionals: 0 },
				"lumen profile list",
			),
		).toThrow(/Unknown flag: -x/);
	});

	test("accumulates every checkable violation in one error", () => {
		try {
			parseArgs(["--bogus", "x"], ADD_SPEC, "lumen profile add");
			expect.unreachable();
		} catch (error) {
			const all = suggestions(error).join(" ");
			expect(all).toContain("Unknown flag: --bogus");
			expect(all).toContain("Unexpected argument: x");
			expect(all).toContain("Missing required flag --birthdatetime");
			expect((error as Error).message).toContain("Unknown flag: --bogus");
		}
	});
});

describe("parseArgs value rules", () => {
	const SPEC: ArgsSpec = {
		known: new Set(["--birthplace", "--name"]),
		required: new Set(["--birthplace"]),
		positionals: 0,
		rules: {
			"--birthplace": { trim: true, nonEmpty: true },
			"--name": { trim: true, emptyAsNull: true },
		},
	};

	test("trims values", () => {
		const parsed = parseArgs(
			["--birthplace", "  Madrid, Spain  "],
			SPEC,
			"lumen profile add",
		);
		expect(parsed.flags.get("--birthplace")).toBe("Madrid, Spain");
	});

	test("nonEmpty: an empty value is a violation", () => {
		try {
			parseArgs(["--birthplace", "   "], SPEC, "lumen profile add");
			expect.unreachable();
		} catch (error) {
			expect((error as Error).message).toContain(
				"Flag --birthplace must not be empty",
			);
			expect(code(error)).toBe("VALIDATION_ERROR");
		}
	});

	test("emptyAsNull: an empty value becomes null", () => {
		const parsed = parseArgs(
			["--birthplace", "Madrid, Spain", "--name", "  "],
			SPEC,
			"lumen profile add",
		);
		expect(parsed.flags.get("--name")).toBeNull();
	});

	test("an absent optional flag stays undefined", () => {
		const parsed = parseArgs(
			["--birthplace", "Madrid, Spain"],
			SPEC,
			"lumen profile add",
		);
		expect(parsed.flags.get("--name")).toBeUndefined();
	});
});
