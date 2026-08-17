import type { Chart, ChartBody } from "caelus";
import {
	type ChartPattern as CaelusChartPattern,
	detectPatternsIn as detectCaelusPatternsIn,
} from "caelus";
import {
	findDeclinationAspect,
	type NodeMotionStatus,
	SIGN_RULERS,
	shiftLongitude,
	signOf,
} from "./types";

// ---------------------------------------------------------------------------
// Draconic projection
// ---------------------------------------------------------------------------

export interface DraconicChart {
	nodeUsed: "true_node" | "mean_node";
	bodies: Partial<Record<string, ChartBody>>;
	angles: Chart["angles"];
	cusps: number[];
}

/** Re-projects a natal chart onto the lunar-node zodiac, true North Node at 0° Aries. */
export function toDraconicChart(chart: Chart): DraconicChart {
	const nodeBody = chart.bodies.true_node;
	if (nodeBody === undefined) {
		throw new Error(
			"Cannot compute Draconic chart: no true node position found in chart",
		);
	}
	const nodeUsed: DraconicChart["nodeUsed"] = "true_node";

	const nodeLon = nodeBody.lon;
	const shift = (lon: number): number => shiftLongitude(lon, nodeLon);

	const shiftedBodies: Partial<Record<string, ChartBody>> = {};
	for (const [id, body] of Object.entries(chart.bodies)) {
		if (body !== undefined) {
			const lon = shift(body.lon);
			shiftedBodies[id] = {
				...body,
				lon,
				sign: signOf(lon),
				signDeg: lon % 30,
			};
		}
	}

	delete shiftedBodies.mean_node;

	const shiftedAngles = {
		asc: shift(chart.angles.asc),
		mc: shift(chart.angles.mc),
		vertex: shift(chart.angles.vertex),
		eastPoint: shift(chart.angles.eastPoint),
	};

	const shiftedCusps = chart.cusps.map((cusp) => shift(cusp));

	return {
		nodeUsed,
		bodies: shiftedBodies,
		angles: shiftedAngles,
		cusps: shiftedCusps,
	};
}

// ---------------------------------------------------------------------------
// Chart synthesis: patterns, signatures, and fact atoms
// ---------------------------------------------------------------------------

export interface AspectProjectionLike {
	a: string;
	b: string;
	aspect: string;
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: "parallel" | "contraparallel";
	orb: number;
}

export interface AspectPattern {
	type:
		| "grand_trine"
		| "t_square"
		| "grand_cross"
		| "yod"
		| "kite"
		| "mystic_rectangle"
		| "stellium"
		| "stellium_house";
	bodies: string[];
	apex?: string;
	sign?: string;
	house?: number;
	element?: "fire" | "earth" | "air" | "water";
	modality?: "cardinal" | "fixed" | "mutable";
	orb?: number;
}

export interface ChartSignature {
	hemispheres: {
		eastern: number;
		western: number;
		northern: number;
		southern: number;
	};
	quadrants: {
		q1: number;
		q2: number;
		q3: number;
		q4: number;
	};
	elements: {
		fire: number;
		earth: number;
		air: number;
		water: number;
	};
	modalities: {
		cardinal: number;
		fixed: number;
		mutable: number;
	};
}

export const SIGN_ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> =
	{
		Aries: "fire",
		Leo: "fire",
		Sagittarius: "fire",
		Taurus: "earth",
		Virgo: "earth",
		Capricorn: "earth",
		Gemini: "air",
		Libra: "air",
		Aquarius: "air",
		Cancer: "water",
		Scorpio: "water",
		Pisces: "water",
	};

export const SIGN_MODALITIES: Record<string, "cardinal" | "fixed" | "mutable"> =
	{
		Aries: "cardinal",
		Cancer: "cardinal",
		Libra: "cardinal",
		Capricorn: "cardinal",
		Taurus: "fixed",
		Leo: "fixed",
		Scorpio: "fixed",
		Aquarius: "fixed",
		Gemini: "mutable",
		Virgo: "mutable",
		Sagittarius: "mutable",
		Pisces: "mutable",
	};

