import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { toDraconicChart } from "../../src/core/classical";
import type { ResolvedBirth } from "../../src/core/types";

describe("core/classical", () => {
	const ephemeris = new CaelusEphemeris();
	const birth: ResolvedBirth = {
		jdUt: julianDay(1981, 1, 26),
		lat: 9.24,
		lon: -74.75,
		local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
		zone: "America/Bogota",
		offsetMinutes: -300,
		dst: false,
		status: "ok",
	};

	it("projects the chart onto the draconic zodiac (0° Aries North Node)", () => {
		const chart = ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon);
		const draconic = toDraconicChart(chart);

		expect(draconic.nodeUsed).toBe("true_node");
		expect(draconic.bodies.true_node?.lon).toBeCloseTo(0, 4);
		expect(draconic.bodies.true_node?.sign).toBe("Aries");
		expect(draconic.bodies.sun?.sign).toBeDefined();
	});
});
