import type { Chart } from "caelus";
import { detectPatterns as detectCaelusPatterns } from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris";
import type { Profile } from "../domain/model";
import { type ToonProfile, toonProfile } from "../domain/toon";
import {
	type AstrologicalSignature,
	angularDistance,
	buildDispositorChain,
	calculateAstrologicalSignature,
	computeMidpoints,
	DEFAULT_BODIES,
	type DispositorStep,
	detectSkippedSteps,
	evaluateNodeAspects,
	evaluatePlutoAspects,
	evaluatePPPAspects,
	type NodeAspectProjection,
	normalizeLongitude,
	type PlutoAspectProjection,
	PPP_DEACTIVATION_ORB,
	type PPPAspectProjection,
	type ProjectedEclipticPoint,
	projectEclipticGeometry,
	projectPoint,
	roundPrecision,
	SIGN_ELEMENTS,
	SIGN_MODALITIES,
	SIGN_RULERS,
	type SkippedStepProjection,
} from "./aspects";

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

	const geom = projectEclipticGeometry(rawChart);

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
 * over a stored Profile (ADR-0008, ADR-0009, ADR-0010).
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
