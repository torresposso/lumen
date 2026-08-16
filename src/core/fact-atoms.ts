import type { ChartBody } from "caelus";
import { SIGN_RULERS } from "./celestial-coordinates";
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
	cusps?: { lon: number; sign: string; signDeg: number }[];
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

	// House Cusps & Lords
	if (chart.cusps) {
		chart.cusps.forEach((c, idx) => {
			const houseNum = idx + 1;
			const signName = c.sign;
			atoms.push(`house_${houseNum}_sign_${signName.toLowerCase()}`);
			const ruler = SIGN_RULERS[signName];
			if (ruler) {
				atoms.push(`house_${houseNum}_ruler_${ruler}`);
			}
		});
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
			if (p.type === "stellium_house") {
				atoms.push(`pattern_stellium_house_${p.house ?? p.bodies.join("_")}`);
				continue;
			}
			const qualifier = p.sign
				? `_sign_${p.sign.toLowerCase()}`
				: p.house
					? `_house_${p.house}`
					: p.apex
						? `_apex_${p.apex}`
						: p.element
							? `_element_${p.element}`
							: "";
			atoms.push(`pattern_${p.type}${qualifier}`);
		}
	}

	// Evolutionary
	if (chart.evolutionary) {
		const evo = chart.evolutionary;
		if (evo.pluto) {
			atoms.push(`pluto_sign_${evo.pluto.sign.toLowerCase()}`);
			atoms.push(`pluto_house_${evo.pluto.house}`);
			atoms.push(`pluto_nodal_${evo.pluto.nodalRelationship.aspect}`);
			if (evo.pluto.nodalConjunction) {
				atoms.push(`pluto_conjunct_${evo.pluto.nodalConjunction}`);
			}
			if (evo.pluto.nodalRelationship.aspect !== "none") {
				atoms.push(
					`pluto_polarity_point_${
						evo.pluto.nodalRelationship.polarityPointApplies
							? "applies"
							: "does_not_apply"
					}`,
				);
			}
			if (evo.pluto.nodalRelationship.applyingNode) {
				atoms.push(
					`pluto_applying_to_${evo.pluto.nodalRelationship.applyingNode}`,
				);
			}
			if (evo.pluto.nodalRelationship.southNodeConjunction) {
				atoms.push("pluto_south_node_condition_requires_human_confirmation");
			}
			for (const aspect of evo.pluto.aspects) {
				atoms.push(
					`pluto_aspect_${aspect.body}_${aspect.aspect}_${aspect.stress}${
						aspect.phase ? `_${aspect.phase}` : ""
					}`,
				);
			}
		}
		if (evo.polarityPoint) {
			atoms.push(
				`pluto_polarity_point_sign_${evo.polarityPoint.sign.toLowerCase()}`,
			);
			atoms.push(`pluto_polarity_point_house_${evo.polarityPoint.house}`);
			if (evo.polarityPoint.isOperative) {
				atoms.push("pluto_polarity_point_operative");
			} else {
				atoms.push("pluto_polarity_point_inactive");
			}
		}
		if (evo.nodes.northNode) {
			atoms.push(`north_node_sign_${evo.nodes.northNode.sign.toLowerCase()}`);
			atoms.push(`north_node_house_${evo.nodes.northNode.house}`);
			for (const aspect of evo.nodes.northNode.aspects) {
				atoms.push(
					`north_node_aspect_${aspect.body}_${aspect.aspect}_${aspect.stress}`,
				);
			}
		}
		if (evo.nodes.southNode) {
			atoms.push(`south_node_sign_${evo.nodes.southNode.sign.toLowerCase()}`);
			atoms.push(`south_node_house_${evo.nodes.southNode.house}`);
			for (const aspect of evo.nodes.southNode.aspects) {
				atoms.push(
					`south_node_aspect_${aspect.body}_${aspect.aspect}_${aspect.stress}`,
				);
			}
		}
		if (evo.nodes.motionStatus) {
			atoms.push(`node_motion_${evo.nodes.motionStatus}`);
		}
		// One skipped step per body: the square is to the nodal axis as a whole.
		for (const step of evo.skippedSteps) {
			atoms.push(`skipped_step_${step.body}`);
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
