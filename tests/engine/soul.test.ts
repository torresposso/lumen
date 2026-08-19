import { describe, expect, test } from "bun:test";
import { PPP_DEACTIVATION_ORB } from "../../src/engine/aspects";
import { computeSoulFact } from "../../src/engine/natal";

describe("Soul astrology calculations", () => {
	test("PPP_DEACTIVATION_ORB is 3 degrees", () => {
		expect(PPP_DEACTIVATION_ORB).toBe(3);
	});

	test("deactivates PPP when Pluto is conjunct North Node within 3 degrees", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		const bodies = {
			pluto: { lon: 100, sign: "Cancer", signDeg: 10, house: 4, speed: -0.01 },
			true_node: {
				lon: 102,
				sign: "Cancer",
				signDeg: 12,
				house: 4,
				speed: -0.05,
			},
		};

		const soul = computeSoulFact(bodies, cusps, bodies.true_node.lon);
		expect(soul.ppp.active).toBe(false);
		expect(soul.ppp.separation).toBe(2);
		expect(soul.ppp.reason).toContain("pluto conjunct north node");
	});

	test("keeps PPP active when Pluto is separated from North Node by more than 3 degrees", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		const bodies = {
			pluto: { lon: 100, sign: "Cancer", signDeg: 10, house: 4, speed: -0.01 },
			true_node: {
				lon: 104,
				sign: "Cancer",
				signDeg: 14,
				house: 4,
				speed: -0.05,
			},
		};

		const soul = computeSoulFact(bodies, cusps, bodies.true_node.lon);
		expect(soul.ppp.active).toBe(true);
		expect(soul.ppp.separation).toBe(4);
	});
});
