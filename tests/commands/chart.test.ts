import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { chartFlagSpec } from "../../src/cli/natal-intake";
import { chartCommand, chartUsage } from "../../src/commands/chart";

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
	test("returns the usage string on --help", async () => {
		const result = await chartCommand(["--help"], undefined);
		expect(typeof result).toBe("string");
	});

	test("computes a full natal chart end to end", async () => {
		const result = (await chartCommand(TAMPA_ARGS, undefined)) as {
			chart: {
				birth: { zone: string; year: number };
				bodies: { sun: { sign: string; house: number } };
			};
		};

		expect(result.chart.birth.zone).toBe("America/New_York");
		expect(result.chart.birth.year).toBe(1990);
		expect(result.chart.bodies.sun.sign).toBe("Gemini");
		expect(result.chart.bodies.sun.house).toBe(9);
	});

	test("computes a draconic chart with the North Node at 0° Aries", async () => {
		const result = (await chartCommand(
			[...TAMPA_ARGS, "--draconic"],
			undefined,
		)) as {
			chart: {
				birth: { requested: { draconic: boolean } };
				bodies: { true_node: { sign: string } };
				draconic: {
					nodeUsed: string;
					bodies: { true_node: { sign: string; lon: number } };
				};
			};
		};

		expect(result.chart.birth.requested.draconic).toBe(true);
		expect(result.chart.bodies.true_node.sign).toBe("Aquarius");
		expect(result.chart.draconic.nodeUsed).toBe("true_node");
		expect(result.chart.draconic.bodies.true_node.sign).toBe("Aries");
		expect(result.chart.draconic.bodies.true_node.lon).toBeCloseTo(0, 4);
	});

	test("computes evolutionary features (--eclipses --lots --stars)", async () => {
		const result = (await chartCommand(
			[...TAMPA_ARGS, "--eclipses", "--lots", "--stars"],
			undefined,
		)) as {
			chart: {
				eclipses: { solar?: unknown; lunar?: unknown };
				lots: { spirit: unknown; fortune: unknown };
				stars: unknown[];
			};
		};

		expect(result.chart.eclipses?.solar).toBeDefined();
		expect(result.chart.eclipses?.lunar).toBeDefined();
		expect(result.chart.lots?.spirit).toBeDefined();
		expect(result.chart.lots?.fortune).toBeDefined();
		expect(Array.isArray(result.chart.stars)).toBe(true);
	});

	test("computes the evolutionary reading (--evolutionary)", async () => {
		const result = (await chartCommand(
			[...TAMPA_ARGS, "--evolutionary"],
			undefined,
		)) as {
			chart: {
				evolutionary: {
					pluto: { sign: string };
					polarityPoint: { sign: string };
					skippedSteps: unknown[];
				};
			};
		};

		expect(result.chart.evolutionary?.pluto?.sign).toBeDefined();
		expect(result.chart.evolutionary?.polarityPoint?.sign).toBe("Taurus");
		expect(Array.isArray(result.chart.evolutionary?.skippedSteps)).toBe(true);
	});

	test("throws a structured AxiError for an unknown house system", async () => {
		await expect(
			chartCommand([...TAMPA_ARGS, "--house-system", "foo"], undefined),
		).rejects.toThrow(AxiError);
	});

	test("throws a validation error for an unknown flag", async () => {
		try {
			await chartCommand([...TAMPA_ARGS, "--stat", "closed"], undefined);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test("usage text and flag spec name the same flags", () => {
		const tokens = new Set(
			chartUsage
				.split("\n")
				.flatMap((line) => line.match(/--[a-z][a-z-]*/g) ?? []),
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
