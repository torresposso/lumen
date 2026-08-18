import { describe, expect, test } from "bun:test";
import type { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../src/core/args";
import { runSubcommand } from "../src/core/subcommand";

const SPEC: ArgsSpec = {
	known: new Set(["--when", "--where"]),
	required: new Set(["--when"]),
	positionals: 0,
};

function code(error: unknown): string {
	return (error as AxiError).code;
}

function suggestions(error: unknown): string[] {
	return (error as AxiError).suggestions ?? [];
}

describe("runSubcommand", () => {
	test("--help returns the usage without running the arm", async () => {
		let ran = false;
		const result = await runSubcommand(
			undefined,
			["--help"],
			"lumen profile add",
			{
				spec: SPEC,
				usage: "usage for add",
				run: () => {
					ran = true;
					return {};
				},
			},
		);
		expect(result).toBe("usage for add");
		expect(ran).toBe(false);
	});

	test("parse violations throw one VALIDATION_ERROR citing the command", async () => {
		try {
			await runSubcommand(undefined, ["--bogus", "1"], "lumen profile add", {
				spec: SPEC,
				usage: "",
				run: () => ({}),
			});
			expect.unreachable();
		} catch (error) {
			expect(code(error)).toBe("VALIDATION_ERROR");
			expect((error as Error).message).toContain("Unknown flag: --bogus");
			expect(suggestions(error).join(" ")).toContain(
				"Run `lumen profile add --help`",
			);
		}
	});

	test("run receives the parsed flags and its result passes through", async () => {
		const result = await runSubcommand(
			undefined,
			["--when", "a", "--where=b"],
			"lumen profile add",
			{
				spec: SPEC,
				usage: "",
				run: (parsed) => ({
					seen: parsed.flags.get("--when"),
					second: parsed.flags.get("--where"),
				}),
			},
		);
		expect(result).toEqual({ seen: "a", second: "b" });
	});

	test("a string result passes through", async () => {
		const result = await runSubcommand(undefined, [], "x", {
			spec: { known: new Set(), positionals: 0 },
			usage: "",
			run: () => "some text",
		});
		expect(result).toBe("some text");
	});

	test("run receives the context when provided", async () => {
		const context = { answer: 42 };
		const result = await runSubcommand(context, [], "x", {
			spec: { known: new Set(), positionals: 0 },
			usage: "",
			run: (_parsed, ctx) => (ctx === context ? { ok: true } : { ok: false }),
		});
		expect(result).toEqual({ ok: true });
	});

	test("an async arm is awaited", async () => {
		const result = await runSubcommand(undefined, [], "x", {
			spec: { known: new Set(), positionals: 0 },
			usage: "",
			run: async () => ({ async: true }),
		});
		expect(result).toEqual({ async: true });
	});
});
