import { describe, expect, test } from "bun:test";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeNatalChart } from "../../src/engine/natal/index";

describe("computeNatalChart — Golden Vector (Tampa Anchor)", () => {
	const ephemeris = new CaelusEphemeris();
	const tampaProfile: Profile = {
		id: "4f3a9c2e-8b71-4d0a-9c5e-000000000000",
		name: "Tampa",
		birthPlace: "Tampa, Florida, USA",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthLat: 27.9506,
		birthLon: -82.4572,
		birthJdUt: 2448053.270833,
		createdAt: "2026-08-18T00:00:00.000Z",
		updatedAt: "2026-08-18T00:00:00.000Z",
	};

	test("computes exact single-block chart structure matching prototype 02", () => {
		const chart = computeNatalChart(tampaProfile, ephemeris);

		// Meta
		expect(chart.meta.houseSystem).toBe("porphyry");
		expect(chart.meta.zodiac).toBe("tropical");
		expect(chart.meta.ephemeris).toContain("caelus");
		expect(chart.meta.solLunaPhase).toEqual({
			name: "Full",
			number: 5,
			angle: expect.closeTo(205.52, 1),
			isWaxing: false,
		});

		// Birth echo
		expect(chart.birth).toEqual({
			id: "4f3a9c2e-8b71-4d0a-9c5e-000000000000",
			name: "Tampa",
			birthPlace: "Tampa, Florida, USA",
			birthDateTime: "1990-06-10T14:30-04:00",
			birthLat: 27.9506,
			birthLon: -82.4572,
			birthJdUt: 2448053.270833,
		});

		// Bodies (Physical planetary bodies only, pruned coordinates)
		expect(chart.bodies.sun?.sign).toBe("Gemini");
		expect(chart.bodies.sun?.house).toBe(9);
		expect(chart.bodies.sun?.signDeg).toBeCloseTo(19.6107, 2);
		expect(chart.bodies.sun?.outOfBounds).toBe(false);
		expect("lat" in (chart.bodies.sun ?? {})).toBe(false);
		expect("ra" in (chart.bodies.sun ?? {})).toBe(false);
		expect("dist" in (chart.bodies.sun ?? {})).toBe(false);

		expect(chart.bodies.moon?.sign).toBe("Capricorn");
		expect(chart.bodies.moon?.house).toBe(4);
		expect(chart.bodies.moon?.outOfBounds).toBe(true);

		expect(chart.bodies.pluto?.sign).toBe("Scorpio");
		expect(chart.bodies.pluto?.house).toBe(2);
		expect(chart.bodies.pluto?.signDeg).toBeCloseTo(15.501, 2);
		expect(chart.bodies.pluto?.outOfBounds).toBe(false);

		// Non-physical points are partitioned out of bodies
		expect("true_node" in chart.bodies).toBe(false);
		expect("true_lilith" in chart.bodies).toBe(false);

		// Angles
		expect(chart.angles.asc.sign).toBe("Libra");
		expect(chart.angles.asc.signDeg).toBeCloseTo(3.4492, 2);
		expect(chart.angles.mc.sign).toBe("Cancer");
		expect(chart.angles.mc.signDeg).toBeCloseTo(3.5725, 2);

		// Cusps (12 houses with attached ruler)
		expect(chart.cusps.length).toBe(12);
		expect(chart.cusps[0]?.house).toBe(1);
		expect(chart.cusps[0]?.sign).toBe("Libra");
		expect(chart.cusps[0]?.ruler).toBe("venus");
		expect(chart.cusps[9]?.sign).toBe("Cancer");
		expect(chart.cusps[9]?.ruler).toBe("moon");

		// Evolutionary core
		expect(chart.evolutionary.ppp.sign).toBe("Taurus");
		expect(chart.evolutionary.ppp.house).toBe(8);
		expect(chart.evolutionary.ppp.active).toBe(true);
		expect(chart.evolutionary.ppp.separationFromNorthNode).toBeCloseTo(
			82.62,
			1,
		);

		// Midpoints
		expect(chart.evolutionary.plutoNorthNodeMidpoint.near.sign).toBe(
			"Sagittarius",
		);
		expect(chart.evolutionary.plutoNorthNodeMidpoint.near.house).toBe(3);
		expect(chart.evolutionary.plutoNorthNodeMidpoint.anti.sign).toBe("Gemini");
		expect(chart.evolutionary.plutoNorthNodeMidpoint.anti.house).toBe(9);

		// Nodal axis
		expect(chart.evolutionary.nodalAxis.north.sign).toBe("Aquarius");
		expect(chart.evolutionary.nodalAxis.north.house).toBe(5);
		expect(chart.evolutionary.nodalAxis.north.ruler).toBe("uranus");
		expect(chart.evolutionary.nodalAxis.south.sign).toBe("Leo");
		expect(chart.evolutionary.nodalAxis.south.house).toBe(11);
		expect(chart.evolutionary.nodalAxis.south.ruler).toBe("sun");
		expect(chart.evolutionary.nodalAxis.motion).toBe("retrograde");
		expect(chart.evolutionary.skippedSteps).toEqual([]);

		// Soul Lots (7 Hermetic lots)
		expect(chart.evolutionary.soulLots.isDay).toBe(true);
		expect(chart.evolutionary.soulLots.fortune.sign).toBe("Aries");
		expect(chart.evolutionary.soulLots.spirit.sign).toBe("Pisces");
		expect(chart.evolutionary.soulLots.eros.sign).toBeDefined();

		// True Lilith in evolutionary
		expect(chart.evolutionary.trueLilith.sign).toBe("Sagittarius");
		expect(chart.evolutionary.trueLilith.house).toBe(3);
		expect(chart.evolutionary.trueLilith.outOfBounds).toBe(true);

		// Dispositor chains
		expect(chart.evolutionary.dispositorChains.pluto.terminalType).toBe(
			"final_dispositor",
		);
		expect(chart.evolutionary.dispositorChains.pluto.terminalBodies).toEqual([
			"pluto",
		]);

		// Eclipses with daysBeforeBirth
		expect(chart.evolutionary.prenatalEclipses.solar?.type).toBe("annular");
		expect(chart.evolutionary.prenatalEclipses.solar?.sign).toBe("Aquarius");
		expect(
			chart.evolutionary.prenatalEclipses.solar?.daysBeforeBirth,
		).toBeGreaterThan(0);
		expect(chart.evolutionary.prenatalEclipses.lunar?.type).toBe("total");
		expect(chart.evolutionary.prenatalEclipses.lunar?.sign).toBe("Leo");
		expect(
			chart.evolutionary.prenatalEclipses.lunar?.daysBeforeBirth,
		).toBeGreaterThan(0);

		// Patterns (pruned nulls) & Signature
		expect(chart.patterns.length).toBeGreaterThan(0);
		for (const pattern of chart.patterns) {
			expect("apex" in pattern && pattern.apex === null).toBe(false);
		}
		expect(chart.signature.elements.earth).toBe(6);
		expect(chart.signature.modalities.cardinal).toBe(6);
	});
});
