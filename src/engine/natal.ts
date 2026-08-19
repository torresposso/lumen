import type { Chart } from "caelus";
import { detectPatterns as detectCaelusPatterns } from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris";
import type { Profile } from "../domain/model";
import { type ToonProfile, toonProfile } from "../domain/toon";
import {
	type AspectProjection,
	type AspectStress,
	type DeclinationAspectProjection,
	type DispositorStep,
	type ProjectedEclipticPoint,
	type StressedAspectDef,
	DEFAULT_BODIES,
	MAJOR_ASPECT_DEFS,
	NON_PLANETARY_IDS,
	PLUTO_ASPECTS,
	PPP_DEACTIVATION_ORB,
	PPP_MAJOR_ASPECTS,
	SIGN_ELEMENTS,
	SIGN_MODALITIES,
	SIGN_RULERS,
	SKIPPED_STEPS_ORB,
	angularDistance,
	buildDispositorChain,
	computeSolLunaPhase,
	determineAspectPhase,
	eachPair,
	evaluateAspectsAgainstPoint,
	findAspect,
	findDeclinationAspect,
	isPlanet,
	matchClosestAspect,
	normalizeLongitude,
	projectPoint,
	roundPrecision,
} from "./aspects";

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

export interface PlutoAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

export interface PPPAspect {
	body: string;
	aspect: string;
	orb: number;
}

export interface SoulPlutoFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	retrograde: boolean;
	stressfulCount: number;
	nonstressfulCount: number;
	aspects: PlutoAspect[];
}

export interface PPPFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	active: boolean;
	separation?: number;
	reason?: string;
	aspects: PPPAspect[];
}

export interface SoulOutput {
	pluto: SoulPlutoFact;
	ppp: PPPFact;
	midpoint?: ProjectedEclipticPoint;
	antiMidpoint?: ProjectedEclipticPoint;
	dispositorChain: DispositorStep[];
}

export type NodeMotionStatus = "retrograde" | "direct" | "stationary";

export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: "stressful" | "nonstressful";
}

export interface SkippedStep {
	body: string;
	aspect: string;
	orb: number;
}

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
	aspects: NodeAspect[];
}

