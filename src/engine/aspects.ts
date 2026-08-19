/**
 * Parametric aspect calculus and ecliptic geometry — internal to the natal
 * engine. Only imported by `natal.ts` and not by external callers.
 * Encapsulates coordinate normalization, orb evaluation, house rulerships,
 * and ecliptic geometry projections.
 */
import type { BodyId, Chart } from "caelus";

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

export interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: "applying" | "separating" | "exact";
	strength: number;
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
}

export interface ChartBodyProjection {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	lat: number;
	dist: number | null;
	ra: number;
	dec: number;
	dignities: string[];
}

export interface AngleProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface CuspProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface HouseRulerRow {
	house: number;
	sign: string;
	ruler: string;
}

export interface EclipticGeometryProjection {
	bodies: Record<string, ChartBodyProjection>;
	angles: {
		asc: AngleProjection;
		mc: AngleProjection;
		vertex: AngleProjection;
		eastPoint: AngleProjection;
	};
	cusps: CuspProjection[];
	aspects: AspectProjection[];
	declinationAspects: DeclinationAspectProjection[];
	houseRulers: HouseRulerRow[];
	phase?: string;
}

export interface PlutoAspectProjection {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

export interface PPPAspectProjection {
	body: string;
	aspect: string;
	orb: number;
}

export interface NodeAspectProjection {
	body: string;
	aspect: string;
	orb: number;
	stress: "stressful" | "nonstressful";
}

export interface SkippedStepProjection {
	body: string;
	aspect: string;
	orb: number;
}

export interface AstrologicalSignature {
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

const SIGNS = [
	"Aries",
	"Taurus",
	"Gemini",
	"Cancer",
	"Leo",
	"Virgo",
	"Libra",
	"Scorpio",
	"Sagittarius",
	"Capricorn",
	"Aquarius",
	"Pisces",
] as const;

export const SIGN_RULERS: Record<string, string> = {
	Aries: "mars",
	Taurus: "venus",
	Gemini: "mercury",
	Cancer: "moon",
	Leo: "sun",
	Virgo: "mercury",
	Libra: "venus",
	Scorpio: "pluto",
	Sagittarius: "jupiter",
	Capricorn: "saturn",
	Aquarius: "uranus",
	Pisces: "neptune",
};

export const SIGN_ELEMENTS: Record<string, string> = {
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

export const SIGN_MODALITIES: Record<string, string> = {
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

const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

export const DEFAULT_BODIES: BodyId[] = [
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
	"chiron",
	"true_node",
];

const MAJOR_ASPECT_DEFS = [
	{ name: "conjunction", target: 0, orb: 8 },
	{ name: "sextile", target: 60, orb: 6 },
	{ name: "square", target: 90, orb: 7 },
	{ name: "trine", target: 120, orb: 8 },
	{ name: "opposition", target: 180, orb: 8 },
] as const;

export const PLUTO_ASPECTS: StressedAspectDef[] = [
	{ name: "conjunction", target: 0, orb: 10, stress: "stressful" },
	{ name: "semisextile", target: 30, orb: 3, stress: "nonstressful" },
	{ name: "semisquare", target: 45, orb: 3, stress: "stressful" },
	{ name: "septile", target: 360 / 7, orb: 2, stress: "nonstressful" },
	{ name: "sextile", target: 60, orb: 6, stress: "nonstressful" },
	{ name: "quintile", target: 72, orb: 2, stress: "nonstressful" },
	{ name: "square", target: 90, orb: 8, stress: "stressful" },
	{ name: "trine", target: 120, orb: 8, stress: "nonstressful" },
	{ name: "sesquiquadrate", target: 135, orb: 3, stress: "stressful" },
	{ name: "biquintile", target: 144, orb: 2, stress: "nonstressful" },
	{ name: "quincunx", target: 150, orb: 3, stress: "stressful" },
	{ name: "opposition", target: 180, orb: 10, stress: "stressful" },
];

export const PPP_MAJOR_ASPECTS = [
	{ name: "conjunction", target: 0, orb: 5 },
	{ name: "sextile", target: 60, orb: 5 },
	{ name: "square", target: 90, orb: 5 },
	{ name: "trine", target: 120, orb: 5 },
	{ name: "opposition", target: 180, orb: 5 },
] as const;

export const PPP_DEACTIVATION_ORB = 3;

const SKIPPED_STEPS_ORB = 5;

export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

function angularDistanceDirect(lonFrom: number, lonTo: number): number {
	return normalizeLongitude(lonTo - lonFrom);
}

function signOf(lon: number): string {
	const norm = normalizeLongitude(lon);
	const idx = Math.floor(norm / 30) % 12;
	const sign = SIGNS[idx];
	if (!sign) throw new Error(`unreachable: sign index ${idx} out of range`);
	return sign;
}

function houseOf(cusps: number[], lon: number): number {
	if (!cusps || cusps.length < 12) return 1;
	const normLon = normalizeLongitude(lon);
	for (let i = 0; i < 12; i++) {
		const curr = cusps[i];
		const next = cusps[(i + 1) % 12];
		if (curr === undefined || next === undefined) continue;
		if (curr < next) {
			if (normLon >= curr && normLon < next) return i + 1;
		} else {
			if (normLon >= curr || normLon < next) return i + 1;
		}
	}
	return 1;
}

export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}

export function projectPoint(
	rawLon: number,
	cusps?: number[],
	digits = 4,
): ProjectedEclipticPoint {
	const norm = normalizeLongitude(rawLon);
	const lon = normalizeLongitude(roundPrecision(norm, digits));
	let signDeg = roundPrecision(norm % 30, digits);
	let sign = signOf(norm);
	if (signDeg >= 30) {
		signDeg = 0;
		sign = signOf((norm + 30) % 360);
	}
	const house = cusps && cusps.length >= 12 ? houseOf(cusps, norm) : 1;
	return { lon, sign, signDeg, house };
}

function matchClosestAspect<
	T extends { name: string; target: number; orb: number },
>(
	lonA: number,
	lonB: number,
	aspectDefs: readonly T[],
): { def: T; orb: number } | undefined {
	const dist = angularDistance(lonA, lonB);
	let best: { def: T; orb: number } | undefined;
	for (const def of aspectDefs) {
		const orb = Math.abs(dist - def.target);
		if (orb <= def.orb && (best === undefined || orb < best.orb)) {
			best = { def, orb };
		}
	}
	return best;
}

function findAspect(
	lonA: number,
	lonB: number,
	aspects: readonly { name: string; target: number; orb: number }[],
): { aspect: string; target: number; orb: number } | undefined {
	const match = matchClosestAspect(lonA, lonB, aspects);
	if (!match) return undefined;
	return {
		aspect: match.def.name,
		target: match.def.target,
		orb: roundPrecision(match.orb),
	};
}

function determineAspectPhase(
	speedA: number,
	lonA: number,
	speedB: number,
	lonB: number,
	target: number,
): "applying" | "separating" | "exact" {
	const relSpeed = speedA - speedB;
	let diff = (lonA - lonB) % 360;
	if (diff < 0) diff += 360;
	if (diff > 180) diff -= 360;

	const dev = Math.abs(diff) - target;
	if (Math.abs(dev) < 1e-6 || Math.abs(relSpeed) < 1e-6) return "exact";

	const rateOfDistanceChange =
		(Math.abs(diff) > target ? 1 : -1) * (diff > 0 ? relSpeed : -relSpeed);
	return rateOfDistanceChange < 0 ? "applying" : "separating";
}

function eachPair<T>(
	items: readonly T[],
	fn: (a: T, b: T) => void,
): void {
	for (let i = 0; i < items.length; i++) {
		const a = items[i];
		if (!a) continue;
		for (let j = i + 1; j < items.length; j++) {
			const b = items[j];
			if (!b) continue;
			fn(a, b);
		}
	}
}

function findDeclinationAspect(
	decA: number,
	decB: number,
	maxOrb = 1.2,
): { aspect: "parallel" | "contraparallel"; orb: number } | undefined {
	const isSameHemisphere = (decA >= 0 && decB >= 0) || (decA <= 0 && decB <= 0);

	if (isSameHemisphere) {
		const diff = Math.abs(decA - decB);
		if (diff <= maxOrb) {
			return { aspect: "parallel", orb: roundPrecision(diff, 4) };
		}
	} else {
		const diff = Math.abs(Math.abs(decA) - Math.abs(decB));
		if (diff <= maxOrb) {
			return { aspect: "contraparallel", orb: roundPrecision(diff, 4) };
		}
	}

	return undefined;
}

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

const PHASES: readonly { name: SolLunaPhaseName; max: number }[] = [
	{ name: "New", max: 45 },
	{ name: "Crescent", max: 90 },
	{ name: "First Quarter", max: 135 },
	{ name: "Gibbous", max: 180 },
	{ name: "Full", max: 225 },
	{ name: "Disseminating", max: 270 },
	{ name: "Last Quarter", max: 315 },
	{ name: "Balsamic", max: 360 },
];

function computeSolLunaPhase(sunLon: number, moonLon: number): string {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];
	return phase ? phase.name : "Balsamic";
}

export function buildDispositorChain(
	bodies: Record<string, { sign: string }>,
	startBodyId: string,
	maxDepth = 5,
): DispositorStep[] {
	const chain: DispositorStep[] = [];
	let currentId = startBodyId;
	const visited = new Set<string>();

	for (let i = 0; i < maxDepth; i++) {
		const body = bodies[currentId];
		if (!body || visited.has(currentId)) break;
		visited.add(currentId);

		const ruler = SIGN_RULERS[body.sign];
		if (!ruler) break;

		chain.push({ body: currentId, sign: body.sign, ruler });
		if (ruler === currentId) break;
		currentId = ruler;
	}

	return chain;
}

export interface EvaluatedPointAspect {
	body: string;
	aspect: string;
	orb: number;
	stress?: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

/**
 * Evaluates aspects between a collection of bodies and a target point or body,
 * applying definitions, orb checks, optional phase calculus, and canonical sorting.
 */
export function evaluateAspectsAgainstPoint<
	TDef extends {
		name: string;
		target: number;
		orb: number;
		stress?: AspectStress;
	},
>(
	bodies: Record<string, { lon: number; speed?: number }>,
	target: { lon: number; speed?: number; excludeId?: string },
	aspectDefs: readonly TDef[],
	options: {
		excludeNonPlanetary?: boolean;
		includePhase?: boolean;
		precision?: number;
	} = {},
): EvaluatedPointAspect[] {
	const precision = options.precision ?? 4;
	const results: EvaluatedPointAspect[] = [];

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body) continue;
		if (target.excludeId && bodyId === target.excludeId) continue;
		if (options.excludeNonPlanetary && NON_PLANETARY_IDS.has(bodyId)) continue;

