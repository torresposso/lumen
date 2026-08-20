import { describe, expect, it } from "bun:test";
import { extractNatalPoints } from "../../src/engine/shared/natal-points";
import {
	computeTransitAspects,
	isOuterBody,
} from "../../src/engine/transits/aspects";

describe("transits aspect calculations", () => {
	it("detects outer vs inner bodies", () => {
		expect(isOuterBody("sun")).toBe(false);
		expect(isOuterBody("mars")).toBe(false);
		expect(isOuterBody("jupiter")).toBe(true);
		expect(isOuterBody("pluto")).toBe(true);
		expect(isOuterBody("true_node")).toBe(true);
	});

	it("computes exact conjunctions and determines applying status", () => {
		const transits = {
			pluto: { lon: 300.0, speed: 0.02 },
			sun: { lon: 50.0, speed: 0.98 },
		};
		const natals = {
			pluto: { lon: 300.5, speed: 0.0 }, // Pluto transiting Pluto within 0.5 deg
			moon: { lon: 51.0, speed: 12.0 },
		};

		const aspects = computeTransitAspects(transits, natals);
		expect(aspects.length).toBeGreaterThanOrEqual(1);

		const plutoConj = aspects.find(
			(a) =>
				a.transitBody === "pluto" &&
				a.natalPoint === "pluto" &&
				a.aspect === "conjunction",
		);
		expect(plutoConj).toBeDefined();
		expect(plutoConj?.orb).toBeCloseTo(0.5);
		expect(plutoConj?.stress).toBe("stressful");
		expect(plutoConj?.isApplying).toBe(true);
	});

	it("evaluates transiting body approaching a natal body as applying when natal position is static", () => {
		const transits = {
			sun: { lon: 50.0, speed: 0.98 },
		};
		// Natal Moon at 51.0 deg is static (speed: 0) in inter-chart context
		const natals = {
			moon: { lon: 51.0, speed: 0 },
		};

		const aspects = computeTransitAspects(transits, natals);
		const sunMoonConj = aspects.find(
			(a) => a.transitBody === "sun" && a.natalPoint === "moon",
		);
		expect(sunMoonConj).toBeDefined();
		expect(sunMoonConj?.orb).toBeCloseTo(1.0);
		expect(sunMoonConj?.isApplying).toBe(true);
	});

	it("ensures extractNatalPoints freezes all natal points with speed: 0 for inter-chart calculations", () => {
		const mockChart = {
			bodies: {
				sun: { lon: 10, speed: 1.0 },
				moon: { lon: 50, speed: 13.5 },
				mars: { lon: 80, speed: -0.4 },
			},
			angles: {
				asc: { lon: 0 },
				mc: { lon: 90 },
				vertex: { lon: 180 },
				eastPoint: { lon: 270 },
			},
			pluto: { lon: 200 },
			ppp: { active: true, lon: 20 },
			nodalAxis: {
				north: { lon: 30 },
				south: { lon: 210 },
			},
		} as unknown as Parameters<typeof extractNatalPoints>[0];

		const points = extractNatalPoints(mockChart);
		for (const [_name, pt] of Object.entries(points)) {
			expect(pt.speed).toBe(0);
		}
	});
});
