import type { NatalChartOutput } from "../natal/types";
import type {
	SkippedStepTransitActivation,
	TransitAspect,
	TransitEvolutionaryTriggers,
} from "./types";

export function computeEvolutionaryTriggers(
	aspectsToNatal: TransitAspect[],
	natalChart: NatalChartOutput,
): TransitEvolutionaryTriggers {
	// 1. Pluto contacts
	const plutoContacts = aspectsToNatal.filter(
		(a) => a.natalPoint.toLowerCase() === "pluto",
	);

	// 2. PPP contacts (if active)
	const pppContacts = natalChart.ppp.active
		? aspectsToNatal.filter((a) => a.natalPoint.toLowerCase() === "ppp")
		: [];

	// 3. Nodal contacts (True Node, South Node)
	const nodalContacts = aspectsToNatal.filter(
		(a) =>
			a.natalPoint.toLowerCase() === "true_node" ||
			a.natalPoint.toLowerCase() === "south_node",
	);

	// 4. Skipped Step activations
	const skippedStepActivations: SkippedStepTransitActivation[] = [];
	const skippedSteps = natalChart.nodalAxis.skippedSteps ?? [];

	for (const step of skippedSteps) {
		const stepBody = step.body.toLowerCase();
		const matchingAspects = aspectsToNatal.filter(
			(a) => a.natalPoint.toLowerCase() === stepBody,
		);

		for (const asp of matchingAspects) {
			skippedStepActivations.push({
				transitBody: asp.transitBody,
				skippedStepBody: step.body,
				aspect: asp.aspect,
				orb: asp.orb,
				isApplying: asp.isApplying,
				resolutionNode: step.resolutionNode,
			});
		}
	}

	// 5. Dispositor activations
	const dispositorBodies = new Set<string>();
	const chains = natalChart.dispositorChains;
	if (chains) {
		for (const chain of Object.values(chains)) {
			if (chain?.terminalBodies) {
				for (const b of chain.terminalBodies) {
					dispositorBodies.add(b.toLowerCase());
				}
			}
		}
	}

	const dispositorActivations = aspectsToNatal.filter((a) =>
		dispositorBodies.has(a.natalPoint.toLowerCase()),
	);

	return {
		plutoContacts,
		pppContacts,
		nodalContacts,
		skippedStepActivations,
		dispositorActivations,
	};
}
