import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { computeClassicalProjections } from "../../src/core/classical";
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

	it("computes unified classical projections (draconic, lots, stars)", () => {
		const chart = ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon);
		const projections = computeClassicalProjections(chart, birth, ephemeris, {
			draconic: true,
			lots: true,
			stars: true,
		});

		expect(projections.draconic).toBeDefined();
		expect(projections.lots).toBeDefined();
		expect(projections.stars).toBeDefined();
	});
});