export interface NodalAxisFact {
	north: NodalPointFact;
	south: NodalPointFact;
	motion: NodeMotionStatus;
	skippedSteps: SkippedStep[];
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

export function computeRawChart(
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

export function projectBodies(
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

export function projectAngles(angles: Chart["angles"]): {
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

export function projectCusps(rawCusps: number[]): CuspProjection[] {
	return rawCusps.map((cuspLon) => {
		const pt = projectPoint(cuspLon);
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	});
}

export function computeHouseRulers(cusps: CuspProjection[]): HouseRulerRow[] {
	return cusps.map((c, idx) => ({
		house: idx + 1,
		sign: c.sign,
		ruler: SIGN_RULERS[c.sign] ?? "unknown",
	}));
}

type RawBody = NonNullable<Chart["bodies"][string]>;

export function computeAspects(rawBodies: Chart["bodies"]): AspectProjection[] {
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

export function computeDeclinationAspects(
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

export function computePlutoAspects(
	bodies: Record<string, { lon: number; speed: number }>,
	pluto: { lon: number; speed: number },
): PlutoAspect[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pluto.lon, speed: pluto.speed, excludeId: "pluto" },
		PLUTO_ASPECTS,
		{ excludeNonPlanetary: true, includePhase: true, precision: 4 },
	) as PlutoAspect[];
}

export function computePPPAspects(
	bodies: Record<string, { lon: number }>,
	pppLon: number,
): PPPAspect[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pppLon, excludeId: "pluto" },
		PPP_MAJOR_ASPECTS,
		{ excludeNonPlanetary: true, precision: 4 },
	).map((a) => ({ body: a.body, aspect: a.aspect, orb: a.orb }));
}

function nearMidpoint(a: number, b: number): number {
	const arc = (((b - a) % 360) + 360) % 360;
	if (arc <= 180) return normalizeLongitude(a + arc / 2);
	return normalizeLongitude(a - (360 - arc) / 2);
}

export function computeSoulFact(
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

	const aspects = computePlutoAspects(bodies, pluto);
	const stressfulCount = aspects.filter((a) => a.stress === "stressful").length;
	const nonstressfulCount = aspects.filter(
		(a) => a.stress === "nonstressful",
	).length;

	const pppLon = normalizeLongitude(pluto.lon + 180);
	const pppProjected = projectPoint(pppLon, cusps);
	const pppAspects = computePPPAspects(bodies, pppLon);

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
		const near = nearMidpoint(pluto.lon, northNodeLon);
		const far = normalizeLongitude(near + 180);
		midpoint = projectPoint(near, cusps);
		antiMidpoint = projectPoint(far, cusps);
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

export function describeEvoCriteria(): string {
	const orbGroups = new Map<number, string[]>();
	for (const def of PLUTO_ASPECTS) {
		const names = orbGroups.get(def.orb);
		if (names) names.push(def.name);
		else orbGroups.set(def.orb, [def.name]);
	}
	const plutoOrbs = [...orbGroups.entries()]
		.sort(([a], [b]) => b - a)
		.map(([orb, names]) => `${orb}° ${names.join("/")}`)
		.join(", ");

	const firstPppAspect = PPP_MAJOR_ASPECTS[0];
	return `orbs PLUTO_ASPECTS: ${plutoOrbs}; ppp: major aspects only (orb ${firstPppAspect.orb}°); skipped: squares to the nodal axis (orb ${PPP_DEACTIVATION_ORB + 2}°); ppp inactive when pluto conjunct the north node (orb ${PPP_DEACTIVATION_ORB}°)`;
}

export function computeNodeAspects(
	bodies: Record<string, { lon: number }>,
	nodeLon: number,
): NodeAspect[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: nodeLon },
		PLUTO_ASPECTS,
		{ excludeNonPlanetary: true, precision: 4 },
	).map((a) => ({
		body: a.body,
		aspect: a.aspect,
		orb: a.orb,
		stress: (a.stress ?? "nonstressful") as "stressful" | "nonstressful",
	}));
}

export function computeSkippedSteps(
	bodies: Record<string, { lon: number }>,
	northNodeLon: number,
	orbLimit = SKIPPED_STEPS_ORB,
): SkippedStep[] {
	const skipped: SkippedStep[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body || bodyId === "pluto" || NON_PLANETARY_IDS.has(bodyId)) continue;
		let diff = Math.abs(body.lon - northNodeLon);
		if (diff > 180) diff = 360 - diff;
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

export function computeNodalRulerPlacement(
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

export function computeNodalAxisFact(
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

	const skippedSteps = computeSkippedSteps(bodies, northNode.lon);
	const northAspects = computeNodeAspects(bodies, northNode.lon);
	const southAspects = computeNodeAspects(bodies, southNodeLon);

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

export function computePrenatalEclipses(
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

export function detectAspectPatterns(
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

export function computeSignature(
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

export interface NatalChartOutput {
	birth: ToonProfile;
	houseSystem: "porphyry";
	zodiac: "tropical";
	bodies: ReturnType<typeof projectBodies>;
	angles: ReturnType<typeof projectAngles>;
	cusps: ReturnType<typeof projectCusps>;
	aspects: ReturnType<typeof computeAspects>;
	declinationAspects?: ReturnType<typeof computeDeclinationAspects>;
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
	signature: ReturnType<typeof computeSignature>;
	houseRulers: ReturnType<typeof computeHouseRulers>;
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

	const bodies = projectBodies(rawChart.bodies, rawChart.cusps);
	const angles = projectAngles(rawChart.angles);
	const cusps = projectCusps(rawChart.cusps);
	const aspects = computeAspects(rawChart.bodies);
	const declinationAspects = computeDeclinationAspects(rawChart.bodies);
	const houseRulers = computeHouseRulers(cusps);

	return {
		rawChart,
		bodies,
		angles,
		cusps,
		aspects,
		declinationAspects,
		houseRulers,
	};
}

/** Stage 2: Evolutionary mechanics (JWGEA canon). */
function computeEvolutionaryMechanics(
	profile: Profile,
	measurements: ReturnType<typeof computeMeasurements>,
	ephemeris: Ephemeris,
) {
	const { rawChart, bodies } = measurements;
	const northNodeLon = rawChart.bodies.true_node?.lon;
	const soul = computeSoulFact(bodies, rawChart.cusps, northNodeLon);
	const nodal = computeNodalAxisFact(bodies, rawChart.cusps);

	const sun = bodies.sun;
	const moon = bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon) : undefined;

	const prenatalEclipses = computePrenatalEclipses(
		ephemeris,
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		rawChart.cusps,
	);

	const patterns = detectAspectPatterns(bodies);
	const signature = computeSignature(bodies);

	const eclipseCount =
		(prenatalEclipses.solar ? 1 : 0) + (prenatalEclipses.lunar ? 1 : 0);
	const nodeAspectCount =
		nodal.nodalAxis.north.aspects.length + nodal.nodalAxis.south.aspects.length;

	const counts = {
		plutoAspects: soul.pluto.aspects.length,
		nodeAspects: nodeAspectCount,
		skippedSteps: nodal.nodalAxis.skippedSteps.length,
		eclipses: eclipseCount,
	};

	return {
		soul,
		nodal,
		phase,
		prenatalEclipses,
		patterns,
		signature,
		counts,
	};
}

/**
 * Computes exact natal chart geometry and evolutionary mechanics as a pure function
 * over a stored Profile (ADR-0008, ADR-0009, ADR-0010).
 */
export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): NatalChartOutput {
	const measurements = computeMeasurements(profile, ephemeris);
	const evo = computeEvolutionaryMechanics(profile, measurements, ephemeris);

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
		pluto: evo.soul.pluto,
		ppp: evo.soul.ppp,
		...(evo.soul.midpoint ? { midpoint: evo.soul.midpoint } : {}),
		...(evo.soul.antiMidpoint ? { antiMidpoint: evo.soul.antiMidpoint } : {}),
		nodalAxis: evo.nodal.nodalAxis,
		...(evo.phase ? { phase: evo.phase } : {}),
		dispositorChains: {
			pluto: evo.soul.dispositorChain,
			...(evo.nodal.dispositorChains.southNodeRuler
				? { southNodeRuler: evo.nodal.dispositorChains.southNodeRuler }
				: {}),
			...(evo.nodal.dispositorChains.northNodeRuler
				? { northNodeRuler: evo.nodal.dispositorChains.northNodeRuler }
				: {}),
		},
		prenatalEclipses: evo.prenatalEclipses,
		patterns: evo.patterns,
		signature: evo.signature,
		houseRulers: measurements.houseRulers,
		counts: evo.counts,
		method: describeEvoCriteria(),
	};
}
