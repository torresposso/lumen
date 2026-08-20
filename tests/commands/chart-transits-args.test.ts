import { describe, expect, it } from "bun:test";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, parseArgs } from "../../src/cli/args";
import {
	CHART_ARM_HELP,
	CHART_ARMS,
	TRANSIT_FLAGS,
} from "../../src/cli/surface";
import { parseTransitInput } from "../../src/domain/transit-input";

const TEST_TRANSITS_SPEC: ArgsSpec = {
	known: new Set([TRANSIT_FLAGS.when, TRANSIT_FLAGS.where]),
	required: new Set([TRANSIT_FLAGS.when]),
	positionals: 1,
	positionalName: "profile id",
	rules: {
		[TRANSIT_FLAGS.when]: { trim: true, nonEmpty: true },
		[TRANSIT_FLAGS.where]: { trim: true, nonEmpty: true },
	},
};

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
				TEST_TRANSITS_SPEC,
				"lumen chart transits",
			),
		).toThrow(AxiError);
	});

	it("fails when --when is missing", () => {
		expect(() =>
			parseArgs(
				["550e8400-e29b-41d4-a716-446655440000"],
				TEST_TRANSITS_SPEC,
				"lumen chart transits",
			),
		).toThrow(AxiError);
	});

	it("fails when --when is malformed", () => {
		const parsed = parseArgs(
			["550e8400-e29b-41d4-a716-446655440000", "--when", "invalid-date"],
			TEST_TRANSITS_SPEC,
			"lumen chart transits",
		);
		expect(() =>
			parseTransitInput(parsed.flags, {
				when: TRANSIT_FLAGS.when,
				where: TRANSIT_FLAGS.where,
			}),
		).toThrow(AxiError);
	});

	it("parses valid --when without --where", () => {
		const parsed = parseArgs(
			[
				"550e8400-e29b-41d4-a716-446655440000",
				"--when",
				"2026-08-20T12:00-05:00",
			],
			TEST_TRANSITS_SPEC,
			"lumen chart transits",
		);
		const input = parseTransitInput(parsed.flags, {
			when: TRANSIT_FLAGS.when,
			where: TRANSIT_FLAGS.where,
		});
		expect(input.dateTime).toBe("2026-08-20T12:00-05:00");
		expect(input.jdUt).toBeGreaterThan(2460000);
		expect(input.lat).toBeUndefined();
	});

	it("parses valid --when with valid --where", () => {
		const parsed = parseArgs(
			[
				"550e8400-e29b-41d4-a716-446655440000",
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"9.242, -74.755, Magangué, Colombia",
			],
			TEST_TRANSITS_SPEC,
			"lumen chart transits",
		);
		const input = parseTransitInput(parsed.flags, {
			when: TRANSIT_FLAGS.when,
			where: TRANSIT_FLAGS.where,
		});
		expect(input.dateTime).toBe("2026-08-20T12:00-05:00");
		expect(input.lat).toBe(9.242);
		expect(input.lon).toBe(-74.755);
		expect(input.place).toBe("Magangué, Colombia");
	});

	it("fails when --where has invalid coordinates", () => {
		const parsed = parseArgs(
			[
				"550e8400-e29b-41d4-a716-446655440000",
				"--when",
				"2026-08-20T12:00-05:00",
				"--where",
				"999.0, -74.755, Magangué, Colombia",
			],
			TEST_TRANSITS_SPEC,
			"lumen chart transits",
		);
		expect(() =>
			parseTransitInput(parsed.flags, {
				when: TRANSIT_FLAGS.when,
				where: TRANSIT_FLAGS.where,
			}),
		).toThrow(AxiError);
	});
});
