import { describe, expect, it } from "bun:test";
import { generateEvoAtoms } from "../../src/core/classical";

describe("core/evo-atoms", () => {
	const fullInput = {
		plutoAspectCount: 5,
		plutoStressfulCount: 2,
		plutoNonstressfulCount: 3,
		ppp: { sign: "Aries", house: 6, active: true },
		plutoNorthNodeSeparation: 73.44,
		midpoint: { sign: "Virgo", signDeg: 17.63 },
		antiMidpoint: { sign: "Pisces", signDeg: 17.63 },
		phase: "Disseminating",
		northNodeRuler: "sun",
		southNodeRuler: "uranus",
		northNodeAspectCount: 8,
		southNodeAspectCount: 8,
		nodalMotion: "direct" as const,
		skippedSteps: [{ body: "chiron", aspect: "square" }],
		eclipses: [
			{ kind: "solar" as const, type: "annular", sign: "Leo", signDeg: 18.28 },
			{ kind: "lunar" as const, type: "penumbral", sign: "Leo", signDeg: 0.27 },
		],
	};

	it("generates deterministic factual atoms for the full evolutionary mechanics", () => {
		const atoms = generateEvoAtoms({ ...fullInput, ppp: { ...fullInput.ppp } });

		expect(atoms).toContain("pluto_aspects_5");
		expect(atoms).toContain("pluto_stressful_aspects_2");
		expect(atoms).toContain("pluto_nonstressful_aspects_3");
		expect(atoms).toContain("ppp_sign_aries");
		expect(atoms).toContain("ppp_house_6");
		expect(atoms).toContain("ppp_active");
		expect(atoms).toContain("pluto_nn_separation_73_44");
		expect(atoms).toContain("pluto_nn_midpoint_virgo_17");
		expect(atoms).toContain("pluto_nn_antimidpoint_pisces_17");
		expect(atoms).toContain("sol_luna_phase_disseminating");
		expect(atoms).toContain("north_node_ruler_sun");
		expect(atoms).toContain("south_node_ruler_uranus");
		expect(atoms).toContain("north_node_aspects_8");
		expect(atoms).toContain("south_node_aspects_8");
		expect(atoms).toContain("nodal_motion_direct");
		expect(atoms).toContain("skipped_steps_1");
		expect(atoms).toContain("skipped_chiron_square");
		expect(atoms).toContain("solar_eclipse_annular_leo_18");
		expect(atoms).toContain("lunar_eclipse_penumbral_leo_0");
	});

	it("flattens multi-word phases into snake_case identifiers", () => {
		const atoms = generateEvoAtoms({
			...fullInput,
			phase: "First Quarter",
			ppp: fullInput.ppp,
		});
		expect(atoms).toContain("sol_luna_phase_first_quarter");
	});

	it("emits ppp_inactive without reason text and reports zeroed counts for empties", () => {
		const atoms = generateEvoAtoms({
			plutoAspectCount: 0,
			plutoStressfulCount: 0,
			plutoNonstressfulCount: 0,
			ppp: { sign: "Taurus", house: 2, active: false },
			plutoNorthNodeSeparation: 8.3,
			northNodeAspectCount: 0,
			southNodeAspectCount: 0,
			nodalMotion: "stationary",
			skippedSteps: [],
			eclipses: [],
		});

		expect(atoms).toContain("ppp_inactive");
		expect(atoms).not.toContain("ppp_active");
		expect(atoms).toContain("pluto_nn_separation_8_30");
		expect(atoms).toContain("skipped_steps_0");
		expect(atoms).toContain("nodal_motion_stationary");
		expect(atoms.some((a) => a.includes("eclipse"))).toBe(false);
	});

	it("is deterministic: two calls with the same input produce identical atoms", () => {
		const a = generateEvoAtoms({ ...fullInput, ppp: fullInput.ppp });
		const b = generateEvoAtoms({ ...fullInput, ppp: fullInput.ppp });
		expect(a).toEqual(b);
	});
});
