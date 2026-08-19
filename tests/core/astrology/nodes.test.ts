import { describe, expect, test } from "bun:test";
import {
	computeNodalAxisFact,
	computeSkippedSteps,
} from "../../../src/core/astrology/nodes";

describe("Nodal axis astrology calculations", () => {
	const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

	test("computes North and South nodes and detects skipped steps", () => {
		const bodies = {
			true_node: {
				lon: 10,
				sign: "Aries",
				signDeg: 10,
				house: 1,
				speed: -0.05,
			},
			mars: { lon: 100, sign: "Cancer", signDeg: 10, house: 4, speed: 0.5 },
			venus: { lon: 40, sign: "Taurus", signDeg: 10, house: 2, speed: 1.0 },
		};

		const skipped = computeSkippedSteps(bodies, bodies.true_node.lon, 5);
		expect(skipped.length).toBe(1);
		expect(skipped[0].body).toBe("mars");
		expect(skipped[0].aspect).toBe("square");
		expect(skipped[0].orb).toBe(0);

		const result = computeNodalAxisFact(bodies, cusps);
		expect(result.nodalAxis.north.sign).toBe("Aries");
		expect(result.nodalAxis.south.sign).toBe("Libra");
		expect(result.nodalAxis.north.ruler).toBe("mars");
		expect(result.nodalAxis.south.ruler).toBe("venus");
		expect(result.nodalAxis.motion).toBe("retrograde");
	});
});
