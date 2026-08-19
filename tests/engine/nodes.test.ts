import { describe, expect, test } from "bun:test";
import { InMemoryEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal";

describe("Nodal axis astrology calculations (JWGEA canon)", () => {
	const baseProfile: Profile = {
		id: "00000000-0000-0000-0000-000000000002",
		name: "Node Test",
		birthPlace: "Test Location",
		birthDateTime: "2000-01-01T12:00Z",
		birthLat: 0,
		birthLon: 0,
		birthJdUt: 2451545.0,
		createdAt: "2026-08-19T00:00:00.000Z",
		updatedAt: "2026-08-19T00:00:00.000Z",
	};

	test("computes North and South nodes, rulers, and detects skipped steps", () => {
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
						lon: 200,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 30,
						speed: -0.01,
						sign: "Libra",
						signDeg: 20,
						house: 7,
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
					mars: {
						lon: 100,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 1.5,
						speed: 0.5,
						sign: "Cancer",
						signDeg: 10,
						house: 4,
						dignities: [],
					},
					venus: {
						lon: 40,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0.7,
						speed: 1.0,
						sign: "Taurus",
						signDeg: 10,
						house: 2,
						dignities: [],
					},
				},
			} as any,
		});

		const chart = computeNatalChart(baseProfile, ephemeris);
		expect(chart.nodalAxis.skippedSteps.length).toBe(1);
		expect(chart.nodalAxis.skippedSteps[0]?.body).toBe("mars");
		expect(chart.nodalAxis.skippedSteps[0]?.aspect).toBe("square");
		expect(chart.nodalAxis.skippedSteps[0]?.orb).toBe(0);

		expect(chart.nodalAxis.north.sign).toBe("Aries");
		expect(chart.nodalAxis.south.sign).toBe("Libra");
		expect(chart.nodalAxis.north.ruler).toBe("mars");
		expect(chart.nodalAxis.south.ruler).toBe("venus");
		expect(chart.nodalAxis.motion).toBe("retrograde");
	});
});