		const match = matchClosestAspect(body.lon, target.lon, aspectDefs);
		if (match) {
			const aspectItem: EvaluatedPointAspect = {
				body: bodyId,
				aspect: match.def.name,
				orb: roundPrecision(match.orb, precision),
				...(match.def.stress ? { stress: match.def.stress } : {}),
			};

			if (
				options.includePhase &&
				body.speed !== undefined &&
				target.speed !== undefined
			) {
				aspectItem.phase = determineAspectPhase(
					body.speed,
					body.lon,
					target.speed,
					target.lon,
					match.def.target,
				);
			}

			results.push(aspectItem);
		}
	}

	return results.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}

function projectBodies(
	rawBodies: Chart["bodies"],
	cusps: number[],
): Record<string, ChartBodyProjection> {
	const result: Record<string, ChartBodyProjection> = {};

	for (const [id, body] of Object.entries(rawBodies)) {
		if (!body) continue;
		const point = projectPoint(body.lon, cusps, 4);
		result[id] = {
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			lat: roundPrecision(body.lat, 4),
			dist: body.dist !== null ? roundPrecision(body.dist, 4) : null,
			ra: roundPrecision(body.ra, 4),
			dec: roundPrecision(body.dec, 4),
			dignities: body.dignities ?? [],
		};
	}

	return result;
}

function angleLon(val: number | { lon: number }): number {
	return typeof val === "number" ? val : val.lon;
}

function projectAngles(angles: Chart["angles"]): {
	asc: AngleProjection;
	mc: AngleProjection;
	vertex: AngleProjection;
	eastPoint: AngleProjection;
} {
	const project = (val: number | { lon: number }): AngleProjection => {
		const pt = projectPoint(angleLon(val));
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	};

	return {
		asc: project(angles.asc),
		mc: project(angles.mc),
		vertex: project(angles.vertex),
		eastPoint: project(angles.eastPoint),
	};
}

function projectCusps(rawCusps: number[]): CuspProjection[] {
	return rawCusps.map((cuspLon) => {
		const pt = projectPoint(cuspLon);
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	});
}

function computeHouseRulers(cusps: CuspProjection[]): HouseRulerRow[] {
	return cusps.map((c, idx) => ({
		house: idx + 1,
		sign: c.sign,
		ruler: SIGN_RULERS[c.sign] ?? "unknown",
	}));
}

type RawBody = NonNullable<Chart["bodies"][string]>;

function computeAspects(rawBodies: Chart["bodies"]): AspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		(entry): entry is [string, RawBody] =>
			entry[1] !== undefined &&
			entry[0] !== "true_node" &&
			entry[0] !== "mean_node",
	);

	if (rawBodies.true_node) {
		bodyEntries.push(["true_node", rawBodies.true_node]);
	}

	const aspects: AspectProjection[] = [];

	eachPair(bodyEntries, ([idA, bodyA], [idB, bodyB]) => {
		const match = findAspect(bodyA.lon, bodyB.lon, MAJOR_ASPECT_DEFS);
		if (match) {
			const maxOrb =
				MAJOR_ASPECT_DEFS.find((d) => d.name === match.aspect)?.orb ?? 8;
			const strength = roundPrecision(1 - match.orb / maxOrb, 3);
			const phase = determineAspectPhase(
				bodyA.speed,
				bodyA.lon,
				bodyB.speed,
				bodyB.lon,
				match.target,
			);

			aspects.push({
				a: idA,
				b: idB,
				aspect: match.aspect,
				orb: roundPrecision(match.orb, 2),
				phase,
				strength,
			});
		}
	});

	return aspects;
}

