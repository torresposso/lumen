import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { parseArgs } from "../../src/cli/args";
import {
	CHART_ARM_HELP,
	CHART_ARMS,
	TRANSIT_FLAGS,
} from "../../src/cli/surface";
import {
	CHART_TRANSITS_SPEC,
	parseTransitInput,
} from "../../src/domain/transit-input";

describe("chart transits CLI surface & args", () => {
	it("exposes surface constants for chart transits", () => {
		expect(CHART_ARMS.transits).toBe(
			'lumen chart transits <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]',
		);
		expect(CHART_ARM_HELP.transits).toContain("planetary transits");
		expect(TRANSIT_FLAGS.when).toBe("--when");
		expect(TRANSIT_FLAGS.where).toBe("--where");
	});

	it("fails parsing when positional UUID is missing", () => {
		expect(() =>
			parseArgs(
				["--when", "2026-08-20T12:00Z"],
				CHART_TRANSITS_SPEC,
				"lumen chart transits",
			),
		).toThrow(AxiError);
	});

	it("fails when --when is missing", () => {
		expect(() =>
			parseArgs(
				["550e8400-e29b-41d4-a716-446655440000"],
				CHART_TRANSITS_SPEC,
				"lumen chart transits",
			),
		).toThrow(AxiError);
	});

	it("fails when --when is malformed", () => {
		const parsed = parseArgs(
			["550e8400-e29b-41d4-a716-446655440000", "--when", "invalid-date"],
			CHART_TRANSITS_SPEC,
			"lumen chart transits",
		);
		expect(() =>
			parseTransitInput(parsed.flags, { when: "--when", where: "--where" }),
		).toThrow(AxiError);
	});

	it("parses valid --when without --where", () => {
		const parsed = parseArgs(
			["550e8400-e29b-41d4-a716-446655440000", "--when", "2026-08-20T12:00Z"],
			CHART_TRANSITS_SPEC,
			"lumen chart transits",
		);
		const target = parseTransitInput(parsed.flags, {
			when: "--when",
			where: "--where",
		});
		expect(target.dateTime).toBe("2026-08-20T12:00Z");
		expect(target.jdUt).toBeGreaterThan(2460000);
		expect(target.lat).toBeUndefined();
		expect(target.lon).toBeUndefined();
		expect(target.place).toBeUndefined();
	});

	it("parses valid --when with valid --where", () => {
		const parsed = parseArgs(
			[
				"550e8400-e29b-41d4-a716-446655440000",
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"40.7128, -74.0060, New York, NY",
			],
			CHART_TRANSITS_SPEC,
			"lumen chart transits",
		);
		const target = parseTransitInput(parsed.flags, {
			when: "--when",
			where: "--where",
		});
		expect(target.dateTime).toBe("2026-08-20T12:00-05:00");
		expect(target.lat).toBeCloseTo(40.7128);
		expect(target.lon).toBeCloseTo(-74.006);
		expect(target.place).toBe("New York, NY");
	});

	it("fails when --where has invalid coordinates", () => {
		const parsed = parseArgs(
			[
				"550e8400-e29b-41d4-a716-446655440000",
				"--when",
				"2026-08-20T12:00Z",
				"--where",
				"not-a-lat, 10, Place",
			],
			CHART_TRANSITS_SPEC,
			"lumen chart transits",
		);
		expect(() =>
			parseTransitInput(parsed.flags, { when: "--when", where: "--where" }),
		).toThrow(AxiError);
	});
});
