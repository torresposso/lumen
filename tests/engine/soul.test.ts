import { describe, expect, test } from "bun:test";
import { InMemoryEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal";

describe("Soul astrology calculations (JWGEA canon)", () => {
	const baseProfile: Profile = {
		id: "00000000-0000-0000-0000-000000000001",
		name: "Soul Test",
		birthPlace: "Test Location",
		birthDateTime: "2000-01-01T12:00Z",
		birthLat: 0,
		birthLon: 0,
		birthJdUt: 2451545.0,
		createdAt: "2026-08-19T00:00:00.000Z",
		updatedAt: "2026-08-19T00:00:00.000Z",
	};

	test("deactivates PPP when Pluto is conjunct North Node within 3 degrees", () => {
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
						lon: 100,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 30,
						speed: -0.01,
						sign: "Cancer",
						signDeg: 10,
						house: 4,
						dignities: [],
					},
					true_node: {
						lon: 102,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0,
						speed: -0.05,
						sign: "Cancer",
						signDeg: 12,
						house: 4,
						dignities: [],
					},
				},
			} as any,
		});

		const chart = computeNatalChart(baseProfile, ephemeris);
		expect(chart.ppp.active).toBe(false);
		expect(chart.ppp.separation).toBe(2);
		expect(chart.ppp.reason).toContain("pluto conjunct north node");
	});

	test("keeps PPP active when Pluto is separated from North Node by more than 3 degrees", () => {
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
						lon: 100,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 30,
						speed: -0.01,
						sign: "Cancer",
						signDeg: 10,
						house: 4,
						dignities: [],
					},
					true_node: {
						lon: 104,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0,
						speed: -0.05,
						sign: "Cancer",
						signDeg: 14,
						house: 4,
						dignities: [],
					},
				},
			} as any,
		});

		const chart = computeNatalChart(baseProfile, ephemeris);
		expect(chart.ppp.active).toBe(true);
		expect(chart.ppp.separation).toBe(4);
	});
});
