import { describe, expect, test } from "bun:test";
import { InMemoryEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal/index";

describe("Patterns and Signature calculations", () => {
	const baseProfile: Profile = {
		id: "00000000-0000-0000-0000-000000000003",
		name: "Signature Test",
		birthPlace: "Test Location",
		birthDateTime: "2000-01-01T12:00Z",
		birthLat: 0,
		birthLon: 0,
		birthJdUt: 2451545.0,
		createdAt: "2026-08-19T00:00:00.000Z",
		updatedAt: "2026-08-19T00:00:00.000Z",
	};

	test("calculates quadrant and hemisphere balance", () => {
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
						lon: 10,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 1.0,
						speed: 1.0,
						sign: "Aries",
						signDeg: 10,
						house: 1,
						dignities: [],
					},
					moon: {
						lon: 40,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0.002,
						speed: 13.0,
						sign: "Taurus",
						signDeg: 10,
						house: 2,
						dignities: [],
					},
					mars: {
						lon: 200,
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 1.5,
						speed: 0.5,
						sign: "Libra",
						signDeg: 20,
						house: 7,
						dignities: [],
					},
				},
			} as never,
		});

		const chart = computeNatalChart(baseProfile, ephemeris);
		expect(chart.signature.elements.fire).toBe(1);
		expect(chart.signature.elements.earth).toBe(1);
		expect(chart.signature.elements.air).toBe(1);
		expect(chart.signature.elements.water).toBe(1);
		expect(chart.signature.quadrants.q1).toBe(2);
		expect(chart.signature.quadrants.q3).toBe(1);
		expect(chart.signature.quadrants.q4).toBe(1);
		expect(chart.signature.hemispheres.eastern).toBe(3);
		expect(chart.signature.hemispheres.western).toBe(1);
	});
});
