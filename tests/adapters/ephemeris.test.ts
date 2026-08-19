import { describe, expect, test } from "bun:test";
import {
	CaelusEphemeris,
	InMemoryEphemeris,
} from "../../src/adapters/ephemeris";

describe("CaelusEphemeris adapter", () => {
	const ephemeris = new CaelusEphemeris();

	test("computes chart with Porphyry houses and True Node", () => {
		const jdUt = 2448053.270833;
		const lat = 27.9506;
		const lon = -82.4572;

		const chart = ephemeris.chartAt(jdUt, lat, lon, {
			houseSystem: "porphyry",
			zodiac: "tropical",
			topocentric: true,
		});

		expect(chart.houseSystem).toBe("porphyry");
		expect(chart.cusps.length).toBe(12);
		expect(chart.bodies.pluto).toBeDefined();
		expect(chart.bodies.true_node).toBeDefined();
	});

	test("computes solar and lunar eclipses within a Julian Day window", () => {
		const jdUt = 2448053.270833;
		const solar = ephemeris.solarEclipses(jdUt - 180, jdUt);
		const lunar = ephemeris.lunarEclipses(jdUt - 180, jdUt);

		expect(solar.length).toBeGreaterThan(0);
		expect(lunar.length).toBeGreaterThan(0);
		expect(solar[0]?.tMax).toBeLessThanOrEqual(jdUt);
		expect(lunar[0]?.tMax).toBeLessThanOrEqual(jdUt);
	});

	test("computes declination aspects", () => {
		const jdUt = 2448053.270833;
		const decl = ephemeris.declinationAspects(
			["sun", "moon", "venus", "mars", "jupiter"],
			jdUt,
		);
		expect(Array.isArray(decl)).toBe(true);
	});
});

describe("InMemoryEphemeris adapter", () => {
	test("returns default stub chart with pluto and true_node", () => {
		const mem = new InMemoryEphemeris();
		const chart = mem.chartAt(2448053.27, 27.95, -82.46);
		expect(chart.bodies.pluto).toBeDefined();
		expect(chart.bodies.true_node).toBeDefined();
		expect(mem.solarEclipses(0, 100)).toEqual([]);
		expect(mem.lunarEclipses(0, 100)).toEqual([]);
		expect(mem.declinationAspects(["sun"], 0)).toEqual([]);
	});

	test("accepts custom chart and eclipse fixtures", () => {
		const customSolar = [{ tMax: 100, type: "total" }];
		const customDecl = [{ a: "sun", b: "moon", kind: "parallel" as const }];
		const mem = new InMemoryEphemeris({
			solarEclipses: customSolar as never,
			declinationAspects: customDecl as never,
		});
		expect(mem.solarEclipses(0, 200)).toEqual(customSolar as never);
		expect(mem.declinationAspects(["sun", "moon"], 0)).toEqual(
			customDecl as never,
		);
	});
});
