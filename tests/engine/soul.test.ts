import { describe, expect, test } from "bun:test";
import { InMemoryEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computePrenatalEclipses } from "../../src/engine/natal/eclipses";
import { computeNatalChart } from "../../src/engine/natal/index";
import { computeSoulLots } from "../../src/engine/natal/soul-lots";

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

	test("computeSoulLots calculates Hermetic Lots of Fortune and Spirit for diurnal and nocturnal charts", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

		// Diurnal chart: Sun in House 10 (upper hemisphere, diurnal)
		// Asc = 0 (Aries 0°), Sun = 90 (Cancer 0°), Moon = 120 (Leo 0°)
		// Diurnal:
		// Fortune = Asc + Moon - Sun = 0 + 120 - 90 = 30° (Taurus 0°, House 2)
		// Spirit = Asc + Sun - Moon = 0 + 90 - 120 = -30 = 330° (Pisces 0°, House 12)
		const diurnalChart = {
			angles: { asc: { lon: 0 } },
			bodies: {
				sun: { lon: 90, house: 10 },
				moon: { lon: 120, house: 11 },
			},
		} as any;

		const diurnalLots = computeSoulLots(diurnalChart, cusps);
		expect(diurnalLots.isDay).toBe(true);
		expect(diurnalLots.fortune.lon).toBe(30);
		expect(diurnalLots.fortune.sign).toBe("Taurus");
		expect(diurnalLots.spirit.lon).toBe(330);
		expect(diurnalLots.spirit.sign).toBe("Pisces");
		expect(diurnalLots.eros).toBeDefined();
		expect(diurnalLots.necessity).toBeDefined();
		expect(diurnalLots.courage).toBeDefined();
		expect(diurnalLots.victory).toBeDefined();
		expect(diurnalLots.nemesis).toBeDefined();

		// Nocturnal chart: Sun in House 4 (lower hemisphere, nocturnal)
		// Nocturnal reverses the formula:
		// Fortune = Asc + Sun - Moon = 0 + 90 - 120 = 330° (Pisces 0°)
		// Spirit = Asc + Moon - Sun = 0 + 120 - 90 = 30° (Taurus 0°)
		const nocturnalChart = {
			angles: { asc: { lon: 0 } },
			bodies: {
				sun: { lon: 90, house: 4 },
				moon: { lon: 120, house: 5 },
			},
		} as any;

		const nocturnalLots = computeSoulLots(nocturnalChart, cusps);
		expect(nocturnalLots.isDay).toBe(false);
		expect(nocturnalLots.fortune.lon).toBe(330);
		expect(nocturnalLots.fortune.sign).toBe("Pisces");
		expect(nocturnalLots.spirit.lon).toBe(30);
		expect(nocturnalLots.spirit.sign).toBe("Taurus");
		expect(nocturnalLots.eros).toBeDefined();
		expect(nocturnalLots.necessity).toBeDefined();
		expect(nocturnalLots.courage).toBeDefined();
		expect(nocturnalLots.victory).toBeDefined();
		expect(nocturnalLots.nemesis).toBeDefined();
	});

	test("computes shadow antiscia for Pluto, PPP, and Nodal Axis", () => {
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
						lon: 100, // Cancer 10° -> Antiscion = 180 - 100 = 80° (Gemini 20°)
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
						lon: 40, // Taurus 10° -> Antiscion = 180 - 40 = 140° (Leo 20°)
						lat: 0,
						ra: 0,
						dec: 0,
						dist: 0,
						speed: -0.05,
						sign: "Taurus",
						signDeg: 10,
						house: 2,
						dignities: [],
					},
				},
			} as any,
		});

		const chart = computeNatalChart(baseProfile, ephemeris);
		expect(chart.pluto.antiscia).toBeDefined();
		expect(chart.pluto.antiscia?.antiscion.lon).toBe(80);
		expect(chart.pluto.antiscia?.antiscion.sign).toBe("Gemini");
		expect(chart.pluto.antiscia?.contraAntiscion.lon).toBe(260);

		expect(chart.ppp.antiscia).toBeDefined();
		expect(chart.nodalAxis.north.antiscia).toBeDefined();
		expect(chart.nodalAxis.north.antiscia?.antiscion.lon).toBe(140);
		expect(chart.nodalAxis.north.antiscia?.antiscion.sign).toBe("Leo");
		expect(chart.nodalAxis.south.antiscia).toBeDefined();
	});

	test("computePrenatalEclipses finds solar eclipse in expanded window (>180 days)", () => {
		const birthJd = 2451545.0;
		const eclipseJd = birthJd - 195; // 195 days before birth

		const ephemeris = new InMemoryEphemeris({
			solarEclipses: (jdStart: number, jdEnd: number) => {
				if (jdStart <= eclipseJd && jdEnd >= eclipseJd) {
					return [{ tMax: eclipseJd, type: "total" } as any];
				}
				return [];
			},
			chart: {
				julianDay: eclipseJd,
				jdUt: eclipseJd,
				bodies: {
					sun: {
						lon: 50,
						lat: 0,
						speed: 1.0,
						sign: "Taurus",
						signDeg: 20,
						house: 2,
						dignities: [],
					},
					moon: {
						lon: 50,
						lat: 0,
						speed: 13.0,
						sign: "Taurus",
						signDeg: 20,
						house: 2,
						dignities: [],
					},
					pluto: {
						lon: 200,
						lat: 0,
						speed: -0.01,
						sign: "Libra",
						signDeg: 20,
						house: 7,
						dignities: [],
					},
					true_node: {
						lon: 40,
						lat: 0,
						speed: -0.05,
						sign: "Taurus",
						signDeg: 10,
						house: 2,
						dignities: [],
					},
				},
				cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
				angles: { asc: 0, mc: 90, vertex: 180, eastPoint: 270 },
			} as any,
		});

		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		const result = computePrenatalEclipses(ephemeris, birthJd, 0, 0, cusps);
		expect(result.solar).toBeDefined();
		expect(result.solar?.type).toBe("total");
	});
});
