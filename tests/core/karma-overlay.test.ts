import { describe, expect, test } from "bun:test";
import type { ChartBody } from "caelus";
import { type ChartLike, toOverlayChart } from "../../src/core/karma";

function body(overrides: Partial<ChartBody> = {}): ChartBody {
	return {
		lon: 0,
		sign: "Aries",
		signDeg: 0,
		house: 1,
		retrograde: false,
		speed: 1,
		lat: 0,
		dist: null,
		ra: 0,
		dec: 0,
		dignities: [],
		...overrides,
	};
}

const CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function chart(overrides: Partial<Record<string, ChartBody>>): ChartLike {
	return {
		bodies: overrides,
		cusps: CUSPS,
	};
}

describe("karma overlay chart projection", () => {
	test("projects natal charts into frame-agnostic evolutionary points", () => {
		const projected = toOverlayChart(
			"erik",
			chart({
				pluto: body({ lon: 10, sign: "Aries", house: 1 }),
				true_node: body({ lon: 190, sign: "Libra", house: 7 }),
			}),
		);

		const ids = projected.points.map((point) => point.id);
		expect(ids).toContain("pluto");
		expect(ids).toContain("north_node");
		expect(ids).toContain("south_node");
		expect(ids).toContain("polarity_point");
		expect(ids).not.toContain("true_node");
	});

	test("honors the selected node mode when both nodes are present", () => {
		const source = chart({
			true_node: body({ lon: 10, sign: "Aries", house: 1 }),
			mean_node: body({ lon: 20, sign: "Aries", house: 1 }),
		});

		const mean = toOverlayChart("x", source, "mean");
		const trueNode = toOverlayChart("x", source, "true");
		const both = toOverlayChart("x", source, "both");

		expect(mean.points.find((point) => point.id === "north_node")?.lon).toBe(
			20,
		);
		expect(
			trueNode.points.find((point) => point.id === "north_node")?.lon,
		).toBe(10);
		expect(both.points.find((point) => point.id === "north_node")?.lon).toBe(
			10,
		);
		expect(
			mean.points.filter((point) => point.id === "north_node").length,
		).toBe(1);
	});
});
