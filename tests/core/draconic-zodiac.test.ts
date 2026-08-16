import { describe, expect, test } from "bun:test";
import type { Chart } from "caelus";
import { toDraconicChart } from "../../src/core/classical";

describe("toDraconicChart", () => {
	test("shifts body, angle, and cusp longitudes relative to North Node", () => {
		const inputChart: Chart = {
			jdUt: 2448053.5,
			zodiac: "tropical",
			houseSystem: "placidus",
			houseSystemRequested: "placidus",
			bodies: {
				true_node: {
					lon: 30, // 0° Taurus
					speed: 0,
					retrograde: false,
					sign: "Taurus",
					signDeg: 0,
					lat: 0,
					dist: 1,
					ra: 0,
					dec: 0,
					house: 1,
					dignities: [],
				},
				sun: {
					lon: 60, // 0° Gemini -> shifted by -30 = 30° = 0° Taurus
					speed: 1,
					retrograde: false,
					sign: "Gemini",
					signDeg: 0,
					lat: 0,
					dist: 1,
					ra: 0,
					dec: 0,
					house: 2,
					dignities: [],
				},
			} as unknown as Chart["bodies"],
			unavailable: [],
			angles: {
				asc: 90, // 0° Cancer -> shifted by -30 = 60° = 0° Gemini
				mc: 180,
				vertex: 270,
				eastPoint: 0,
			},
			cusps: [30, 60, 90],
			aspects: [],
		};

		const draconic = toDraconicChart(inputChart, "true");

		expect(draconic.nodeUsed).toBe("true_node");
		expect(draconic.bodies.true_node?.lon).toBe(0);
		expect(draconic.bodies.true_node?.sign).toBe("Aries");

		expect(draconic.bodies.sun?.lon).toBe(30);
		expect(draconic.bodies.sun?.sign).toBe("Taurus");

		expect(draconic.angles.asc).toBe(60);
		expect(draconic.angles.mc).toBe(150);
	});
});
