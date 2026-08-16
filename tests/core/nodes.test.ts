import { describe, expect, it } from "bun:test";
import { computeNodalReading } from "../../src/core/nodes";

describe("core/nodes", () => {
	const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

	it("computes Nodal Axis reading, rulers, and motion status", () => {
		const bodies = {
			true_node: {
				lon: 155, // Virgo
				lat: 0,
				speed: -0.05,
				sign: "Virgo",
				signDeg: 5,
				house: 6,
			},
			mercury: {
				lon: 260, // Sagittarius (105° from node, no square)
				lat: 0,
				speed: 1.2,
				sign: "Sagittarius",
				signDeg: 20,
				house: 9,
			},
			neptune: {
				lon: 285, // Capricorn
				lat: 0,
				speed: 0.01,
				sign: "Capricorn",
				signDeg: 15,
				house: 10,
			},
			mars: {
				lon: 66.4, // Gemini (square Virgo 155° at 88.6° -> orb 1.4°)
				lat: 0,
				speed: 0.5,
				sign: "Gemini",
				signDeg: 6.4,
				house: 3,
			},
		};

		const reading = computeNodalReading(bodies, cusps, 5);
		expect(reading).toBeDefined();
		if (!reading) return;

		expect(reading.northNode.sign).toBe("Virgo");
		expect(reading.southNode.sign).toBe("Pisces");
		expect(reading.motionStatus).toBe("retrograde");
		expect(reading.northNode.ruler).toBe("mercury");
		expect(reading.southNode.ruler).toBe("neptune");
		expect(reading.northNode.rulerPlacement?.description).toContain(
			"Mercury in Sagittarius/H9",
		);
		expect(reading.skippedSteps).toHaveLength(1);
		expect(reading.skippedSteps[0]?.body).toBe("mars");
		expect(reading.skippedSteps[0]?.orb).toBeCloseTo(1.4, 1);
	});
});
