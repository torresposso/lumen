import { describe, expect, it } from "bun:test";
import { CaelusEphemeris } from "../../src/adapters/ephemeris";
import type { Profile } from "../../src/domain/model";
import { computeEvolutionarySynthesis } from "../../src/engine/synthesis/index";

describe("computeEvolutionarySynthesis", () => {
	const ephemeris = new CaelusEphemeris();

	const sampleProfile: Profile = {
		id: "11111111-2222-3333-4444-555555555555",
		name: "Tampa Anchor",
		birthPlace: "Tampa, Florida, USA",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthLat: 27.9506,
		birthLon: -82.4572,
		birthJdUt: 2448053.270833,
		createdAt: "2026-08-20T00:00:00.000Z",
		updatedAt: "2026-08-20T00:00:00.000Z",
	};

	it("computes 3-layer stack and cross-dynamics correctly", () => {
		const result = computeEvolutionarySynthesis(
			sampleProfile,
			{
				dateTime: "2026-08-20T12:00-04:00",
				jdUt: 2461273.166667,
				lat: 27.9506,
				lon: -82.4572,
				place: "Tampa, Florida, USA",
			},
			ephemeris,
		);

		expect(result.synthesis).toBeDefined();
		const s = result.synthesis;

		// 1. Profile & Target Moment
		expect(s.profile.id).toBe(sampleProfile.id);
		expect(s.targetMoment.when).toBe("2026-08-20T12:00-04:00");
		expect(s.targetMoment.where).toBe("Tampa, Florida, USA");

		// 2. Karmic Root
		expect(s.karmicRoot).toBeDefined();
		expect(s.karmicRoot.pluto.sign).toBe("Scorpio");
		expect(s.karmicRoot.nodalAxis.northNode.sign).toBe("Aquarius");
		expect(s.karmicRoot.nodalAxis.southNode.sign).toBe("Leo");
		expect(Array.isArray(s.karmicRoot.skippedSteps)).toBe(true);

		// 3. Soul Clock
		expect(s.soulClock).toBeDefined();
		expect(s.soulClock.phaseNumber).toBeGreaterThanOrEqual(1);
		expect(s.soulClock.phaseName).toBeDefined();
		expect(s.soulClock.progressedSun).toBeDefined();
		expect(s.soulClock.progressedMoon).toBeDefined();
		expect(Array.isArray(s.soulClock.progressedTriggers)).toBe(true);

		// 4. Cosmic Triggers
		expect(s.cosmicTriggers).toBeDefined();
		expect(Array.isArray(s.cosmicTriggers.activeTransits)).toBe(true);
		expect(Array.isArray(s.cosmicTriggers.outOfBoundsTransits)).toBe(true);

		// 5. Evolutionary Dynamics
		expect(s.evolutionaryDynamics).toBeDefined();
		expect(Array.isArray(s.evolutionaryDynamics.skippedStepActivations)).toBe(
			true,
		);
		expect(Array.isArray(s.evolutionaryDynamics.plutoNodePressure)).toBe(true);
		expect(typeof s.evolutionaryDynamics.phaseContextGuidance).toBe("string");
		expect(s.evolutionaryDynamics.phaseContextGuidance).toContain(
			s.soulClock.phaseName,
		);

		// 6. Method Signature
		expect(s.method).toBe("JWGEA 3-Layer Soul Stack Evolutionary Synthesis");
	});

	it("formats evolutionaryMandate correctly when skipped steps are activated", () => {
		const result = computeEvolutionarySynthesis(
			sampleProfile,
			{
				dateTime: "2026-08-20T12:00-04:00",
				jdUt: 2461273.166667,
			},
			ephemeris,
		);

		for (const act of result.synthesis.evolutionaryDynamics
			.skippedStepActivations) {
			expect(act.evolutionaryMandate).toMatch(
				/^Integration through (North|South) Node in \w+ House \d+$/,
			);
			expect(act.resolutionNode).toMatch(/^(north|south)$/);
		}

		for (const pressure of result.synthesis.evolutionaryDynamics
			.plutoNodePressure) {
			expect(["pluto", "ppp", "north_node", "south_node"]).toContain(
				pressure.targetPoint,
			);
			expect(pressure.orb).toBeLessThanOrEqual(3.0);
		}
	});
});
