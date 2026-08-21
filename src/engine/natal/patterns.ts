import type { Chart } from "caelus";
import {
	chartSignature,
	detectPatterns as detectCaelusPatterns,
	element,
	modality,
} from "caelus";
import type { AspectPattern, AstrologicalSignature } from "./types";

const PLANETARY_BODIES = new Set([
	"sun",
	"moon",
	"mercury",
	"venus",
	"mars",
	"jupiter",
	"saturn",
	"uranus",
	"neptune",
	"pluto",
]);

function isPlanet(bodyId: string): boolean {
	return PLANETARY_BODIES.has(bodyId);
}

export function detectAspectPatterns(rawChart: Chart): AspectPattern[] {
	const detected = detectCaelusPatterns(rawChart);
	const patterns: AspectPattern[] = [];

	for (const pattern of detected) {
		const base: AspectPattern = {
			type: pattern.kind,
			bodies: [...pattern.bodies].sort(),
			...(pattern.apex ? { apex: pattern.apex } : {}),
			...(pattern.sign ? { sign: pattern.sign } : {}),
			...(pattern.house !== undefined && pattern.house !== null
				? { house: pattern.house }
				: {}),
			...(pattern.orb !== undefined
				? { orb: Number(pattern.orb.toFixed(4)) }
				: {}),
		};

		switch (pattern.kind) {
			case "grand_trine": {
				const sign = pattern.bodies[0]
					? rawChart.bodies[pattern.bodies[0]]?.sign
					: undefined;
				patterns.push({
					...base,
					type: "grand_trine",
					...(sign ? { element: element(sign) } : {}),
				});
				break;
			}
			case "t_square": {
				const apexSign = pattern.apex
					? rawChart.bodies[pattern.apex]?.sign
					: undefined;
				patterns.push({
					...base,
					type: "t_square",
					...(apexSign ? { modality: modality(apexSign) } : {}),
				});
				break;
			}
			case "grand_cross":
				patterns.push({ ...base, type: "grand_cross" });
				break;
			case "yod":
				patterns.push({ ...base, type: "yod" });
				break;
			case "kite":
				patterns.push({ ...base, type: "kite" });
				break;
			case "mystic_rectangle":
				patterns.push({ ...base, type: "mystic_rectangle" });
				break;
			case "stellium_sign":
				patterns.push({
					...base,
					type: "stellium",
					...(pattern.sign ? { element: element(pattern.sign) } : {}),
					...(pattern.sign ? { modality: modality(pattern.sign) } : {}),
				});
				break;
			case "stellium_house":
				patterns.push({ ...base, type: "stellium_house" });
				break;
		}
	}

	return patterns;
}

export function calculateAstrologicalSignature(
	rawChart: Chart,
): AstrologicalSignature {
	const sig = chartSignature(rawChart, {
		bodies: Object.keys(rawChart.bodies).filter(isPlanet),
	});

	return {
		hemispheres: {
			eastern: sig.hemispheres.eastern ?? 0,
			western: sig.hemispheres.western ?? 0,
			northern: sig.hemispheres.above ?? 0,
			southern: sig.hemispheres.below ?? 0,
		},
		quadrants: {
			q1: sig.quadrants["1"] ?? 0,
			q2: sig.quadrants["2"] ?? 0,
			q3: sig.quadrants["3"] ?? 0,
			q4: sig.quadrants["4"] ?? 0,
		},
		elements: {
			fire: sig.elements.fire ?? 0,
			earth: sig.elements.earth ?? 0,
			air: sig.elements.air ?? 0,
			water: sig.elements.water ?? 0,
		},
		modalities: {
			cardinal: sig.modalities.cardinal ?? 0,
			mutable: sig.modalities.mutable ?? 0,
			fixed: sig.modalities.fixed ?? 0,
		},
	};
}
