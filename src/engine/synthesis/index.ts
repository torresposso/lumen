import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import { toonProfile } from "../../domain/toon";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart, extractNatalInterpretation } from "../natal/index";
import {
	computeProgressedChart,
	extractProgressionsInterpretation,
} from "../progressions/index";
import {
	computeTransitChart,
	extractTransitsInterpretation,
} from "../transits/index";
import type {
	EvolutionarySynthesisOutput,
	PlutoNodePressure,
	SkippedStepActivation,
} from "./types";

export type {
	EvolutionaryDynamics,
	EvolutionarySynthesisOutput,
	PlutoNodePressure,
	SkippedStepActivation,
} from "./types";

export const SYNTHESIS_METHOD =
	"JWGEA 3-Layer Soul Stack Evolutionary Synthesis";

const MAJOR_ASPECTS = new Set([
	"conjunction",
	"square",
	"opposition",
	"trine",
	"sextile",
]);

/**
 * Computes the unified 3-layer evolutionary synthesis + cross-dynamics layer
 * over a natal profile at a target moment.
 */
export function computeEvolutionarySynthesis(
	natalProfile: Profile,
	targetInput: TransitTargetInput,
	ephemeris: Ephemeris,
): EvolutionarySynthesisOutput {
	const natalChart = computeNatalChart(natalProfile, ephemeris);
	const natalInterp = extractNatalInterpretation(natalChart);

	const progressedChart = computeProgressedChart(
		natalProfile,
		targetInput,
		ephemeris,
	);
	const progressionsInterp = extractProgressionsInterpretation(progressedChart);

	const transitChart = computeTransitChart(
		natalProfile,
		targetInput,
		ephemeris,
	);
	const transitsInterp = extractTransitsInterpretation(transitChart);

	// 1. Skipped Step Activations
	// Active transiting bodies aspecting natal skipped steps
	const skippedSteps = natalInterp.natalInterpretation.karmicRoot.skippedSteps;
	const skippedStepsMap = new Map(
		skippedSteps.map((s) => [s.planet.toLowerCase(), s]),
	);

	const skippedStepActivations: SkippedStepActivation[] = [];
	for (const trigger of transitsInterp.transitsInterpretation.activeTriggers) {
		const step = skippedStepsMap.get(trigger.natalPoint.toLowerCase());
		if (step) {
			const resNodeKey = step.resolutionNode;
			const targetNodeInfo =
				resNodeKey === "north"
					? natalInterp.natalInterpretation.karmicRoot.nodalAxis.northNode
					: natalInterp.natalInterpretation.karmicRoot.nodalAxis.southNode;
			const nodeLabel = resNodeKey === "north" ? "North Node" : "South Node";
			const mandate = `Integration through ${nodeLabel} in ${targetNodeInfo.sign} House ${targetNodeInfo.house}`;

			skippedStepActivations.push({
				transitingBody: trigger.transitingBody,
				skippedPlanet: step.planet,
				aspect: trigger.aspect,
				orb: trigger.orb,
				resolutionNode: resNodeKey,
				evolutionaryMandate: mandate,
			});
		}
	}

	// 2. Pluto / Node Pressure
	// Transits forming major aspects (<= 3° orb) to Pluto, PPP (if active), North Node, South Node
	const plutoNodePressure: PlutoNodePressure[] = [];
	for (const trigger of transitsInterp.transitsInterpretation.activeTriggers) {
		if (trigger.orb > 3.0 || !MAJOR_ASPECTS.has(trigger.aspect.toLowerCase())) {
			continue;
		}

		const ptLower = trigger.natalPoint.toLowerCase();
		let targetPoint: PlutoNodePressure["targetPoint"] | undefined;

		if (ptLower === "pluto") {
			targetPoint = "pluto";
		} else if (ptLower === "ppp" && natalChart.ppp.active) {
			targetPoint = "ppp";
		} else if (ptLower === "true_node" || ptLower === "north_node") {
			targetPoint = "north_node";
		} else if (ptLower === "south_node") {
			targetPoint = "south_node";
		}

		if (targetPoint) {
			plutoNodePressure.push({
				transitingBody: trigger.transitingBody,
				targetPoint,
				aspect: trigger.aspect,
				orb: trigger.orb,
			});
		}
	}

	// 3. Phase Context Guidance
	const solLuna = progressionsInterp.progressionsInterpretation.solLunaPhase;
	const phaseContextGuidance = `${solLuna.phaseName} Phase: ${solLuna.description}`;

	const pInterp = progressionsInterp.progressionsInterpretation;
	const tInterp = transitsInterp.transitsInterpretation;

	return {
		synthesis: {
			profile: toonProfile(natalProfile),
			targetMoment: {
				when: targetInput.dateTime,
				...(targetInput.place ? { where: targetInput.place } : {}),
				jdUt: targetInput.jdUt,
			},
			karmicRoot: natalInterp.natalInterpretation.karmicRoot,
			soulClock: {
				...pInterp.solLunaPhase,
				progressedSun: pInterp.progressedSun,
				progressedMoon: pInterp.progressedMoon,
				progressedTriggers: pInterp.progressedTriggers,
			},
			cosmicTriggers: {
				activeTransits: tInterp.activeTriggers,
				outOfBoundsTransits: tInterp.outOfBoundsTransits,
			},
			evolutionaryDynamics: {
				skippedStepActivations,
				plutoNodePressure,
				phaseContextGuidance,
			},
			method: SYNTHESIS_METHOD,
		},
	};
}
