import { describe, expect, it } from "bun:test";
import type { ChartBody } from "caelus";
import { generateFactAtoms } from "../../src/core/fact-atoms";

describe("fact-atoms", () => {
	it("generates deterministic fact atoms for bodies, aspects, and patterns", () => {
		const bodies: Partial<Record<string, ChartBody>> = {
			sun: {
				lon: 15,
				sign: "Aries",
				signDeg: 15,
				house: 1,
				retrograde: false,
				speed: 1,
				lat: 0,
				dist: null,
				ra: 14,
				dec: 6,
			},
			mercury: {
				lon: 20,
				sign: "Aries",
				signDeg: 20,
				house: 1,
				retrograde: true,
				speed: -0.5,
				lat: 0,
				dist: null,
				ra: 18,
				dec: 8,
			},
		};

		const aspects = [{ a: "sun", b: "mercury", aspect: "conjunction" }];
		const patterns = [
			{ type: "stellium" as const, bodies: ["sun", "mercury", "venus"] },
		];

		const context = generateFactAtoms({
			bodies,
			aspects,
			patterns,
		});

		expect(context.atoms).toContain("sun_sign_aries");
		expect(context.atoms).toContain("sun_house_1");
		expect(context.atoms).toContain("mercury_retrograde");
		expect(context.atoms).toContain("aspect_sun_conjunction_mercury");
		expect(context.atoms).toContain("pattern_stellium");
	});

	it("generates evolutionary and dominant fact atoms", () => {
		const context = generateFactAtoms({
			bodies: {},
			aspects: [],
			evolutionary: {
				pluto: {
					lon: 220,
					sign: "Scorpio",
					signDeg: 10,
					house: 8,
					retrograde: true,
					nodalConjunction: "south_node",
				},
				nodes: {
					northNode: { sign: "Taurus", signDeg: 15, house: 2, ruler: "venus" },
					southNode: {
						lon: 225,
						sign: "Scorpio",
						signDeg: 15,
						house: 8,
						ruler: "pluto",
					},
					motionStatus: "stationary",
				},
				skippedSteps: [
					{
						body: "mars",
						aspect: "square",
						target: "pluto",
						orb: 1.2,
						resolutionNode: "north_node",
					},
				],
				solLunaPhase: { name: "Full", angle: 180 },
			},
			signature: {
				hemispheres: { eastern: 6, western: 2, northern: 5, southern: 3 },
				quadrants: { q1: 4, q2: 1, q3: 1, q4: 2 },
				elements: { fire: 5, earth: 1, air: 1, water: 1 },
				modalities: { cardinal: 4, fixed: 2, mutable: 2 },
			},
		});

		expect(context.atoms).toContain("pluto_sign_scorpio");
		expect(context.atoms).toContain("pluto_house_8");
		expect(context.atoms).toContain("pluto_conjunct_south_node");
		expect(context.atoms).toContain("node_motion_stationary");
		expect(context.atoms).toContain(
			"skipped_step_mars_squares_pluto_resolves_north_node",
		);
		expect(context.atoms).toContain("sol_luna_phase_full");
		expect(context.atoms).toContain("dominant_element_fire");
		expect(context.atoms).toContain("dominant_hemisphere_eastern");
	});
});
