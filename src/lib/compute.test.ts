import { describe, expect, test } from "bun:test";
import { computeChart } from "./compute";
import type { NatalRequest } from "./intake";

const request: NatalRequest = {
	birth: {
		jdUt: 2448053.2708,
		lat: 27.95,
		lon: -82.46,
		local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30, second: 0 },
		zone: "America/New_York",
		offsetMinutes: -240,
		dst: true,
		status: "ok",
	},
	options: {
		houseSystem: "placidus",
		zodiac: "tropical",
		node: "both",
		bodies: [],
		topocentric: false,
	},
};

describe("computeChart", () => {
	test("computes a natal chart with the embedded engine", () => {
		const chart = computeChart(request);
		expect(chart.bodies.sun.sign).toBe("Gemini");
		expect(chart.bodies.sun.house).toBe(9);
		expect(chart.houseSystem).toBe("placidus");
	});

	test("keeps both nodes when node is both", () => {
		const chart = computeChart(request);
		expect(chart.bodies.mean_node).toBeDefined();
		expect(chart.bodies.true_node).toBeDefined();
	});

	test("drops the true node when node is mean", () => {
		const chart = computeChart({
			...request,
			options: { ...request.options, node: "mean" },
		});
		expect(chart.bodies.mean_node).toBeDefined();
		expect(chart.bodies.true_node).toBeUndefined();
	});

	test("drops the mean node when node is true", () => {
		const chart = computeChart({
			...request,
			options: { ...request.options, node: "true" },
		});
		expect(chart.bodies.true_node).toBeDefined();
		expect(chart.bodies.mean_node).toBeUndefined();
	});

	test("computes requested extra bodies", () => {
		const chart = computeChart({
			...request,
			options: { ...request.options, bodies: ["mean_lilith"] },
		});
		expect(chart.bodies.mean_lilith).toBeDefined();
	});
});