function computeDeclinationAspects(
	rawBodies: Chart["bodies"],
): DeclinationAspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		(entry): entry is [string, RawBody] => entry[1] !== undefined,
	);
	const results: DeclinationAspectProjection[] = [];

	eachPair(bodyEntries, ([idA, bodyA], [idB, bodyB]) => {
		if (bodyA.dec !== undefined && bodyB.dec !== undefined) {
			const match = findDeclinationAspect(bodyA.dec, bodyB.dec, 1.2);
			if (match) {
				results.push({
					a: idA,
					b: idB,
					aspect: match.aspect,
					orb: roundPrecision(match.orb, 4),
				});
			}
		}
	});

	return results;
}

/**
 * Consolidates all raw astronomical measurements (bodies, angles, cusps,
 * major aspects, declination aspects, house rulers) into a unified projection.
 */
export function projectEclipticGeometry(
	rawChart: Chart,
): EclipticGeometryProjection {
	const cusps = projectCusps(rawChart.cusps);
	const bodies = projectBodies(rawChart.bodies, rawChart.cusps);
	const angles = projectAngles(rawChart.angles);
	const aspects = computeAspects(rawChart.bodies);
	const declinationAspects = computeDeclinationAspects(rawChart.bodies);
	const houseRulers = computeHouseRulers(cusps);
	const sun = rawChart.bodies.sun;
	const moon = rawChart.bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon) : undefined;

	return {
		bodies,
		angles,
		cusps,
		aspects,
		declinationAspects,
		houseRulers,
		phase,
	};
}

