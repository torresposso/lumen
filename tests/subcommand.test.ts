import { describe, expect, test } from "bun:test";
import type { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../src/cli/args";
import { createSubcommandGroup, runSubcommand } from "../src/cli/subcommand";

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
			{},
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
		const result = await runSubcommand({}, [], "x", {
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
		const result = await runSubcommand({}, [], "x", {
			spec: { known: new Set(), positionals: 0 },
			usage: "",
			run: async () => ({ async: true }),
		});
		expect(result).toEqual({ async: true });
	});
});

describe("createSubcommandGroup", () => {
	const group = createSubcommandGroup({
		name: "lumen profile",
		usage: "lumen profile usage",
		subcommands: {
			list: {
				spec: { known: new Set(), positionals: 0 },
				usage: "usage for list",
				run: () => ({ profiles: [] }),
			},
			get: {
				spec: { known: new Set(), positionals: 1 },
				usage: "usage for get",
				run: (parsed) => ({ id: parsed.positionals[0] }),
			},
		},
	});

	test("returns group usage when called without args or with --help", async () => {
		expect(await group([], undefined)).toBe("lumen profile usage");
		expect(await group(["--help"], undefined)).toBe("lumen profile usage");
	});

	test("the help-wins rule holds at the group seam: an unknown arm plus --help returns group usage, never an error", async () => {
		expect(await group(["bogus", "--help"], undefined)).toBe(
			"lumen profile usage",
		);
		expect(await group(["--help", "bogus"], undefined)).toBe(
			"lumen profile usage",
		);
	});

	test("--help before a known arm falls back to group usage", async () => {
		expect(await group(["--help", "list"], undefined)).toBe(
			"lumen profile usage",
		);
	});

	test("dispatches to the named subcommand", async () => {
		expect(await group(["list"], {})).toEqual({ profiles: [] });
		expect(await group(["get", "abc-123"], {})).toEqual({
			id: "abc-123",
		});
	});

	test("subcommand --help returns subcommand usage", async () => {
		expect(await group(["list", "--help"], undefined)).toBe("usage for list");
	});

	test("rejects unknown subcommands with VALIDATION_ERROR", async () => {
		try {
			await group(["bogus"], undefined);
			expect.unreachable();
		} catch (error) {
			expect(code(error)).toBe("VALIDATION_ERROR");
			expect((error as Error).message).toBe("Unknown profile command: bogus");
			expect(suggestions(error)).toEqual([
				"Run `lumen profile --help` for usage",
			]);
		}
	});
});
