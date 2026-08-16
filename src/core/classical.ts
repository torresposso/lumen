import type { Chart, ChartBody, HouseSystem } from "caelus";
import {
	type ChartPattern as CaelusChartPattern,
	detectPatternsIn as detectCaelusPatternsIn,
} from "caelus";
import type { EvolutionaryResult } from "./soul";
import type { Ephemeris, ResolvedBirth } from "./types";
import {
	angularDistance,
	findDeclinationAspect,
	isOrbWithin,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
	shiftLongitude,
	signOf,
} from "./types";

export interface LotsResult {
	spirit: ProjectedEclipticPoint;
	fortune: ProjectedEclipticPoint;
}

export interface FixedStarMatch {
	star: string;
	body: string;
	orb: number;
	sign: string;
}

const FIXED_STAR_ORB = 1.5;
const MAJOR_STAR_MAX_MAG = 2.5;

/** Computes the Hermetic Lots (Lot of Spirit and Lot of Fortune). */
export function computeHermeticLots(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
): LotsResult {
	const chartLots = ephemeris.lots(birth.jdUt, birth.lat, birth.lon);
	return {
		spirit: projectPoint(chartLots.spirit, cusps),
		fortune: projectPoint(chartLots.fortune, cusps),
	};
}

/** Evaluates major fixed-star conjunctions (orb <= 1.5°, magnitude <= 2.5). */
export function computeFixedStarMatches(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	bodies: Partial<Record<string, ChartBody>>,
	angles?: Chart["angles"],
): FixedStarMatch[] {
	const matches: FixedStarMatch[] = [];
	const targets: Array<{ id: string; lon: number }> = [];

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (body !== undefined) targets.push({ id: bodyId, lon: body.lon });
	}
	if (angles !== undefined) {
		for (const angleId of ["asc", "mc", "vertex", "eastPoint"] as const) {
			targets.push({ id: angleId, lon: angles[angleId] });
		}
	}

	for (const [starName, starEntry] of Object.entries(ephemeris.fixedStars())) {
		if (
			typeof starEntry.mag !== "number" ||
			starEntry.mag > MAJOR_STAR_MAX_MAG
		) {
			continue;
		}

		const starLon = normalizeLongitude(
			ephemeris.starLongitude(starEntry, birth.jdUt),
		);

		for (const target of targets) {
			if (isOrbWithin(target.lon, starLon, FIXED_STAR_ORB)) {
				const diff = angularDistance(target.lon, starLon);
				matches.push({
					star: starName,
					body: target.id,
					orb: roundPrecision(diff),
					sign: signOf(starLon),
				});
			}
		}
	}

	return matches.sort(
		(a, b) =>
			a.orb - b.orb ||
			a.star.localeCompare(b.star) ||
			a.body.localeCompare(b.body),
	);
}

// ---------------------------------------------------------------------------
// Draconic projection
// ---------------------------------------------------------------------------

export interface DraconicChart {
	nodeUsed: "true_node" | "mean_node";
	bodies: Partial<Record<string, ChartBody>>;
	angles: Chart["angles"];
	cusps: number[];
}

/** Re-projects a natal chart onto the lunar-node zodiac, North Node at 0° Aries. */
export function toDraconicChart(
	chart: Chart,
	nodeMode: "both" | "mean" | "true",
): DraconicChart {
	const nodeUsed: DraconicChart["nodeUsed"] =
		nodeMode === "mean" || chart.bodies.true_node === undefined
			? "mean_node"
			: "true_node";

	const nodeBody = chart.bodies[nodeUsed];
	if (nodeBody === undefined) {
		throw new Error(
			"Cannot compute Draconic chart: no lunar node position found in chart",
		);
	}

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

	if (nodeMode === "mean") {
		delete shiftedBodies.true_node;
	} else if (nodeMode === "true") {
		delete shiftedBodies.mean_node;
	}

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
// Prenatal eclipses
// ---------------------------------------------------------------------------

export interface EclipseInfo {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface EclipsesResult {
	solar?: EclipseInfo;
	lunar?: EclipseInfo;
}

/** Computes the prenatal solar and lunar eclipses within 180 days before birth. */
export function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
	houseSystem: HouseSystem,
	topocentric = false,
): EclipsesResult {
	const jdStart = birth.jdUt - 180;
	const jdEnd = birth.jdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (
		tMax: number,
		type: string,
		isLunar = false,
	): EclipseInfo => {
		const pos = ephemeris.chartAt(tMax, birth.lat, birth.lon, {
			houseSystem,
			topocentric,
		});
		const targetBody = isLunar ? pos.bodies.moon : pos.bodies.sun;
		if (!targetBody) {
			throw new Error(
				`${isLunar ? "Moon" : "Sun"} position unavailable for eclipse calculation`,
			);
		}
		const point = projectPoint(targetBody.lon, cusps);
		return {
			tMax: roundPrecision(tMax),
			type,
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
		};
	};

	return {
		solar: lastSolar
			? formatEclipse(lastSolar.tMax, lastSolar.type, false)
			: undefined,
		lunar: lastLunar
			? formatEclipse(lastLunar.tMax, lastLunar.type, true)
			: undefined,
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
	evolutionary?: EvolutionaryResult;
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
		for (const step of evo.skippedSteps) {
			atoms.push(`skipped_step_${step.body}`);
		}
		if (evo.solLunaPhase) {
			atoms.push(
				`sol_luna_phase_${evo.solLunaPhase.name.toLowerCase().replace(/\s+/g, "_")}`,
			);
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

export interface ClassicalProjections {
	draconic?: DraconicChart;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
}

/** High-level pure facade for auxiliary classical and draconic projections. */
export function computeClassicalProjections(
	chart: Chart,
	birth: ResolvedBirth,
	ephemeris: Ephemeris,
	options: {
		draconic?: boolean;
		lots?: boolean;
		stars?: boolean;
		nodeMode?: "both" | "mean" | "true";
	} = {},
): ClassicalProjections {
	const result: ClassicalProjections = {};

	if (options.draconic) {
		result.draconic = toDraconicChart(chart, options.nodeMode ?? "both");
	}

	if (options.lots) {
		result.lots = computeHermeticLots(ephemeris, birth, chart.cusps);
	}

	if (options.stars) {
		result.stars = computeFixedStarMatches(
			ephemeris,
			birth,
			chart.bodies,
			chart.angles,
		);
	}

	return result;
}