/**
 * Evaluates Pluto aspects against planetary bodies using PLUTO_ASPECTS orbs and stress definitions.
 */
export function evaluatePlutoAspects(
	bodies: Record<string, { lon: number; speed: number }>,
	pluto: { lon: number; speed: number },
): PlutoAspectProjection[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pluto.lon, speed: pluto.speed, excludeId: "pluto" },
		PLUTO_ASPECTS,
		{ excludeNonPlanetary: true, includePhase: true, precision: 4 },
	) as PlutoAspectProjection[];
}

/**
 * Evaluates PPP (Pluto Polarity Point) aspects against major aspect definitions.
 */
export function evaluatePPPAspects(
	bodies: Record<string, { lon: number }>,
	pppLon: number,
): PPPAspectProjection[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pppLon, excludeId: "pluto" },
		PPP_MAJOR_ASPECTS,
		{ excludeNonPlanetary: true, precision: 4 },
	).map((a) => ({ body: a.body, aspect: a.aspect, orb: a.orb }));
}

/**
 * Computes near and anti (far) midpoints between two ecliptic longitudes.
 */
export function computeMidpoints(
	lonA: number,
	lonB: number,
	cusps?: number[],
): {
	near: ProjectedEclipticPoint;
	anti: ProjectedEclipticPoint;
} {
	const arc = (((lonB - lonA) % 360) + 360) % 360;
	const nearLon =
		arc <= 180
			? normalizeLongitude(lonA + arc / 2)
			: normalizeLongitude(lonA - (360 - arc) / 2);
	const farLon = normalizeLongitude(nearLon + 180);

	return {
		near: projectPoint(nearLon, cusps),
		anti: projectPoint(farLon, cusps),
	};
}

