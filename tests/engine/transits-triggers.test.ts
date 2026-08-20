import { describe, expect, it } from "bun:test";
import type { NatalChartOutput } from "../../src/engine/natal/types";
import { computeEvolutionaryTriggers } from "../../src/engine/transits/triggers";
import type { TransitAspect } from "../../src/engine/transits/types";

describe("transits evolutionary triggers (JWGEA)", () => {
	const dummyNatal: Partial<NatalChartOutput> = {
		pluto: {
			lon: 200,
			sign: "libra",
			signDeg: 20,
			house: 8,
			retrograde: false,
			stressfulCount: 0,
			nonstressfulCount: 0,
			aspects: [],
		},
		ppp: {
			lon: 20,
			sign: "aries",
			signDeg: 20,
			house: 2,
			active: true,
			aspects: [],
		},
		nodalAxis: {
			motion: "retrograde",
			north: { lon: 100, sign: "cancer", signDeg: 10, house: 5, aspects: [] },
			south: {
				lon: 280,
				sign: "capricorn",
				signDeg: 10,
				house: 11,
				aspects: [],
			},
			skippedSteps: [
				{
					body: "mars",
					orb: 1.2,
					resolutionNode: "south",
					aspect: "square",
				},
			],
		},

		dispositorChains: {
			pluto: {
				steps: [],
				terminalType: "final_dispositor",
				terminalBodies: ["sun"],
			},
		},
	};


	it("identifies triggers for Pluto, PPP, Nodal Axis, Skipped Steps, and Dispositors", () => {
		const aspects: TransitAspect[] = [
			{
				transitBody: "saturn",
				natalPoint: "pluto",
				aspect: "square",
				orb: 0.5,
				maxOrb: 2.5,
				isApplying: true,
				stress: "stressful",
			},
			{
				transitBody: "jupiter",
				natalPoint: "ppp",
				aspect: "conjunction",
				orb: 1.0,
				maxOrb: 2.5,
				isApplying: true,
				stress: "stressful",
			},
			{
				transitBody: "uranus",
				natalPoint: "mars", // Mars is the skipped step
				aspect: "conjunction",
				orb: 0.8,
				maxOrb: 2.5,
				isApplying: true,
				stress: "stressful",
			},
			{
				transitBody: "pluto",
				natalPoint: "sun", // Sun is final dispositor
				aspect: "trine",
				orb: 1.5,
				maxOrb: 2.5,
				isApplying: false,
				stress: "nonstressful",
			},
		];

		const triggers = computeEvolutionaryTriggers(
			aspects,
			dummyNatal as NatalChartOutput,
		);
		expect(triggers.plutoContacts.length).toBe(1);
		expect(triggers.pppContacts.length).toBe(1);
		expect(triggers.skippedStepActivations.length).toBe(1);
		expect(triggers.skippedStepActivations[0]?.skippedStepBody).toBe("mars");
		expect(triggers.skippedStepActivations[0]?.resolutionNode).toBe("south");
		expect(triggers.dispositorActivations.length).toBe(1);
		expect(triggers.dispositorActivations[0]?.natalPoint).toBe("sun");
	});
});
