import { describe, expect, test } from "bun:test";
import type { ChartBody } from "caelus";
import {
	computeEvolutionaryReading,
	type EvolutionaryInput,
} from "../../src/core/evolutionary-astrology";

function body(overrides: Partial<ChartBody> = {}): ChartBody {
	return {
		lon: 0,
		speed: 1,
		retrograde: false,
		sign: "Aries",
		signDeg: 0,
		lat: 0,
		dist: 1,
		ra: 0,
		dec: 0,
		house: 1,
		dignities: [],
		...overrides,
	};
}

const CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function input(bodies: Record<string, ChartBody>): EvolutionaryInput {
	return {
		bodies: bodies as EvolutionaryInput["bodies"],
		cusps: CUSPS,
	};
}

// Pluto at 210° Scorpio, North Node at 30° Taurus -> South Node at 210° Scorpio.
const plutoConjunctSouthNode = {
	pluto: body({ lon: 210, sign: "Scorpio", signDeg: 0, house: 8 }),
	true_node: body({
		lon: 30,
		sign: "Taurus",
		signDeg: 0,
		house: 2,
		speed: -0.05,
	}),
};

describe("computeEvolutionaryReading", () => {
	test("places the Pluto Polarity Point opposite Pluto", () => {
		const evo = computeEvolutionaryReading(input(plutoConjunctSouthNode));

		expect(evo.polarityPoint).toEqual({
			lon: 30,
			sign: "Taurus",
			signDeg: 0,
			house: 2,
			isOperative: true,
		});
	});

	test("derives the South Node from the selected North Node", () => {
		const evo = computeEvolutionaryReading(input(plutoConjunctSouthNode));

		expect(evo.nodes.southNode?.lon).toBe(210);
		expect(evo.nodes.southNode?.sign).toBe("Scorpio");
		expect(evo.nodes.southNode?.ruler).toBe("pluto");
	});

	test("honors the requested node mode", () => {
		const evo = computeEvolutionaryReading(
			input({
				...plutoConjunctSouthNode,
				mean_node: body({
					lon: 40,
					sign: "Taurus",
					signDeg: 10,
					house: 2,
					speed: -0.05,
				}),
			}),
			"mean",
		);

		expect(evo.nodes.northNode?.sign).toBe("Taurus");
		expect(evo.nodes.northNode?.signDeg).toBe(10);
		expect(evo.nodes.southNode?.lon).toBe(220);
	});

	test("flags squares to the nodal axis as one skipped step per body", () => {
		// Pluto at 45°, NN at 0°/SN at 180°. Venus at 135° squares Pluto but not
		// the nodal axis: it must NOT be a skipped step. Mars at 90° squares both
		// nodes and is one skipped step against the axis.
		const evo = computeEvolutionaryReading(
			input({
				pluto: body({ lon: 45, sign: "Taurus", signDeg: 15, house: 2 }),
				true_node: body({
					lon: 0,
					sign: "Aries",
					signDeg: 0,
					house: 1,
					speed: -0.05,
				}),
				mars: body({ lon: 90, sign: "Cancer", signDeg: 0, house: 4 }),
				venus: body({ lon: 135, sign: "Leo", signDeg: 15, house: 5 }),
			}),
		);

		expect(
			evo.skippedSteps.some(
				(step) => step.body === "mars" && step.target === "nodal_axis",
			),
		).toBe(true);
		expect(evo.skippedSteps.some((step) => step.body === "venus")).toBe(false);
		expect(evo.skippedSteps.filter((step) => step.body === "mars").length).toBe(
			1,
		);
	});

	test("classifies Pluto aspects as stressful or nonstressful", () => {
		const evo = computeEvolutionaryReading(
			input({
				pluto: body({ lon: 45, sign: "Taurus", signDeg: 15, house: 2 }),
				true_node: body({
					lon: 0,
					sign: "Aries",
					signDeg: 0,
					house: 1,
					speed: -0.05,
				}),
				venus: body({
					lon: 135,
					sign: "Leo",
					signDeg: 15,
					house: 5,
					speed: 1,
				}),
				jupiter: body({
					lon: 165,
					sign: "Virgo",
					signDeg: 15,
					house: 6,
					speed: 0.5,
				}),
			}),
		);

		const venus = evo.pluto?.aspects.find((a) => a.body === "venus");
		expect(venus?.aspect).toBe("square");
		expect(venus?.stress).toBe("stressful");

		const jupiter = evo.pluto?.aspects.find((a) => a.body === "jupiter");
		expect(jupiter?.aspect).toBe("trine");
		expect(jupiter?.stress).toBe("nonstressful");
		expect(evo.pluto?.aspectCount).toBe(2);
	});

	test("computes the Pluto–North Node midpoint", () => {
		const evo = computeEvolutionaryReading(input(plutoConjunctSouthNode));

		expect(evo.plutoNorthNodeMidpoint?.lon).toBe(120);
		expect(evo.plutoNorthNodeMidpoint?.sign).toBe("Leo");
	});

	test("traces the Pluto dispositor chain", () => {
		const evo = computeEvolutionaryReading(input(plutoConjunctSouthNode));

		expect(evo.dispositorChains?.pluto).toEqual([
			{ body: "pluto", sign: "Scorpio", ruler: "pluto" },
		]);
	});

	test("evaluates aspects to the Pluto Polarity Point (PPP)", () => {
		const evo = computeEvolutionaryReading(
			input({
				...plutoConjunctSouthNode,
				sun: body({ lon: 30, sign: "Taurus", signDeg: 0, house: 2 }),
			}),
		);

		expect(evo.polarityPoint?.aspects).toContainEqual({
			body: "sun",
			aspect: "conjunction",
			orb: 0,
		});
	});

	test("evaluates Node Motion Status and Sol-Luna Phase Mechanics", () => {
		const evo = computeEvolutionaryReading(
			input({
				...plutoConjunctSouthNode,
				true_node: body({
					lon: 30,
					speed: 0,
					sign: "Taurus",
					signDeg: 0,
					house: 2,
				}),
				sun: body({ lon: 0, sign: "Aries", signDeg: 0, house: 1 }),
				moon: body({ lon: 45, sign: "Taurus", signDeg: 15, house: 2 }),
			}),
		);

		expect(evo.nodes.motionStatus).toBe("stationary");
		expect(evo.solLunaPhase?.name).toBe("Crescent");
		expect(evo.solLunaPhase?.angle).toBe(45);
	});

	test("detects Pluto square the nodal axis and the node Pluto applies to", () => {
		// Jeffrey Wolf Green's example: Pluto 16° Leo, South Node 16° Taurus,
		// North Node 16° Scorpio. The retrograde North Node applies to Pluto,
		// while Pluto applies to the South Node.
		const evo = computeEvolutionaryReading(
			input({
				pluto: body({ lon: 136, sign: "Leo", signDeg: 16, house: 5 }),
				true_node: body({
					lon: 226,
					sign: "Scorpio",
					signDeg: 16,
					house: 8,
					speed: -0.05,
				}),
			}),
		);

		expect(evo.pluto?.nodalRelationship.aspect).toBe("square_nodal_axis");
		expect(evo.pluto?.nodalRelationship.applyingNode).toBe("south_node");
		expect(evo.pluto?.nodalRelationship.polarityPointApplies).toBe(true);
		expect(evo.polarityPoint?.sign).toBe("Aquarius");
	});

	test("reports Pluto conjunct South Node as evidence, not a verdict", () => {
		const evo = computeEvolutionaryReading(input(plutoConjunctSouthNode));

		expect(evo.pluto?.nodalRelationship.aspect).toBe("conjunct_south_node");
		expect(evo.pluto?.nodalRelationship.southNodeConjunction?.conclusion).toBe(
			"requires_human_confirmation",
		);
		expect(evo.polarityPoint?.isOperative).toBe(true);
	});

	test("deactivates the polarity point when Pluto is conjunct the North Node", () => {
		const evo = computeEvolutionaryReading(
			input({
				pluto: body({ lon: 30, sign: "Taurus", signDeg: 0, house: 2 }),
				true_node: body({
					lon: 30,
					sign: "Taurus",
					signDeg: 0,
					house: 2,
					speed: -0.05,
				}),
			}),
		);

		expect(evo.pluto?.nodalRelationship.aspect).toBe("conjunct_north_node");
		expect(evo.pluto?.nodalRelationship.polarityPointApplies).toBe(false);
		expect(evo.polarityPoint).toBeUndefined();
	});

	test("includes aspects to the North and South Nodes", () => {
		const evo = computeEvolutionaryReading(
			input({
				...plutoConjunctSouthNode,
				sun: body({ lon: 30, sign: "Taurus", signDeg: 0, house: 2 }),
			}),
		);

		expect(evo.nodes.northNode?.aspects).toContainEqual({
			body: "sun",
			aspect: "conjunction",
			orb: 0,
			stress: "stressful",
		});
	});
});
