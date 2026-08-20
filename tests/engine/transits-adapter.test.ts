import { describe, expect, it } from "bun:test";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import { parseTransitInput } from "../../src/domain/transit-input";

describe("transits ephemeris calculation & types", () => {
	const ephemeris = new CaelusEphemeris();

	it("computes transiting bodies at a target JD UT with speed and retrograde state", () => {
		const target = parseTransitInput(
			new Map([["--when", "2026-08-20T12:00Z"]]),
			{ when: "--when", where: "--where" },
		);

		// Compute chart at target moment (using 0,0 when no local coords)
		const chart = ephemeris.chartAt(
			target.jdUt,
			target.lat ?? 0,
			target.lon ?? 0,
		);
		expect(chart.bodies).toBeDefined();
		expect(chart.bodies.sun).toBeDefined();
		expect(chart.bodies.pluto).toBeDefined();
		expect(chart.bodies.true_node).toBeDefined();

		const sun = chart.bodies.sun;
		expect(sun.lon).toBeGreaterThanOrEqual(0);
		expect(sun.lon).toBeLessThan(360);
		expect(typeof sun.speed).toBe("number");
	});

	it("computes outOfBounds state for transiting bodies", () => {
		const target = parseTransitInput(
			new Map([["--when", "2026-08-20T12:00Z"]]),
			{ when: "--when", where: "--where" },
		);
		const oob = ephemeris.outOfBounds("moon", target.jdUt);
		expect(typeof oob).toBe("boolean");
	});
});
