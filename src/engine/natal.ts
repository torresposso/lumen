/**
 * Deterministic natal chart engine (JWGEA canon).
 *
 * Encapsulates the complete astrological chart geometry and evolutionary
 * mechanics synthesis as a pure function over a stored Profile (ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012).
 */
import type { BodyId, Chart, Position } from "caelus";
import {
	aspectPhase,
	chartSignatureOf,
	detectPatterns as detectCaelusPatterns,
	findAspects,
	houseOf,
	SIGNS,
} from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris";
import type { Profile } from "../domain/model";
import { type ToonProfile, toonProfile } from "../domain/toon";

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
	const house = cusps && cusps.length >= 12 ? houseOf(norm, cusps) : 1;
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
				aspectItem.phase = aspectPhase(
					body.lon,
					body.speed,
					target.lon,
					target.speed,
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

function computeAspects(rawBodies: Chart["bodies"]): AspectProjection[] {
	const bodyMap: Record<string, Position> = {};
	for (const [id, body] of Object.entries(rawBodies)) {
		if (body && id !== "mean_node") {
			bodyMap[id] = body;
		}
	}

	const orbs: Record<string, number> = {
		conjunction: 8,
		sextile: 6,
		square: 7,
		trine: 8,
		opposition: 8,
	};

	const aspects = findAspects(bodyMap, orbs);
	return aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: roundPrecision(a.orb, 2),
		phase: a.phase,
		strength: roundPrecision(a.strength, 3),
	}));
}

export function projectEclipticGeometry(
	rawChart: Chart,
	ephemeris?: Ephemeris,
): EclipticGeometryProjection {
	const cusps = projectCusps(rawChart.cusps);
	const bodies = projectBodies(rawChart.bodies, rawChart.cusps);
	const angles = projectAngles(rawChart.angles);
	const aspects = computeAspects(rawChart.bodies);

	let declinationAspects: DeclinationAspectProjection[] = [];
	if (ephemeris) {
		const activeBodies = Object.keys(rawChart.bodies).filter(
			(id) => rawChart.bodies[id] !== undefined,
		);
		const declPairs = ephemeris.declinationAspects(
			activeBodies,
			rawChart.jdUt,
			1.2,
		);
		declinationAspects = declPairs
			.filter((p) => p.kind !== null)
			.map((p) => {
				const decA = rawChart.bodies[p.a]?.dec ?? 0;
				const decB = rawChart.bodies[p.b]?.dec ?? 0;
				const orb =
					p.kind === "parallel"
						? Math.abs(decA - decB)
						: Math.abs(Math.abs(decA) - Math.abs(decB));
				return {
					a: p.a,
					b: p.b,
					aspect: p.kind as string,
					orb: roundPrecision(orb, 4),
				};
			});
	}

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

export function calculateAstrologicalSignature(
	bodies: Record<string, { sign: string; house: number; lon: number }>,
): AstrologicalSignature {
	const sig = chartSignatureOf(bodies, {
		bodies: Object.keys(bodies).filter(isPlanet),
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
			fixed: sig.modalities.fixed ?? 0,
			mutable: sig.modalities.mutable ?? 0,
		},
	};
}

export interface SoulPlutoFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	retrograde: boolean;
	stressfulCount: number;
	nonstressfulCount: number;
	aspects: PlutoAspectProjection[];
}

export interface PPPFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	active: boolean;
	separation?: number;
	reason?: string;
	aspects: PPPAspectProjection[];
}

export interface SoulOutput {
	pluto: SoulPlutoFact;
	ppp: PPPFact;
	midpoint?: ProjectedEclipticPoint;
	antiMidpoint?: ProjectedEclipticPoint;
	dispositorChain: DispositorStep[];
}

export type NodeMotionStatus = "retrograde" | "direct" | "stationary";

export interface NodalRulerPlacement {
	body: string;
	sign: string;
	signDeg: number;
	house: number;
	motion: "direct" | "retrograde" | "stationary";
}

