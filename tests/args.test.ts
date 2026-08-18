import { describe, expect, test } from "bun:test";
import type { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../src/core/args";

const ADD_SPEC: ArgsSpec = {
	known: new Set(["--when", "--offset", "--at", "--birthplace", "--name"]),
	required: new Set(["--when", "--offset", "--at", "--birthplace"]),
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
				"--when",
				"1990-06-10T14:30",
				"--offset=-240",
				"--at",
				"0,0",
				"--birthplace",
				"Tampa, USA",
			],
			ADD_SPEC,
			"lumen profile add",
		);
		expect(parsed.help).toBe(false);
		expect(parsed.flags.get("--when")).toBe("1990-06-10T14:30");
		expect(parsed.flags.get("--offset")).toBe("-240");
		expect(parsed.flags.get("--at")).toBe("0,0");
		expect(parsed.positionals).toEqual([]);
	});

	test("accepts a value starting with a single dash (--offset -240)", () => {
		const parsed = parseArgs(
			["--offset", "-240"],
			{ known: new Set(["--offset"]), positionals: 0 },
			"lumen profile add",
		);
		expect(parsed.flags.get("--offset")).toBe("-240");
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
			parseArgs(["--when", "a", "--when", "b"], ADD_SPEC, "x"),
		).toThrow(/provided more than once/);
	});

	test("rejects a flag without a value", () => {
		expect(() => parseArgs(["--when"], ADD_SPEC, "x")).toThrow(
			/requires a value/,
		);
		expect(() => parseArgs(["--when", "--offset", "1"], ADD_SPEC, "x")).toThrow(
			/requires a value/,
		);
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
			parseArgs(["--when", "a"], ADD_SPEC, "lumen profile add"),
		).toThrow(/Missing required flag --offset/);
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
			expect(all).toContain("Missing required flag --when");
			expect((error as Error).message).toContain("Unknown flag: --bogus");
		}
	});
});