const CORE_SIGNATURE_BODIES = new Set([
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

export function computeChartSignature(
	bodies: Partial<Record<string, ChartBody>>,
): ChartSignature {
	const signature: ChartSignature = {
		hemispheres: { eastern: 0, western: 0, northern: 0, southern: 0 },
		quadrants: { q1: 0, q2: 0, q3: 0, q4: 0 },
		elements: { fire: 0, earth: 0, air: 0, water: 0 },
		modalities: { cardinal: 0, fixed: 0, mutable: 0 },
	};

	for (const [id, body] of Object.entries(bodies)) {
		if (!body || !CORE_SIGNATURE_BODIES.has(id)) continue;

		const h = body.house;
		if ([10, 11, 12, 1, 2, 3].includes(h)) signature.hemispheres.eastern++;
		if ([4, 5, 6, 7, 8, 9].includes(h)) signature.hemispheres.western++;
		if ([7, 8, 9, 10, 11, 12].includes(h)) signature.hemispheres.southern++;
		if ([1, 2, 3, 4, 5, 6].includes(h)) signature.hemispheres.northern++;

		if ([1, 2, 3].includes(h)) signature.quadrants.q1++;
		else if ([4, 5, 6].includes(h)) signature.quadrants.q2++;
		else if ([7, 8, 9].includes(h)) signature.quadrants.q3++;
		else if ([10, 11, 12].includes(h)) signature.quadrants.q4++;

		const el = SIGN_ELEMENTS[body.sign];
		if (el) signature.elements[el]++;

		const mod = SIGN_MODALITIES[body.sign];
		if (mod) signature.modalities[mod]++;
	}

	return signature;
}

export function computeDeclinationAspects(
	bodies: Partial<Record<string, ChartBody>>,
): DeclinationAspectProjection[] {
	const results: DeclinationAspectProjection[] = [];
	const entries = Object.entries(bodies).filter(
		([_, b]) => b !== undefined,
	) as [string, ChartBody][];

	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			const entryI = entries[i];
			const entryJ = entries[j];
			if (!entryI || !entryJ) continue;
			const [idA, bodyA] = entryI;
			const [idB, bodyB] = entryJ;
			if (bodyA.dec !== undefined && bodyB.dec !== undefined) {
				const match = findDeclinationAspect(bodyA.dec, bodyB.dec);
				if (match) {
					results.push({
						a: idA,
						b: idB,
						aspect: match.aspect,
						orb: match.orb,
					});
				}
			}
		}
	}
	return results;
}

export function detectAspectPatterns(
	_aspects: AspectProjectionLike[],
	bodies: Partial<Record<string, ChartBody>>,
): AspectPattern[] {
	const bodyMap: Record<string, { lon: number; house?: number | null }> = {};
	for (const [id, body] of Object.entries(bodies)) {
		if (body !== undefined) {
			bodyMap[id] = { lon: body.lon, house: body.house };
		}
	}

	const detected = detectCaelusPatternsIn(bodyMap);
	const patterns: AspectPattern[] = [];

	for (const pattern of detected) {
		const converted = toAspectPattern(pattern, bodies);
		if (converted !== undefined) patterns.push(converted);
	}

	return patterns;
}

function toAspectPattern(
	pattern: CaelusChartPattern,
	bodies: Partial<Record<string, ChartBody>>,
): AspectPattern | undefined {
	const base = {
		bodies: pattern.bodies,
		apex: pattern.apex,
		sign: pattern.sign,
		house: pattern.house,
		orb: pattern.orb,
	};

	switch (pattern.kind) {
		case "grand_trine": {
			const sign = pattern.bodies[0]
				? bodies[pattern.bodies[0]]?.sign
				: undefined;
			return {
				...base,
				type: "grand_trine",
				element: sign ? SIGN_ELEMENTS[sign] : undefined,
			};
		}
		case "t_square": {
			const apexSign = pattern.apex ? bodies[pattern.apex]?.sign : undefined;
			return {
				...base,
				type: "t_square",
				modality: apexSign ? SIGN_MODALITIES[apexSign] : undefined,
			};
		}
		case "grand_cross":
			return { ...base, type: "grand_cross" };
		case "yod":
			return { ...base, type: "yod" };
		case "kite":
			return { ...base, type: "kite" };
		case "mystic_rectangle":
			return { ...base, type: "mystic_rectangle" };
		case "stellium_sign":
			return {
				...base,
				type: "stellium",
				element: pattern.sign ? SIGN_ELEMENTS[pattern.sign] : undefined,
				modality: pattern.sign ? SIGN_MODALITIES[pattern.sign] : undefined,
			};
		case "stellium_house":
			return { ...base, type: "stellium_house" };
		default:
			return undefined;
	}
}

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
}

