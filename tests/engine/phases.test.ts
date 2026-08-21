import { describe, expect, test } from "bun:test";
import { InMemoryEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal/index";
import { computeSolLunaPhase } from "../../src/engine/natal/phases";

describe("Sol-Luna phase calculation", () => {
	const baseProfile: Profile = {
		id: "00000000-0000-0000-0000-000000000004",
		name: "Phase Test",
		birthPlace: "Test Location",
		birthDateTime: "2000-01-01T12:00Z",
		birthLat: 0,
		birthLon: 0,
		birthJdUt: 2451545.0,
		createdAt: "2026-08-19T00:00:00.000Z",
		updatedAt: "2026-08-19T00:00:00.000Z",
	};

	function chartWithSunMoon(sunLon: number, moonLon: number) {
		const ephemeris = new InMemoryEphemeris({
			chart: {
				julianDay: 2451545.0,
				siderealTime: 0,
				armc: 0,
				vertex: 0,
				eastPoint: 0,
				angles: {
					asc: { lon: 0, sign: "Aries", signDeg: 0, house: 1 },
					mc: { lon: 90, sign: "Cancer", signDeg: 0, house: 10 },
					vertex: { lon: 180, sign: "Libra", signDeg: 0, house: 7 },
					eastPoint: { lon: 270, sign: "Capricorn", signDeg: 0, house: 4 },
				},
				cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
				bodies: {
					pluto: {
						lon: 340,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 30,
						speed: -0.01,
						sign: "Pisces",
						signDeg: 10,
						house: 10,
						dignities: [],
					},
					true_node: {
						lon: 10,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0,
						speed: -0.05,
						sign: "Aries",
						signDeg: 10,
						house: 1,
						dignities: [],
					},
					sun: {
						lon: sunLon,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 1.0,
						speed: 1.0,
						sign: "Aries",
						signDeg: 0,
						house: 1,
						dignities: [],
					},
					moon: {
						lon: moonLon,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0.002,
						speed: 13.0,
						sign: "Aries",
						signDeg: 0,
						house: 1,
						dignities: [],
					},
				},
			} as never,
		});
		return computeNatalChart(baseProfile, ephemeris);
	}

	test("correctly calculates archetypal 8 phases", () => {
		expect(chartWithSunMoon(0, 10).meta.solLunaPhase.name).toBe("New");
		expect(chartWithSunMoon(0, 60).meta.solLunaPhase.name).toBe("Crescent");
		expect(chartWithSunMoon(0, 100).meta.solLunaPhase.name).toBe(
			"First Quarter",
		);
		expect(chartWithSunMoon(0, 150).meta.solLunaPhase.name).toBe("Gibbous");
		expect(chartWithSunMoon(0, 190).meta.solLunaPhase.name).toBe("Full");
		expect(chartWithSunMoon(0, 240).meta.solLunaPhase.name).toBe(
			"Disseminating",
		);
		expect(chartWithSunMoon(0, 290).meta.solLunaPhase.name).toBe(
			"Last Quarter",
		);
		expect(chartWithSunMoon(0, 340).meta.solLunaPhase.name).toBe("Balsamic");
	});

	test("computeSolLunaPhase direct unit calculation", () => {
		expect(computeSolLunaPhase(0, 0)).toBe("New");
		expect(computeSolLunaPhase(0, 44.9)).toBe("New");
		expect(computeSolLunaPhase(0, 45.1)).toBe("Crescent");
		expect(computeSolLunaPhase(100, 280)).toBe("Full");
		expect(computeSolLunaPhase(350, 10)).toBe("New");
	});
});
