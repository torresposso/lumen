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
				sun: {
					sign: "Aries",
					signDeg: 0,
					house: 1,
					speed: 1.0,
					dec: 0,
					outOfBounds: false,
					retrograde: false,
					dignities: [],
				},
				moon: {
					sign: "Cancer",
					signDeg: 0,
					house: 4,
					speed: 12.0,
					dec: 0,
					outOfBounds: false,
					retrograde: false,
					dignities: [],
				},
				mars: {
					sign: "Gemini",
					signDeg: 20,
					house: 3,
					speed: -0.4,
					dec: 0,
					outOfBounds: false,
					retrograde: true,
					dignities: [],
				},
				pluto: {
					sign: "Libra",
					signDeg: 20,
					house: 7,
					speed: 0.01,
					dec: 0,
					outOfBounds: false,
					retrograde: false,
					dignities: [],
				},
			},
			angles: {
				asc: { sign: "Aries", signDeg: 0 },
				mc: { sign: "Cancer", signDeg: 0 },
				vertex: { sign: "Libra", signDeg: 0 },
				eastPoint: { sign: "Capricorn", signDeg: 0 },
			},
			evolutionary: {
				ppp: {
					active: true,
					sign: "Aries",
					signDeg: 20,
					house: 1,
					aspects: [],
				},
				nodalAxis: {
					motion: "retrograde",
					north: {
						sign: "Taurus",
						signDeg: 0,
						house: 2,
						speed: -0.05,
						dec: 0,
						outOfBounds: false,
					},
					south: {
						sign: "Scorpio",
						signDeg: 0,
						house: 8,
						speed: -0.05,
						dec: 0,
						outOfBounds: false,
					},
				},
			},
		} as unknown as Parameters<typeof extractNatalPoints>[0];

		const points = extractNatalPoints(mockChart);
		for (const [_name, pt] of Object.entries(points)) {
			expect(pt.speed).toBe(0);
		}
	});
});