/** Generates deterministic astrological fact atoms for LLM interpretation. */
export function generateFactAtoms(
	chart: FactAtomsInput,
): InterpretationContext {
	const atoms: string[] = [];

	for (const [id, body] of Object.entries(chart.bodies)) {
		if (!body) continue;
		atoms.push(`${id}_sign_${body.sign.toLowerCase()}`);
		atoms.push(`${id}_house_${body.house}`);
		if (body.retrograde) atoms.push(`${id}_retrograde`);
	}

	if (chart.cusps) {
		chart.cusps.forEach((c, idx) => {
			const houseNum = idx + 1;
			const signName = c.sign;
			atoms.push(`house_${houseNum}_sign_${signName.toLowerCase()}`);
			const ruler = SIGN_RULERS[signName];
			if (ruler) atoms.push(`house_${houseNum}_ruler_${ruler}`);
		});
	}

	for (const asp of chart.aspects) {
		atoms.push(`aspect_${asp.a}_${asp.aspect}_${asp.b}`);
	}

	if (chart.declinationAspects) {
		for (const dec of chart.declinationAspects) {
			atoms.push(`declination_${dec.aspect}_${dec.a}_${dec.b}`);
		}
	}

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

export interface EvoAtomsInput {
	plutoAspectCount: number;
	plutoStressfulCount: number;
	plutoNonstressfulCount: number;
	ppp: { sign: string; house: number; active: boolean };
	plutoNorthNodeSeparation?: number;
	midpoint?: { sign: string; signDeg: number };
	antiMidpoint?: { sign: string; signDeg: number };
	phase?: string;
	northNodeRuler?: string;
	southNodeRuler?: string;
	northNodeAspectCount: number;
	southNodeAspectCount: number;
	nodalMotion: NodeMotionStatus;
	skippedSteps: { body: string; aspect: string }[];
	eclipses: Array<{
		kind: "solar" | "lunar";
		type: string;
		sign: string;
		signDeg: number;
	}>;
}

/** Renders a rounded degree as a dot-free atom chunk: 73.44 -> "73_44". */
function degreeAtom(value: number): string {
	return value.toFixed(2).replace(".", "_");
}

/** Flattens "Disseminating" / "First Quarter" into snake_case identifiers. */
function snakeAtom(value: string): string {
	return value.toLowerCase().replace(/\s+/g, "_");
}

/** Generates deterministic factual atoms for the evolutionary mechanics block (`--evo`). */
export function generateEvoAtoms(input: EvoAtomsInput): string[] {
	const atoms: string[] = [];

	atoms.push(`pluto_aspects_${input.plutoAspectCount}`);
	atoms.push(`pluto_stressful_aspects_${input.plutoStressfulCount}`);
	atoms.push(`pluto_nonstressful_aspects_${input.plutoNonstressfulCount}`);

	atoms.push(`ppp_sign_${input.ppp.sign.toLowerCase()}`);
	atoms.push(`ppp_house_${input.ppp.house}`);
	atoms.push(input.ppp.active ? "ppp_active" : "ppp_inactive");
	if (input.plutoNorthNodeSeparation !== undefined) {
		atoms.push(
			`pluto_nn_separation_${degreeAtom(input.plutoNorthNodeSeparation)}`,
		);
	}

	if (input.midpoint) {
		atoms.push(
			`pluto_nn_midpoint_${input.midpoint.sign.toLowerCase()}_${Math.floor(input.midpoint.signDeg)}`,
		);
	}
	if (input.antiMidpoint) {
		atoms.push(
			`pluto_nn_antimidpoint_${input.antiMidpoint.sign.toLowerCase()}_${Math.floor(input.antiMidpoint.signDeg)}`,
		);
	}

	if (input.phase) atoms.push(`sol_luna_phase_${snakeAtom(input.phase)}`);

	if (input.northNodeRuler)
		atoms.push(`north_node_ruler_${input.northNodeRuler}`);
	if (input.southNodeRuler)
		atoms.push(`south_node_ruler_${input.southNodeRuler}`);
	atoms.push(`north_node_aspects_${input.northNodeAspectCount}`);
	atoms.push(`south_node_aspects_${input.southNodeAspectCount}`);
	atoms.push(`nodal_motion_${input.nodalMotion}`);

	atoms.push(`skipped_steps_${input.skippedSteps.length}`);
	for (const step of input.skippedSteps) {
		atoms.push(`skipped_${step.body}_${step.aspect}`);
	}

	for (const eclipse of input.eclipses) {
		atoms.push(
			`${eclipse.kind}_eclipse_${eclipse.type}_${eclipse.sign.toLowerCase()}_${Math.floor(eclipse.signDeg)}`,
		);
	}

	return atoms;
}
