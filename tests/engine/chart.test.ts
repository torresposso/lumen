import { describe, expect, test } from "bun:test";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal/index";

describe("computeNatalChart — Golden Vector (Tampa Anchor)", () => {
	const tampaProfile: Profile = {
		id: "4f3a9c2e-8b71-4d0a-9c5e-000000000000",
		name: null,
		birthPlace: "Tampa, Florida, USA",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthLat: 27.9506,
		birthLon: -82.4572,
		birthJdUt: 2448053.270833,
		createdAt: "2026-08-18T00:00:00.000Z",
		updatedAt: "2026-08-18T00:00:00.000Z",
	};

	test("computes exact single-block chart structure matching prototype 02", () => {
		const chart = computeNatalChart(tampaProfile);

		expect(chart.houseSystem).toBe("porphyry");
		expect(chart.zodiac).toBe("tropical");

		// Birth echo
		expect(chart.birth).toEqual({
			id: "4f3a9c2e-8b71-4d0a-9c5e-000000000000",
			name: null,
			birthPlace: "Tampa, Florida, USA",
			birthDateTime: "1990-06-10T14:30-04:00",
			birthLat: 27.9506,
			birthLon: -82.4572,
			birthJdUt: 2448053.270833,
		});

		// Bodies (Porphyry house assignments and positions)
		expect(chart.bodies.sun?.sign).toBe("Gemini");
		expect(chart.bodies.sun?.house).toBe(9);
		expect(chart.bodies.sun?.signDeg).toBeCloseTo(19.6107, 2);

		expect(chart.bodies.moon?.sign).toBe("Capricorn");
		expect(chart.bodies.moon?.house).toBe(4);

		expect(chart.bodies.pluto?.sign).toBe("Scorpio");
		expect(chart.bodies.pluto?.house).toBe(2);
		expect(chart.bodies.pluto?.signDeg).toBeCloseTo(15.501, 2);

		expect(chart.bodies.true_node?.sign).toBe("Aquarius");
		expect(chart.bodies.true_node?.house).toBe(5);
		expect(chart.bodies.true_node?.signDeg).toBeCloseTo(8.1182, 2);

		// Angles
		expect(chart.angles.asc.sign).toBe("Libra");
		expect(chart.angles.asc.signDeg).toBeCloseTo(3.4492, 2);
		expect(chart.angles.mc.sign).toBe("Cancer");
		expect(chart.angles.mc.signDeg).toBeCloseTo(3.5725, 2);

		// Cusps (12 houses)
		expect(chart.cusps.length).toBe(12);
		expect(chart.cusps[0]?.sign).toBe("Libra");
		expect(chart.cusps[9]?.sign).toBe("Cancer");

		// Pluto & PPP
		expect(chart.pluto.sign).toBe("Scorpio");
		expect(chart.pluto.house).toBe(2);
		expect(chart.pluto.stressfulCount).toBe(1);
		expect(chart.pluto.nonstressfulCount).toBe(7);

		expect(chart.ppp.sign).toBe("Taurus");
		expect(chart.ppp.house).toBe(8);
		expect(chart.ppp.active).toBe(true);
		expect(chart.ppp.separation).toBeCloseTo(82.62, 1);

		// Midpoints
		expect(chart.midpoint?.sign).toBe("Sagittarius");
		expect(chart.midpoint?.house).toBe(3);
		expect(chart.antiMidpoint?.sign).toBe("Gemini");
		expect(chart.antiMidpoint?.house).toBe(9);

		// Nodal axis
		expect(chart.nodalAxis.north.sign).toBe("Aquarius");
		expect(chart.nodalAxis.north.house).toBe(5);
		expect(chart.nodalAxis.north.ruler).toBe("uranus");
		expect(chart.nodalAxis.south.sign).toBe("Leo");
		expect(chart.nodalAxis.south.house).toBe(11);
		expect(chart.nodalAxis.south.ruler).toBe("sun");
		expect(chart.nodalAxis.motion).toBe("retrograde");
		expect(chart.nodalAxis.skippedSteps).toEqual([]);

		// Phase
		expect(chart.phase).toBe("Full");

		// Dispositor chains
		expect(chart.dispositorChains.pluto[0]).toEqual({
			body: "pluto",
			sign: "Scorpio",
			ruler: "pluto",
		});

		// Eclipses
		expect(chart.prenatalEclipses.solar?.type).toBe("annular");
		expect(chart.prenatalEclipses.solar?.sign).toBe("Aquarius");
		expect(chart.prenatalEclipses.lunar?.type).toBe("total");
		expect(chart.prenatalEclipses.lunar?.sign).toBe("Leo");

		// Patterns & Signature
		expect(chart.patterns.length).toBeGreaterThan(0);
		expect(chart.signature.elements.earth).toBe(6);
		expect(chart.signature.modalities.cardinal).toBe(6);

		// House rulers
		expect(chart.houseRulers.length).toBe(12);
		expect(chart.houseRulers[0]).toEqual({
			house: 1,
			sign: "Libra",
			ruler: "venus",
		});

		// Counts
		expect(chart.counts.plutoAspects).toBe(8);
		expect(chart.counts.nodeAspects).toBe(9);
		expect(chart.counts.skippedSteps).toBe(0);
		expect(chart.counts.eclipses).toBe(2);

		// Method disclosure
		expect(chart.method).toContain("orbs PLUTO_ASPECTS:");
	});
});
