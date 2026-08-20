import { describe, expect, it } from "bun:test";
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
});
