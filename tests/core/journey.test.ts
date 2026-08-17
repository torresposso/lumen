import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { computeProgressions, computeStations } from "../../src/core/journey";
import type { NatalRequest, ResolvedBirth } from "../../src/core/types";

describe("core/journey", () => {
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
	const request: NatalRequest = {
		birth,
		options: {
			houseSystem: "placidus",
			zodiac: "tropical",
			bodies: [],
			topocentric: false,
			draconic: false,
		},
	};

	it("computes secondary progressions and age", () => {
		const targetJd = julianDay(2026, 8, 13);
		const result = computeProgressions(
			request,
			targetJd,
			"2026-08-13",
			ephemeris,
			["moon", "sun", "pluto"],
		);

		expect(result.natalDate).toBe("1981-01-26");
		expect(result.targetDate).toBe("2026-08-13");
		expect(result.ageYears).toBeGreaterThan(45);
		expect(result.bodies).toHaveLength(3);
		expect(result.solLunaPhase).toBeDefined();
	});

	it("computes stations for a body within time window", () => {
		const stations = computeStations(request, "mercury", ephemeris, 1, 10);
		expect(stations.body).toBe("mercury");
		expect(stations.stations.length).toBeGreaterThan(0);
	});
});
