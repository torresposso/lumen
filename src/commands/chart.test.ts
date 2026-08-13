import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { chartFlagSpec } from "../lib/schema";
import { chartCommand, chartUsage } from "./chart";

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
