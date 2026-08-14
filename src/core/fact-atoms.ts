import type { ChartBody } from "caelus";
import type {
	AspectPattern,
	ChartSignature,
	DeclinationAspectProjection,
} from "./chart-patterns";
import type { EvolutionaryResult } from "./evolutionary-astrology";

export interface InterpretationContext {
	atoms: string[];
}

export interface FactAtomsInput {
	bodies: Partial<Record<string, ChartBody>>;
	aspects: { a: string; b: string; aspect: string }[];
	declinationAspects?: DeclinationAspectProjection[];
	patterns?: AspectPattern[];
	signature?: ChartSignature;
	evolutionary?: EvolutionaryResult;
}

/** Generates deterministic astrological fact atoms from the chart synthesis for LLM and semantic interpretation. */
export function generateFactAtoms(
	chart: FactAtomsInput,
): InterpretationContext {
	const atoms: string[] = [];

	// Bodies
	for (const [id, body] of Object.entries(chart.bodies)) {
		if (!body) continue;
		atoms.push(`${id}_sign_${body.sign.toLowerCase()}`);
		atoms.push(`${id}_house_${body.house}`);
		if (body.retrograde) {
			atoms.push(`${id}_retrograde`);
		}
	}

	// Aspects
	for (const asp of chart.aspects) {
		atoms.push(`aspect_${asp.a}_${asp.aspect}_${asp.b}`);
	}

	// Declination aspects
	if (chart.declinationAspects) {
		for (const dec of chart.declinationAspects) {
			atoms.push(`declination_${dec.aspect}_${dec.a}_${dec.b}`);
		}
	}

	// Patterns
	if (chart.patterns) {
		for (const p of chart.patterns) {
			atoms.push(`pattern_${p.type}${p.apex ? `_apex_${p.apex}` : ""}`);
		}
	}

	// Evolutionary
	if (chart.evolutionary) {
		const evo = chart.evolutionary;
		if (evo.pluto) {
			atoms.push(`pluto_sign_${evo.pluto.sign.toLowerCase()}`);
			atoms.push(`pluto_house_${evo.pluto.house}`);
			if (evo.pluto.nodalConjunction) {
				atoms.push(`pluto_conjunct_${evo.pluto.nodalConjunction}`);
			}
		}
		if (evo.polarityPoint) {
			atoms.push(
				`pluto_polarity_point_${evo.polarityPoint.sign.toLowerCase()}_house_${evo.polarityPoint.house}`,
			);
			if (evo.polarityPoint.isOperative) {
				atoms.push("pluto_polarity_point_operative");
			}
		}
		if (evo.nodes.northNode) {
			atoms.push(`north_node_sign_${evo.nodes.northNode.sign.toLowerCase()}`);
			atoms.push(`north_node_house_${evo.nodes.northNode.house}`);
		}
		if (evo.nodes.southNode) {
			atoms.push(`south_node_sign_${evo.nodes.southNode.sign.toLowerCase()}`);
			atoms.push(`south_node_house_${evo.nodes.southNode.house}`);
		}
		if (evo.nodes.motionStatus) {
			atoms.push(`node_motion_${evo.nodes.motionStatus}`);
		}
		for (const step of evo.skippedSteps) {
			atoms.push(
				`skipped_step_${step.body}_squares_${step.target}${step.resolutionNode ? `_resolves_${step.resolutionNode}` : ""}`,
			);
		}
		if (evo.solLunaPhase) {
			atoms.push(
				`sol_luna_phase_${evo.solLunaPhase.name.toLowerCase().replace(/\s+/g, "_")}`,
			);
		}
	}

	// Signature Dominants
	if (chart.signature) {
		const { elements, modalities, quadrants, hemispheres } = chart.signature;
		const sortedEl = Object.entries(elements).sort((a, b) => b[1] - a[1]);
		if (sortedEl[0] && sortedEl[0][1] > 0)
			atoms.push(`dominant_element_${sortedEl[0][0]}`);

		const sortedMod = Object.entries(modalities).sort((a, b) => b[1] - a[1]);
		if (sortedMod[0] && sortedMod[0][1] > 0)
			atoms.push(`dominant_modality_${sortedMod[0][0]}`);

		const sortedQuad = Object.entries(quadrants).sort((a, b) => b[1] - a[1]);
		if (sortedQuad[0] && sortedQuad[0][1] > 0)
			atoms.push(`dominant_quadrant_${sortedQuad[0][0]}`);

		if (hemispheres.eastern > hemispheres.western)
			atoms.push("dominant_hemisphere_eastern");
		else if (hemispheres.western > hemispheres.eastern)
			atoms.push("dominant_hemisphere_western");

		if (hemispheres.northern > hemispheres.southern)
			atoms.push("dominant_hemisphere_northern");
		else if (hemispheres.southern > hemispheres.northern)
			atoms.push("dominant_hemisphere_southern");
	}

	return { atoms };
}
