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

	test("computes out-of-bounds status, planetary returns, progressions, and photometrics", () => {
		const jdUt = 2448053.270833;
		expect(ephemeris.outOfBounds("moon", jdUt)).toBe(true);
		expect(ephemeris.outOfBounds("sun", jdUt)).toBe(false);

		const saturnReturns = ephemeris.returns(
			"saturn",
			jdUt,
			jdUt + 365.25 * 28,
			jdUt + 365.25 * 31,
		);
		expect(saturnReturns.length).toBeGreaterThan(0);

		const progSun = ephemeris.progressedLongitude(
			"sun",
			jdUt,
			jdUt + 365.25 * 30,
		);
		expect(progSun).toBeGreaterThan(0);

		const moonPheno = ephemeris.pheno("moon", jdUt);
		expect(moonPheno.phase).toBeGreaterThan(0.9);
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
		expect(mem.outOfBounds("sun", 0)).toBe(false);
		expect(mem.returns("saturn", 0, 10, 20)).toEqual([]);
		expect(mem.progressedLongitude("sun", 0, 100)).toBe(0);
		expect(mem.pheno("moon", 0).phase).toBe(1);
	});

	test("accepts custom chart, eclipse, and timing fixtures", () => {
		const customSolar = [{ tMax: 100, type: "total" }];
		const customDecl = [{ a: "sun", b: "moon", kind: "parallel" as const }];
		const mem = new InMemoryEphemeris({
			solarEclipses: customSolar as never,
			declinationAspects: customDecl as never,
			outOfBounds: true,
			returns: [12345],
			progressedLongitude: 180.5,
			pheno: {
				phaseAngle: 10,
				phase: 0.5,
				elongation: 20,
				diameter: 0.5,
				magnitude: -10,
			},
		});
		expect(mem.solarEclipses(0, 200)).toEqual(customSolar as never);
		expect(mem.declinationAspects(["sun", "moon"], 0)).toEqual(
			customDecl as never,
		);
		expect(mem.outOfBounds("sun", 0)).toBe(true);
		expect(mem.returns("sun", 0, 10, 20)).toEqual([12345]);
		expect(mem.progressedLongitude("sun", 0, 10)).toBe(180.5);
		expect(mem.pheno("moon", 0).phase).toBe(0.5);
	});
});