export interface NodalPointFact {
	sign: string;
	lon: number;
	signDeg: number;
	house: number;
	ruler?: string;
	rulerPlacement?: NodalRulerPlacement;
	aspects: NodeAspectProjection[];
}

export interface NodalAxisFact {
	north: NodalPointFact;
	south: NodalPointFact;
	motion: NodeMotionStatus;
	skippedSteps: SkippedStepProjection[];
}

export interface EclipseFact {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface PrenatalEclipsesFact {
	solar?: EclipseFact;
	lunar?: EclipseFact;
}

export interface AspectPattern {
	type: string;
	bodies: string[];
	apex?: string | null;
	sign?: string | null;
	house?: number | null;
	element?: string;
	modality?: string;
	orb?: number;
}

function computeRawChart(
	jdUt: number,
	lat: number,
	lon: number,
	ephemeris: Ephemeris,
): Chart {
	const raw = ephemeris.chartAt(jdUt, lat, lon, {
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: DEFAULT_BODIES,
		topocentric: true,
	});

	const bodies = Object.fromEntries(
		Object.entries(raw.bodies).filter(([id]) => id !== "mean_node"),
	) as Chart["bodies"];

	if (!bodies.pluto || !bodies.true_node) {
		throw new Error(
			"Ephemeris calculation failed: natal chart must carry pluto and true_node",
		);
	}

	return { ...raw, bodies };
}

function computeSoulFact(
	bodies: Record<
		string,
		{ lon: number; sign: string; signDeg: number; house: number; speed: number }
	>,
	cusps: number[],
	northNodeLon?: number,
): SoulOutput {
	const pluto = bodies.pluto;
	if (!pluto) {
		throw new Error("Missing pluto body in chart calculations");
	}

	const aspects = evaluatePlutoAspects(bodies, pluto);
	const stressfulCount = aspects.filter((a) => a.stress === "stressful").length;
	const nonstressfulCount = aspects.filter(
		(a) => a.stress === "nonstressful",
	).length;

	const pppLon = normalizeLongitude(pluto.lon + 180);
	const pppProjected = projectPoint(pppLon, cusps);
	const pppAspects = evaluatePPPAspects(bodies, pppLon);

	const separation =
		northNodeLon !== undefined
			? angularDistance(pluto.lon, northNodeLon)
			: undefined;
	const isConjunctNN =
		separation !== undefined && separation <= PPP_DEACTIVATION_ORB;
	const pppActive = !isConjunctNN;

	let midpoint: ProjectedEclipticPoint | undefined;
	let antiMidpoint: ProjectedEclipticPoint | undefined;
	if (northNodeLon !== undefined) {
		const mid = computeMidpoints(pluto.lon, northNodeLon, cusps);
		midpoint = mid.near;
		antiMidpoint = mid.anti;
	}

	return {
		pluto: {
			sign: pluto.sign,
			lon: roundPrecision(pluto.lon, 4),
			signDeg: roundPrecision(pluto.signDeg, 4),
			house: pluto.house,
			retrograde: pluto.speed < 0,
			stressfulCount,
			nonstressfulCount,
			aspects,
		},
		ppp: {
			sign: pppProjected.sign,
			lon: roundPrecision(pppProjected.lon, 4),
			signDeg: roundPrecision(pppProjected.signDeg, 4),
			house: pppProjected.house,
			active: pppActive,
			...(separation !== undefined
				? { separation: roundPrecision(separation, 2) }
				: {}),
			...(pppActive
				? {}
				: {
						reason: `pluto conjunct north node (separation ${roundPrecision(separation ?? 0, 2)}° <= ${PPP_DEACTIVATION_ORB}°)`,
					}),
			aspects: pppAspects,
		},
		midpoint,
		antiMidpoint,
		dispositorChain: buildDispositorChain(bodies, "pluto"),
	};
}

function describeEvoCriteria(): string {
	return "JWGEA canon; orbs PLUTO_ASPECTS: 10° conjunction/opposition, 8° square/trine, 6° sextile, 3° semisextile/semisquare/sesquiquadrate/quincunx, 2° septile/quintile/biquintile; ppp: major aspects only (orb 5°); skipped: squares to the nodal axis (orb 5°); ppp inactive when pluto conjunct the north node (orb 3°)";
}

function computeNodalRulerPlacement(
	rulerId: string | undefined,
	bodies: Record<
		string,
		{ sign: string; signDeg: number; house: number; speed: number }
	>,
): NodalRulerPlacement | undefined {
	if (!rulerId) return undefined;
	const body = bodies[rulerId];
	if (!body) return undefined;

	const motion: "direct" | "retrograde" | "stationary" =
		Math.abs(body.speed) < 0.0001
			? "stationary"
			: body.speed < 0
				? "retrograde"
				: "direct";

	return {
		body: rulerId,
		sign: body.sign,
		signDeg: roundPrecision(body.signDeg, 4),
		house: body.house,
		motion,
	};
}

function computeNodalAxisFact(
	bodies: Record<
		string,
		{ lon: number; sign: string; signDeg: number; house: number; speed: number }
	>,
	cusps: number[],
): {
	nodalAxis: NodalAxisFact;
	dispositorChains: {
		southNodeRuler?: DispositorStep[];
		northNodeRuler?: DispositorStep[];
	};
} {
	const northNode = bodies.true_node;
	if (!northNode) {
		throw new Error("Missing true_node in chart calculations");
	}

	const southNodeLon = normalizeLongitude(northNode.lon + 180);
	const southNodeProjected = projectPoint(southNodeLon, cusps);

	const motion: NodeMotionStatus =
		Math.abs(northNode.speed) < 0.0001
			? "stationary"
			: northNode.speed < 0
				? "retrograde"
				: "direct";

	const northRulerId = SIGN_RULERS[northNode.sign];
	const southRulerId = SIGN_RULERS[southNodeProjected.sign];

	const northRulerPlacement = computeNodalRulerPlacement(northRulerId, bodies);
	const southRulerPlacement = computeNodalRulerPlacement(southRulerId, bodies);

	const skippedSteps = detectSkippedSteps(bodies, northNode.lon);
	const northAspects = evaluateNodeAspects(bodies, northNode.lon);
	const southAspects = evaluateNodeAspects(bodies, southNodeLon);

	const southDispositor = southRulerId
		? buildDispositorChain(bodies, southRulerId)
		: undefined;
	const northDispositor = northRulerId
		? buildDispositorChain(bodies, northRulerId)
		: undefined;

	return {
		nodalAxis: {
			north: {
				sign: northNode.sign,
				lon: roundPrecision(northNode.lon, 4),
				signDeg: roundPrecision(northNode.signDeg, 4),
				house: northNode.house,
				ruler: northRulerId,
				rulerPlacement: northRulerPlacement,
				aspects: northAspects,
			},
			south: {
				sign: southNodeProjected.sign,
				lon: roundPrecision(southNodeProjected.lon, 4),
				signDeg: roundPrecision(southNodeProjected.signDeg, 4),
				house: southNodeProjected.house,
				ruler: southRulerId,
				rulerPlacement: southRulerPlacement,
				aspects: southAspects,
			},
			motion,
			skippedSteps,
		},
		dispositorChains: {
			southNodeRuler: southDispositor,
			northNodeRuler: northDispositor,
		},
	};
}

function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birthJdUt: number,
	birthLat: number,
	birthLon: number,
	cusps: number[],
): PrenatalEclipsesFact {
	const jdStart = birthJdUt - 180;
	const jdEnd = birthJdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (
		tMax: number,
		type: string,
		isLunar: boolean,
	): EclipseFact => {
		const pos = ephemeris.chartAt(tMax, birthLat, birthLon, {
			houseSystem: "porphyry",
			topocentric: false,
		});
		const targetBody = isLunar ? pos.bodies.moon : pos.bodies.sun;
		if (!targetBody) {
			throw new Error(
				`${isLunar ? "Moon" : "Sun"} position unavailable for eclipse calculation`,
			);
		}
		const point = projectPoint(targetBody.lon, cusps, 4);
		return {
			tMax: roundPrecision(tMax, 4),
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

function detectAspectPatterns(
	bodies: Record<string, { lon: number; sign: string; house: number }>,
): AspectPattern[] {
	const bodyMap: Record<string, { lon: number; house?: number | null }> = {};
	for (const [id, body] of Object.entries(bodies)) {
		if (body) {
			bodyMap[id] = { lon: body.lon, house: body.house };
		}
	}

	const detected = detectCaelusPatterns({
		bodies: bodyMap,
	} as Parameters<typeof detectCaelusPatterns>[0]);
	const patterns: AspectPattern[] = [];

	for (const pattern of detected) {
		const base = {
			bodies: [...pattern.bodies].sort(),
			apex: pattern.apex ?? null,
			sign: pattern.sign ?? null,
			house: pattern.house ?? null,
			orb:
				pattern.orb !== undefined ? Number(pattern.orb.toFixed(4)) : undefined,
		};

		switch (pattern.kind) {
			case "grand_trine": {
				const sign = pattern.bodies[0]
					? bodies[pattern.bodies[0]]?.sign
					: undefined;
				patterns.push({
					...base,
					type: "grand_trine",
					element: sign ? SIGN_ELEMENTS[sign] : undefined,
				});
				break;
			}
			case "t_square": {
				const apexSign = pattern.apex ? bodies[pattern.apex]?.sign : undefined;
				patterns.push({
					...base,
					type: "t_square",
					modality: apexSign ? SIGN_MODALITIES[apexSign] : undefined,
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
					element: pattern.sign ? SIGN_ELEMENTS[pattern.sign] : undefined,
					modality: pattern.sign ? SIGN_MODALITIES[pattern.sign] : undefined,
				});
				break;
			case "stellium_house":
				patterns.push({ ...base, type: "stellium_house" });
				break;
		}
	}

	return patterns;
}

export interface NatalChartOutput {
	birth: ToonProfile;
	houseSystem: "porphyry";
	zodiac: "tropical";
	bodies: ReturnType<typeof projectEclipticGeometry>["bodies"];
	angles: ReturnType<typeof projectEclipticGeometry>["angles"];
	cusps: ReturnType<typeof projectEclipticGeometry>["cusps"];
	aspects: ReturnType<typeof projectEclipticGeometry>["aspects"];
	declinationAspects?: ReturnType<
		typeof projectEclipticGeometry
	>["declinationAspects"];
	pluto: ReturnType<typeof computeSoulFact>["pluto"];
	ppp: ReturnType<typeof computeSoulFact>["ppp"];
	midpoint?: ReturnType<typeof computeSoulFact>["midpoint"];
	antiMidpoint?: ReturnType<typeof computeSoulFact>["antiMidpoint"];
	nodalAxis: ReturnType<typeof computeNodalAxisFact>["nodalAxis"];
	phase?: string;
	dispositorChains: {
		pluto: ReturnType<typeof computeSoulFact>["dispositorChain"];
		southNodeRuler?: ReturnType<
			typeof computeNodalAxisFact
		>["dispositorChains"]["southNodeRuler"];
		northNodeRuler?: ReturnType<
			typeof computeNodalAxisFact
		>["dispositorChains"]["northNodeRuler"];
	};
	prenatalEclipses: ReturnType<typeof computePrenatalEclipses>;
	patterns: ReturnType<typeof detectAspectPatterns>;
	signature: AstrologicalSignature;
	houseRulers: ReturnType<typeof projectEclipticGeometry>["houseRulers"];
	counts: {
		plutoAspects: number;
		nodeAspects: number;
		skippedSteps: number;
		eclipses: number;
	};
	method: string;
}

/** Stage 1: Geometric measurements and ecliptic projections. */
function computeMeasurements(profile: Profile, ephemeris: Ephemeris) {
	const rawChart = computeRawChart(
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		ephemeris,
	);

	const geom = projectEclipticGeometry(rawChart, ephemeris);

	return {
		rawChart,
		...geom,
	};
}

/** Stage 2: Evolutionary mechanics synthesis (JWGEA canon). */
function synthesizeEvolutionaryCanon(
	profile: Profile,
	measurements: ReturnType<typeof computeMeasurements>,
	ephemeris: Ephemeris,
) {
	const { rawChart, bodies } = measurements;
	const northNodeLon = rawChart.bodies.true_node?.lon;
	const soul = computeSoulFact(bodies, rawChart.cusps, northNodeLon);
	const nodal = computeNodalAxisFact(bodies, rawChart.cusps);
	const prenatalEclipses = computePrenatalEclipses(
		ephemeris,
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		rawChart.cusps,
	);
	const patterns = detectAspectPatterns(bodies);
	const signature = calculateAstrologicalSignature(bodies);

	const counts = {
		plutoAspects: soul.pluto.aspects.length,
		nodeAspects:
			nodal.nodalAxis.north.aspects.length +
			nodal.nodalAxis.south.aspects.length,
		skippedSteps: nodal.nodalAxis.skippedSteps.length,
		eclipses:
			(prenatalEclipses.solar ? 1 : 0) + (prenatalEclipses.lunar ? 1 : 0),
	};

	return {
		pluto: soul.pluto,
		ppp: soul.ppp,
		midpoint: soul.midpoint,
		antiMidpoint: soul.antiMidpoint,
		nodalAxis: nodal.nodalAxis,
		dispositorChains: {
			pluto: soul.dispositorChain,
			southNodeRuler: nodal.dispositorChains.southNodeRuler,
			northNodeRuler: nodal.dispositorChains.northNodeRuler,
		},
		prenatalEclipses,
		patterns,
		signature,
		counts,
		method: describeEvoCriteria(),
	};
}

/**
 * Computes exact natal chart geometry and evolutionary mechanics as a pure function
 * over a stored Profile (ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012).
 */
export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): NatalChartOutput {
	const measurements = computeMeasurements(profile, ephemeris);
	const evo = synthesizeEvolutionaryCanon(profile, measurements, ephemeris);

	return {
		birth: toonProfile(profile),
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: measurements.bodies,
		angles: measurements.angles,
		cusps: measurements.cusps,
		aspects: measurements.aspects,
		...(measurements.declinationAspects.length > 0
			? { declinationAspects: measurements.declinationAspects }
			: {}),
		pluto: evo.pluto,
		ppp: evo.ppp,
		...(evo.midpoint ? { midpoint: evo.midpoint } : {}),
		...(evo.antiMidpoint ? { antiMidpoint: evo.antiMidpoint } : {}),
		nodalAxis: evo.nodalAxis,
		...(measurements.phase ? { phase: measurements.phase } : {}),
		dispositorChains: {
			pluto: evo.dispositorChains.pluto,
			...(evo.dispositorChains.southNodeRuler
				? { southNodeRuler: evo.dispositorChains.southNodeRuler }
				: {}),
			...(evo.dispositorChains.northNodeRuler
				? { northNodeRuler: evo.dispositorChains.northNodeRuler }
				: {}),
		},
		prenatalEclipses: evo.prenatalEclipses,
		patterns: evo.patterns,
		signature: evo.signature,
		houseRulers: measurements.houseRulers,
		counts: evo.counts,
		method: evo.method,
	};
}
