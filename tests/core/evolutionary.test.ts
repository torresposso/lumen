import { describe, expect, test } from "bun:test";
import type { ChartBody } from "caelus";
import {
	computeEvolutionaryReading,
	type EvolutionaryInput,
} from "../../src/core/evolutionary";

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

// Pluto at 210° Scorpio, North Node at 30° Taurus.
const natal = {
	pluto: body({ lon: 210, sign: "Scorpio", signDeg: 0, house: 8 }),
	true_node: body({ lon: 30, sign: "Taurus", signDeg: 0, house: 2 }),
};

describe("computeEvolutionaryReading", () => {
	test("places the Pluto Polarity Point opposite Pluto", () => {
		const evo = computeEvolutionaryReading(input(natal));

		expect(evo.polarityPoint).toEqual({
			lon: 30,
			sign: "Taurus",
			signDeg: 0,
			house: 2,
		});
	});

	test("derives the South Node from the North Node", () => {
		const evo = computeEvolutionaryReading(input(natal));

		expect(evo.nodes.southNode?.lon).toBe(210);
		expect(evo.nodes.southNode?.sign).toBe("Scorpio");
		expect(evo.nodes.southNode?.ruler).toBe("pluto");
	});

	test("flags bodies squaring Pluto as skipped steps", () => {
		const evo = computeEvolutionaryReading(
			input({
				...natal,
				moon: body({ lon: 300, sign: "Aquarius", signDeg: 0, house: 11 }),
			}),
		);

		expect(
			evo.skippedSteps.some((s) => s.body === "moon" && s.target === "pluto"),
		).toBe(true);
	});

	test("computes the Pluto–North Node midpoint", () => {
		const evo = computeEvolutionaryReading(input(natal));

		expect(evo.plutoNorthNodeMidpoint?.lon).toBe(120);
		expect(evo.plutoNorthNodeMidpoint?.sign).toBe("Leo");
	});

	test("traces the Pluto dispositor chain", () => {
		const evo = computeEvolutionaryReading(input(natal));

		expect(evo.dispositorChains?.pluto).toEqual([
			{ body: "pluto", sign: "Scorpio", ruler: "pluto" },
		]);
	});

	test("evaluates aspects to the Pluto Polarity Point (PPP)", () => {
		// Pluto at 210° Scorpio -> PPP at 30° Taurus. Sun at 30° Taurus (conjunction orb 0).
		const evo = computeEvolutionaryReading(
			input({
				...natal,
				sun: body({ lon: 30, sign: "Taurus", signDeg: 0, house: 2 }),
			}),
		);

		expect(evo.polarityPoint?.aspects).toBeDefined();
		expect(evo.polarityPoint?.aspects).toContainEqual({
			body: "sun",
			aspect: "conjunction",
			orb: 0,
		});
	});

	test("evaluates Node Motion Status and Sol-Luna Phase Mechanics", () => {
		// Sun at 0° Aries, Moon at 45° Taurus -> Semi-sextile/crescent angle (45°) -> Crescent phase
		const evo = computeEvolutionaryReading(
			input({
				...natal,
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
		expect(evo.solLunaPhase).toBeDefined();
		expect(evo.solLunaPhase?.name).toBe("Crescent");
		expect(evo.solLunaPhase?.angle).toBe(45);
	});
});
