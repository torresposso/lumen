import type { ChartBody } from "caelus";
import { findDeclinationAspect } from "./celestial-coordinates";

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
		| "stellium";
	bodies: string[];
	apex?: string;
	element?: "fire" | "earth" | "air" | "water";
	modality?: "cardinal" | "fixed" | "mutable";
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

/** Computes the elemental, modal, hemispheric, and quadrant distribution of chart bodies. */
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

/** Computes parallel and contraparallel declination aspects between chart bodies. */
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

/** Detects major geometric aspect patterns (Stelliums, Grand Trines, T-Squares, Yods). */
export function detectAspectPatterns(
	aspects: AspectProjectionLike[],
	bodies: Partial<Record<string, ChartBody>>,
): AspectPattern[] {
	const patterns: AspectPattern[] = [];

	const aspectMap = new Map<string, string>();
	for (const asp of aspects) {
		aspectMap.set(`${asp.a}-${asp.b}`, asp.aspect);
		aspectMap.set(`${asp.b}-${asp.a}`, asp.aspect);
	}

	const hasAspect = (a: string, b: string, asp: string) =>
		aspectMap.get(`${a}-${b}`) === asp;

	const bodyKeys = Object.keys(bodies).filter((k) => bodies[k] !== undefined);

	// Detect Stelliums (3+ bodies in the same sign)
	const signGroups: Record<string, string[]> = {};
	for (const k of bodyKeys) {
		const b = bodies[k];
		if (!b) continue;
		signGroups[b.sign] = signGroups[b.sign] ?? [];
		signGroups[b.sign].push(k);
	}
	for (const [sign, members] of Object.entries(signGroups)) {
		if (members.length >= 3) {
			patterns.push({
				type: "stellium",
				bodies: members,
				element: SIGN_ELEMENTS[sign],
				modality: SIGN_MODALITIES[sign],
			});
		}
	}

	// Detect 3-body aspect patterns: Grand Trine, T-Square, Yod
	for (let i = 0; i < bodyKeys.length; i++) {
		for (let j = i + 1; j < bodyKeys.length; j++) {
			for (let k = j + 1; k < bodyKeys.length; k++) {
				const a = bodyKeys[i];
				const b = bodyKeys[j];
				const c = bodyKeys[k];
				if (!a || !b || !c) continue;

				// Grand Trine: a-b, b-c, a-c all trine
				if (
					hasAspect(a, b, "trine") &&
					hasAspect(b, c, "trine") &&
					hasAspect(a, c, "trine")
				) {
					const sign = bodies[a]?.sign;
					patterns.push({
						type: "grand_trine",
						bodies: [a, b, c],
						element: sign ? SIGN_ELEMENTS[sign] : undefined,
					});
				}

				// T-Square: opposition + 2 squares to apex
				if (
					hasAspect(a, b, "opposition") &&
					hasAspect(a, c, "square") &&
					hasAspect(b, c, "square")
				) {
					const signC = bodies[c]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [a, b, c],
						apex: c,
						modality: signC ? SIGN_MODALITIES[signC] : undefined,
					});
				} else if (
					hasAspect(a, c, "opposition") &&
					hasAspect(a, b, "square") &&
					hasAspect(c, b, "square")
				) {
					const signB = bodies[b]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [a, c, b],
						apex: b,
						modality: signB ? SIGN_MODALITIES[signB] : undefined,
					});
				} else if (
					hasAspect(b, c, "opposition") &&
					hasAspect(b, a, "square") &&
					hasAspect(c, a, "square")
				) {
					const signA = bodies[a]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [b, c, a],
						apex: a,
						modality: signA ? SIGN_MODALITIES[signA] : undefined,
					});
				}

				// Yod: sextile + 2 quincunx to apex
				if (
					hasAspect(a, b, "sextile") &&
					hasAspect(a, c, "quincunx") &&
					hasAspect(b, c, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [a, b, c], apex: c });
				} else if (
					hasAspect(a, c, "sextile") &&
					hasAspect(a, b, "quincunx") &&
					hasAspect(c, b, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [a, c, b], apex: b });
				} else if (
					hasAspect(b, c, "sextile") &&
					hasAspect(b, a, "quincunx") &&
					hasAspect(c, a, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [b, c, a], apex: a });
				}
			}
		}
	}

	return patterns;
}
