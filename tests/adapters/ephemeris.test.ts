import { describe, expect, test } from "bun:test";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";

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
		expect(solar[0].tMax).toBeLessThanOrEqual(jdUt);
		expect(lunar[0].tMax).toBeLessThanOrEqual(jdUt);
	});
});