/**
 * Evaluates aspects against the nodal axis points.
 */
export function evaluateNodeAspects(
	bodies: Record<string, { lon: number }>,
	nodeLon: number,
): NodeAspectProjection[] {
	return evaluateAspectsAgainstPoint(bodies, { lon: nodeLon }, PLUTO_ASPECTS, {
		excludeNonPlanetary: true,
		precision: 4,
	}).map((a) => ({
		body: a.body,
		aspect: a.aspect,
		orb: a.orb,
		stress: (a.stress ?? "nonstressful") as "stressful" | "nonstressful",
	}));
}

/**
 * Detects skipped steps (planets square the nodal axis).
 */
export function detectSkippedSteps(
	bodies: Record<string, { lon: number }>,
	northNodeLon: number,
	orbLimit = SKIPPED_STEPS_ORB,
): SkippedStepProjection[] {
	const skipped: SkippedStepProjection[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body || bodyId === "pluto" || NON_PLANETARY_IDS.has(bodyId)) continue;
		const diff = angularDistance(body.lon, northNodeLon);
		const orb = Math.abs(diff - 90);
		if (orb <= orbLimit) {
			skipped.push({
				body: bodyId,
				aspect: "square",
				orb: roundPrecision(orb, 4),
			});
		}
	}
	return skipped.sort((a, b) => a.orb - b.orb);
}

/**
 * Computes hemispheric, quadrant, elemental, and modal distributions for planetary bodies.
 */
export function calculateAstrologicalSignature(
	bodies: Record<string, { sign: string; house: number }>,
): AstrologicalSignature {
	const hemispheres = { eastern: 0, western: 0, northern: 0, southern: 0 };
	const quadrants = { q1: 0, q2: 0, q3: 0, q4: 0 };
	const elements = { fire: 0, earth: 0, air: 0, water: 0 };
	const modalities = { cardinal: 0, fixed: 0, mutable: 0 };

	const planetsOnly = Object.entries(bodies).filter(([id]) => isPlanet(id));

	for (const [_, body] of planetsOnly) {
		const elem = SIGN_ELEMENTS[body.sign] as keyof typeof elements;
		if (elem) elements[elem]++;

		const mod = SIGN_MODALITIES[body.sign] as keyof typeof modalities;
		if (mod) modalities[mod]++;

		if (body.house >= 1 && body.house <= 3) quadrants.q1++;
		else if (body.house >= 4 && body.house <= 6) quadrants.q2++;
		else if (body.house >= 7 && body.house <= 9) quadrants.q3++;
		else if (body.house >= 10 && body.house <= 12) quadrants.q4++;

		if (body.house >= 10 || body.house <= 3) hemispheres.eastern++;
		else hemispheres.western++;

		if (body.house >= 7 && body.house <= 12) hemispheres.northern++;
		else hemispheres.southern++;
	}

	return { hemispheres, quadrants, elements, modalities };
}
