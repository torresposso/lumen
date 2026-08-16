import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { chartCommand } from "../../src/commands/chart";
import { chartFlagSpec } from "../../src/commands/intake";

const TAMPA_ARGS = [
	"--year",
	"1990",
	"--month",
	"6",
	"--day",
	"10",
	"--hour",
	"14",
	"--minute",
	"30",
	"--lat",
	"27.95",
	"--lon",
	"-82.46",
];

describe("chartCommand", () => {
	test("returns the usage string on bare invocation", async () => {
		const result = await chartCommand([], undefined);
		expect(typeof result).toBe("string");
		expect(result).toContain("lumen chart natal");
		expect(result).toContain("lumen chart draconic");
	});

	test("returns the usage string on --help", async () => {
		const result = await chartCommand(["--help"], undefined);
		expect(typeof result).toBe("string");
	});

	test("returns per-mode usage on subcommand --help", async () => {
		const result = await chartCommand(["draconic", "--help"], undefined);
		expect(typeof result).toBe("string");
		expect(result).toContain("lumen chart draconic");
	});

	test("rejects flags without a subcommand (no default mode)", async () => {
		try {
			await chartCommand(TAMPA_ARGS, undefined);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test("computes a full natal chart end to end", async () => {
		const result = (await chartCommand(
			["natal", ...TAMPA_ARGS],
			undefined,
		)) as {
			chart: {
				birth: { zone: string; year: number };
				bodies: { sun: { sign: string; house: number } };
				evolutionary?: unknown;
			};
		};

		expect(result.chart.birth.zone).toBe("America/New_York");
		expect(result.chart.birth.year).toBe(1990);
		expect(result.chart.bodies.sun.sign).toBe("Gemini");
		expect(result.chart.bodies.sun.house).toBe(9);
		expect(result.chart.evolutionary).toBeUndefined();
	});

	test("computes a draconic chart with the North Node at 0° Aries", async () => {
		const result = (await chartCommand(
			["draconic", ...TAMPA_ARGS],
			undefined,
		)) as {
			chart: {
				birth: { requested: { draconic: boolean } };
				bodies: { true_node: { sign: string } };
				draconic: {
					nodeUsed: string;
					bodies: { true_node: { sign: string; lon: number } };
				};
				evolutionary?: unknown;
			};
		};

		expect(result.chart.birth.requested.draconic).toBe(true);
		expect(result.chart.bodies.true_node.sign).toBe("Aquarius");
		expect(result.chart.draconic.nodeUsed).toBe("true_node");
		expect(result.chart.draconic.bodies.true_node.sign).toBe("Aries");
		expect(result.chart.draconic.bodies.true_node.lon).toBeCloseTo(0, 4);
		expect(result.chart.evolutionary).toBeUndefined();
	});

	test("rejects unknown chart subcommands", async () => {
		await expect(chartCommand(["bogus"], undefined)).rejects.toBeInstanceOf(
			AxiError,
		);
		await expect(
			chartCommand(["bogus", "--help"], undefined),
		).rejects.toBeInstanceOf(AxiError);
	});

	test("throws a structured AxiError for an unknown house system", async () => {
		await expect(
			chartCommand(
				["natal", ...TAMPA_ARGS, "--house-system", "foo"],
				undefined,
			),
		).rejects.toThrow(AxiError);
	});

	test("classifies invalid flag values as validation errors", async () => {
		const cases = [
			["natal", ...TAMPA_ARGS, "--house-system", "foo"],
			["natal", ...TAMPA_ARGS, "--zodiac", "sidereal"],
			["natal", "--when", "nope", "--lat", "27.95", "--lon", "-82.46"],
			["natal", ...TAMPA_ARGS, "--topocentric=maybe"],
			["natal", "--when", "1990-06-10T14:30"],
		];

		for (const args of cases) {
			try {
				await chartCommand(args, undefined);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AxiError);
				expect((error as AxiError).code).toBe("VALIDATION_ERROR");
			}
		}
	});

	test("throws a validation error for an unknown flag", async () => {
		try {
			await chartCommand(
				["natal", ...TAMPA_ARGS, "--stat", "closed"],
				undefined,
			);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test.each([
		"--lots",
		"--stars",
		"--eclipses",
		"--draconic",
		"--evolutionary",
	])("rejects removed flag %s as unknown", async (flag) => {
		try {
			await chartCommand(["natal", ...TAMPA_ARGS, flag], undefined);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test("usage text and flag spec name the same flags", async () => {
		const help = (await chartCommand(["natal", "--help"], undefined)) as string;
		const tokens = new Set(
			help.split("\n").flatMap((line) => line.match(/--[a-z][a-z-]*/g) ?? []),
		);
		const known = new Set([
			...chartFlagSpec.value,
			...chartFlagSpec.boolean,
			"help",
		]);

		for (const token of tokens) {
			expect(known.has(token.slice(2))).toBe(true);
		}
		for (const flag of [...chartFlagSpec.value, ...chartFlagSpec.boolean]) {
			expect(tokens.has(`--${flag}`)).toBe(true);
		}
	});
});
