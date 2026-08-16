import { describe, expect, test } from "bun:test";
import type { ChartBody } from "caelus";
import {
	type ChartLike,
	computeSynastry,
	toSynastryChart,
} from "../../src/core/synastry";

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

describe("synastry core", () => {
	test("projects natal charts into frame-agnostic evolutionary points", () => {
		const projected = toSynastryChart(
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

	test("filters contacts by evolutionary focus and reports overlays", () => {
		const result = computeSynastry(
			toSynastryChart(
				"a",
				chart({
					pluto: body({ lon: 0, sign: "Aries", house: 1 }),
					true_node: body({ lon: 180, sign: "Libra", house: 7 }),
				}),
			),
			toSynastryChart(
				"b",
				chart({
					pluto: body({ lon: 0, sign: "Aries", house: 1 }),
					true_node: body({ lon: 180, sign: "Libra", house: 7 }),
				}),
			),
			{ orb: 3, focus: "evolutionary" },
		);

		expect(result.summary.contacts).toBeGreaterThan(0);
		expect(result.summary.classical).toBe(0);
		expect(result.summary.overlays).toBe(8);
		expect(
			result.contacts.some(
				(contact) => contact.a === "a.pluto" && contact.b === "b.pluto",
			),
		).toBe(true);
	});

	test("classical focus excludes points like nodes and polarity", () => {
		const result = computeSynastry(
			toSynastryChart(
				"a",
				chart({
					sun: body({ lon: 0, sign: "Aries", house: 1 }),
					true_node: body({ lon: 0, sign: "Aries", house: 1 }),
				}),
			),
			toSynastryChart(
				"b",
				chart({
					sun: body({ lon: 0, sign: "Aries", house: 1 }),
					true_node: body({ lon: 0, sign: "Aries", house: 1 }),
				}),
			),
			{ orb: 3, focus: "classical" },
		);

		expect(result.summary.evolutionary).toBe(0);
		expect(
			result.contacts.every((contact) => contact.kind === "classical"),
		).toBe(true);
	});

	test("honors the selected node mode when both nodes are present", () => {
		const source = chart({
			true_node: body({ lon: 10, sign: "Aries", house: 1 }),
			mean_node: body({ lon: 20, sign: "Aries", house: 1 }),
		});

		const mean = toSynastryChart("x", source, "mean");
		const trueNode = toSynastryChart("x", source, "true");
		const both = toSynastryChart("x", source, "both");

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

	test("filters overlays by focus", () => {
		const result = computeSynastry(
			toSynastryChart(
				"a",
				chart({
					sun: body({ lon: 0, sign: "Aries", house: 1 }),
					pluto: body({ lon: 10, sign: "Aries", house: 1 }),
					true_node: body({ lon: 180, sign: "Libra", house: 7 }),
				}),
			),
			toSynastryChart(
				"b",
				chart({
					sun: body({ lon: 0, sign: "Aries", house: 1 }),
					pluto: body({ lon: 10, sign: "Aries", house: 1 }),
					true_node: body({ lon: 180, sign: "Libra", house: 7 }),
				}),
			),
			{ orb: 3, focus: "classical" },
		);

		const evolutionaryIds = new Set([
			"pluto",
			"north_node",
			"south_node",
			"polarity_point",
		]);
		expect(result.overlays.length).toBe(2);
		expect(
			result.overlays.every((overlay) => {
				const id = overlay.body.split(".").at(-1) ?? "";
				return !evolutionaryIds.has(id);
			}),
		).toBe(true);

		const all = computeSynastry(
			toSynastryChart("a", chart({ sun: body({ lon: 0, sign: "Aries" }) })),
			toSynastryChart("b", chart({ sun: body({ lon: 0, sign: "Aries" }) })),
			{ orb: 3, focus: "all" },
		);
		expect(all.summary.overlays).toBe(2);
	});
});
