import type { Chart } from "caelus";
import type {
	ChartBodiesLite,
	ChartBodyLite,
	PlutoPolarityPoint,
} from "./types";
import {
	angularDistance,
	angularDistanceDirect,
	findAspect,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
} from "./types";

export { SIGN_RULERS };

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

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

export const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

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

export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
}

export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

export interface SoulPlutoReading {
	pluto: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		retrograde: boolean;
		aspects: PlutoAspect[];
		aspectCount: number;
		stressfulAspects: number;
		nonstressfulAspects: number;
	};
	ppp: PlutoPolarityPoint & {
		aspects: PPPAspect[];
	};
	plutoNorthNodeMidpoint?: ProjectedEclipticPoint & { formatted: string };
	dispositorChain: DispositorStep[];
}

// ---------------------------------------------------------------------------
// Shared aspect mechanics
// ---------------------------------------------------------------------------

function normalizedSignedDelta(from: number, to: number): number {
	const raw = (to - from) % 360;
	if (raw > 180) return raw - 360;
	if (raw < -180) return raw + 360;
	return raw;
}

function matchClosestAspect(
	lonA: number,
	lonB: number,
	defs: readonly StressedAspectDef[],
): { aspect: string; orb: number; stress: AspectStress } | undefined {
	const dist = angularDistance(lonA, lonB);
	let best: { def: StressedAspectDef; orb: number } | undefined;
	for (const def of defs) {
		const orb = Math.abs(dist - def.target);
		if (orb <= def.orb && (best === undefined || orb < best.orb)) {
			best = { def, orb };
		}
	}
	if (best === undefined) return undefined;
	return {
		aspect: best.def.name,
		orb: roundPrecision(best.orb),
		stress: best.def.stress,
	};
}

function aspectPhase(
	body: ChartBodyLite,
	pluto: ChartBodyLite,
	aspect: StressedAspectDef,
): PlutoAspect["phase"] {
	const candidates = [aspect.target, -aspect.target]
		.map((target) => normalizeLongitude(pluto.lon + target))
		.sort((a, b) => {
			const da = Math.abs(normalizedSignedDelta(body.lon, a));
			const db = Math.abs(normalizedSignedDelta(body.lon, b));
			return da - db;
		});
	const exact = candidates[0];
	if (exact === undefined) return undefined;
	const delta = normalizedSignedDelta(body.lon, exact);
	const relativeSpeed = body.speed - pluto.speed;
	if (Math.abs(delta) < 1e-9 || Math.abs(relativeSpeed) < 1e-9) return "exact";
	if ((relativeSpeed > 0 && delta < 0) || (relativeSpeed < 0 && delta > 0)) {
		return "applying";
	}
	return "separating";
}

export function computePlutoAspects(
	bodies: ChartBodiesLite,
	pluto: ChartBodyLite,
): PlutoAspect[] {
	const aspects: PlutoAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (
			body === undefined ||
			bodyId === "pluto" ||
			NON_PLANETARY_IDS.has(bodyId)
		) {
			continue;
		}
		const match = matchClosestAspect(body.lon, pluto.lon, PLUTO_ASPECTS);
		if (match) {
			const def = PLUTO_ASPECTS.find(
				(candidate) => candidate.name === match.aspect,
			);
			aspects.push({
				body: bodyId,
				aspect: match.aspect,
				orb: match.orb,
				stress: match.stress,
				phase: def ? aspectPhase(body, pluto, def) : undefined,
			});
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}

export function computePPPAspects(
	bodies: ChartBodiesLite,
	pppLon: number,
): PPPAspect[] {
	const aspects: PPPAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (
			body === undefined ||
			bodyId === "pluto" ||
			NON_PLANETARY_IDS.has(bodyId)
		) {
			continue;
		}
		const dist = angularDistance(body.lon, pppLon);
		for (const def of PPP_MAJOR_ASPECTS) {
			const orb = Math.abs(dist - def.target);
			if (orb <= def.orb) {
				aspects.push({
					body: bodyId,
					aspect: def.name,
					orb: roundPrecision(orb),
				});
				break;
			}
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}

export function buildDispositorChain(
	bodies: ChartBodiesLite,
	startBodyId: string,
	maxDepth = 5,
): DispositorStep[] {
	const chain: DispositorStep[] = [];
	let currentId = startBodyId;
	const visited = new Set<string>();

	for (let i = 0; i < maxDepth; i++) {
		const body = bodies[currentId as keyof typeof bodies];
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

function computeNodeAspects(
	bodies: ChartBodiesLite,
	nodeLon: number,
): NodeAspect[] {
	const aspects: NodeAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (
			body === undefined ||
			bodyId === "pluto" ||
			NON_PLANETARY_IDS.has(bodyId)
		) {
			continue;
		}
		const match = matchClosestAspect(body.lon, nodeLon, PLUTO_ASPECTS);
		if (match) {
			aspects.push({
				body: bodyId,
				aspect: match.aspect,
				orb: match.orb,
				stress: match.stress,
			});
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}

/**
 * Deep Soul reading: Pluto paradigm, PPP (deactivated when conjunct NN),
 * Pluto-NN midpoint, aspect balance and Pluto dispositor chain.
 */
export function computeSoulReading(
	bodies: ChartBodiesLite,
	cusps: number[],
	northNodeLon?: number,
): SoulPlutoReading | undefined {
	const pluto = bodies.pluto;
	if (!pluto) return undefined;

	const aspects = computePlutoAspects(bodies, pluto);
	const stressfulAspects = aspects.filter(
		(a) => a.stress === "stressful",
	).length;
	const nonstressfulAspects = aspects.filter(
		(a) => a.stress === "nonstressful",
	).length;

	const pppLon = normalizeLongitude(pluto.lon + 180);
	const pppProjected = projectPoint(pppLon, cusps);
	const pppAspects = computePPPAspects(bodies, pppLon);

	const isConjunctNN =
		northNodeLon !== undefined &&
		angularDistance(pluto.lon, northNodeLon) <= 10;
	const pppActive = !isConjunctNN;
	const pppDescription = pppActive
		? `${pppProjected.sign}/H${pppProjected.house}`
		: "none (Direct integration through North Node)";

	let plutoNorthNodeMidpoint:
		| (ProjectedEclipticPoint & { formatted: string })
		| undefined;
	if (northNodeLon !== undefined) {
		const arc = angularDistanceDirect(pluto.lon, northNodeLon);
		const midLon = normalizeLongitude(pluto.lon + arc / 2);
		const proj = projectPoint(midLon, cusps);
		const deg = Math.floor(proj.signDeg);
		const min = Math.round((proj.signDeg - deg) * 60);
		plutoNorthNodeMidpoint = {
			...proj,
			formatted: `${proj.sign} ${deg}°${String(min).padStart(2, "0")}' (H${proj.house})`,
		};
	}

	return {
		pluto: {
			lon: pluto.lon,
			sign: pluto.sign,
			signDeg: pluto.signDeg,
			house: pluto.house,
			retrograde: pluto.speed < 0,
			aspects,
			aspectCount: aspects.length,
			stressfulAspects,
			nonstressfulAspects,
		},
		ppp: {
			lon: pppLon,
			sign: pppProjected.sign,
			signDeg: pppProjected.signDeg,
			house: pppProjected.house,
			active: pppActive,
			description: pppDescription,
			aspects: pppAspects,
		},
		plutoNorthNodeMidpoint,
		dispositorChain: buildDispositorChain(bodies, "pluto"),
	};
}

// ---------------------------------------------------------------------------
// Complete JWG evolutionary reading (chart-level compatibility API)
// ---------------------------------------------------------------------------

export interface EvolutionarySkippedStep {
	body: string;
	aspect: "square";
	target: "nodal_axis";
	orb: number;
}

export interface SolLunaPhase {
	name: string;
	angle: number;
}

export interface NodalRulerPlacement {
	body: string;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
}

export type PlutoNodalAspect =
	| "conjunct_south_node"
	| "conjunct_north_node"
	| "square_nodal_axis"
	| "none";

export interface PlutoNodalRelationship {
	aspect: PlutoNodalAspect;
	applyingNode?: "south_node" | "north_node";
	polarityPointApplies: boolean;
	southNodeConjunction?: {
		conclusion: "requires_human_confirmation";
		evidence: {
			reliving: "supported" | "not_supported" | "insufficient";
			fruition: "supported" | "not_supported" | "insufficient";
			dual: "supported" | "not_supported" | "insufficient";
		};
		note: string;
	};
}

export interface EvolutionaryResult {
	pluto?: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		retrograde: boolean;
		aspects: PlutoAspect[];
		aspectCount: number;
		stressfulAspects: number;
		nonstressfulAspects: number;
		nodalRelationship: PlutoNodalRelationship;
		nodalConjunction?: "north_node" | "south_node";
	};
	polarityPoint?: ProjectedEclipticPoint & {
		aspects?: PPPAspect[];
		isOperative?: boolean;
	};
	nodes: {
		northNode?: {
			sign: string;
			signDeg: number;
			house: number;
			ruler?: string;
			rulerPlacement?: NodalRulerPlacement;
			aspects: NodeAspect[];
		};
		southNode?: ProjectedEclipticPoint & {
			ruler?: string;
			rulerPlacement?: NodalRulerPlacement;
			aspects: NodeAspect[];
		};
		motionStatus?: "retrograde" | "direct" | "stationary";
	};
	skippedSteps: EvolutionarySkippedStep[];
	plutoNorthNodeMidpoint?: ProjectedEclipticPoint;
	dispositorChains?: Record<string, DispositorStep[]>;
	solLunaPhase?: SolLunaPhase;
}

export interface EvolutionaryInput {
	bodies: ChartBodiesLite;
	cusps: number[];
}

const PLUTO_NODAL_ORB = 10;
const SKIPPED_STEP_ORB = 5;

function nodeIsApplyingTo(
	nodeLon: number,
	nodeSpeed: number,
	targetLon: number,
): boolean {
	if (nodeSpeed < 0) {
		return normalizeLongitude(nodeLon - targetLon) < 180;
	}
	return normalizeLongitude(targetLon - nodeLon) < 180;
}

function computePlutoNodalRelationship(
	pluto: ChartBodyLite,
	northNode: ChartBodyLite,
	southNode: ChartBodyLite,
	plutoAspects: PlutoAspect[],
): PlutoNodalRelationship {
	const dSouth = angularDistance(pluto.lon, southNode.lon);
	const dNorth = angularDistance(pluto.lon, northNode.lon);
	const squareToNorth = Math.abs(dNorth - 90) <= PLUTO_NODAL_ORB;
	const squareToSouth = Math.abs(dSouth - 90) <= PLUTO_NODAL_ORB;

	let aspect: PlutoNodalAspect = "none";
	if (dSouth <= PLUTO_NODAL_ORB) {
		aspect = "conjunct_south_node";
	} else if (dNorth <= PLUTO_NODAL_ORB) {
		aspect = "conjunct_north_node";
	} else if (squareToNorth || squareToSouth) {
		aspect = "square_nodal_axis";
	}

	const northApplying = nodeIsApplyingTo(
		northNode.lon,
		northNode.speed,
		pluto.lon,
	);
	const southApplying = nodeIsApplyingTo(
		southNode.lon,
		southNode.speed,
		pluto.lon,
	);
	const applyingNode =
		northApplying && !southApplying
			? "south_node"
			: southApplying && !northApplying
				? "north_node"
				: undefined;

	const relationship: PlutoNodalRelationship = {
		aspect,
		applyingNode,
		polarityPointApplies: aspect !== "conjunct_north_node",
	};

	if (aspect === "conjunct_south_node") {
		const stressful = plutoAspects.filter(
			(a) => a.stress === "stressful",
		).length;
		const nonstressful = plutoAspects.filter(
			(a) => a.stress === "nonstressful",
		).length;
		relationship.southNodeConjunction = {
			conclusion: "requires_human_confirmation",
			evidence: {
				reliving:
					stressful > 0
						? "supported"
						: stressful === 0 && nonstressful > 0
							? "not_supported"
							: "insufficient",
				fruition:
					nonstressful > 0
						? "supported"
						: nonstressful === 0 && stressful > 0
							? "not_supported"
							: "insufficient",
				dual: stressful > 0 && nonstressful > 0 ? "supported" : "not_supported",
			},
			note: "Stressful aspects to Pluto suggest a reliving condition; nonstressful aspects suggest fruition; a mixture suggests a dual condition. The actual condition must be confirmed with the individual.",
		};
	}

	return relationship;
}

function getSolLunaPhase(sunLon: number, moonLon: number): SolLunaPhase {
	const angle = roundPrecision(normalizeLongitude(moonLon - sunLon));
	let name = "New";
	if (angle >= 45 && angle < 90) name = "Crescent";
	else if (angle >= 90 && angle < 135) name = "First Quarter";
	else if (angle >= 135 && angle < 180) name = "Gibbous";
	else if (angle >= 180 && angle < 225) name = "Full";
	else if (angle >= 225 && angle < 270) name = "Disseminating";
	else if (angle >= 270 && angle < 315) name = "Last Quarter";
	else if (angle >= 315) name = "Balsamic";
	return { name, angle };
}

/** Complete JWG evolutionary reading from a natal chart (legacy chart-level API). */
export function computeEvolutionaryReading(
	chart: EvolutionaryInput | Chart,
	nodeMode: "both" | "mean" | "true" = "both",
): EvolutionaryResult {
	const { bodies, cusps } = chart;
	const pluto = bodies.pluto;
	const northNode =
		nodeMode === "mean"
			? bodies.mean_node
			: (bodies.true_node ?? bodies.mean_node);

	let southNode:
		| (ProjectedEclipticPoint & {
				ruler?: string;
				rulerPlacement?: NodalRulerPlacement;
				aspects: NodeAspect[];
		  })
		| undefined;
	let nodeMotionStatus: "retrograde" | "direct" | "stationary" | undefined;

	if (northNode) {
		const snLon = normalizeLongitude(northNode.lon + 180);
		const snPoint = projectPoint(snLon, cusps);
		southNode = {
			...snPoint,
			ruler: SIGN_RULERS[snPoint.sign],
			aspects: computeNodeAspects(bodies, snLon),
		};

		const absSpeed = Math.abs(northNode.speed);
		if (absSpeed < 0.005) {
			nodeMotionStatus = "stationary";
		} else if (northNode.speed < 0) {
			nodeMotionStatus = "retrograde";
		} else {
			nodeMotionStatus = "direct";
		}
	}

	const plutoAspects = pluto ? computePlutoAspects(bodies, pluto) : [];

	let plutoNodalRelationship: PlutoNodalRelationship | undefined;
	if (pluto && northNode && southNode) {
		plutoNodalRelationship = computePlutoNodalRelationship(
			pluto,
			northNode,
			{ ...northNode, lon: southNode.lon },
			plutoAspects,
		);
	}

	let polarityPoint:
		| (ProjectedEclipticPoint & {
				aspects?: PPPAspect[];
				isOperative?: boolean;
		  })
		| undefined;

	if (pluto) {
		const pppLon = normalizeLongitude(pluto.lon + 180);
		const pppAspects: PPPAspect[] = [];

		for (const [bodyId, body] of Object.entries(bodies)) {
			if (
				body &&
				bodyId !== "pluto" &&
				bodyId !== "true_node" &&
				bodyId !== "mean_node"
			) {
				const match = findAspect(body.lon, pppLon, PPP_MAJOR_ASPECTS);
				if (match) {
					pppAspects.push({
						body: bodyId,
						aspect: match.aspect,
						orb: match.orb,
					});
				}
			}
		}

		const point = projectPoint(pppLon, cusps);
		polarityPoint = {
			...point,
			...(pppAspects.length > 0 ? { aspects: pppAspects } : {}),
			...(plutoNodalRelationship?.aspect === "conjunct_south_node"
				? { isOperative: true }
				: {}),
		};
	}

	const skippedSteps: EvolutionarySkippedStep[] = [];
	if (northNode && southNode) {
		const squareAspect = {
			name: "square",
			target: 90,
			orb: SKIPPED_STEP_ORB,
			stress: "stressful",
		} as const;

		for (const [bodyId, body] of Object.entries(bodies)) {
			if (
				body === undefined ||
				bodyId === "pluto" ||
				NON_PLANETARY_IDS.has(bodyId)
			) {
				continue;
			}
			const toNorth = matchClosestAspect(body.lon, northNode.lon, [
				squareAspect,
			]);
			const toSouth = matchClosestAspect(body.lon, southNode.lon, [
				squareAspect,
			]);
			if (toNorth || toSouth) {
				skippedSteps.push({
					body: bodyId,
					aspect: "square",
					target: "nodal_axis",
					orb: roundPrecision(
						Math.min(toNorth?.orb ?? Infinity, toSouth?.orb ?? Infinity),
					),
				});
			}
		}
	}
	skippedSteps.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));

	let plutoNorthNodeMidpoint: ProjectedEclipticPoint | undefined;
	if (pluto && northNode) {
		const diff = Math.abs(pluto.lon - northNode.lon);
		let mid = (pluto.lon + northNode.lon) / 2;
		if (diff > 180) mid = (mid + 180) % 360;
		plutoNorthNodeMidpoint = projectPoint(mid, cusps);
	}

	const dispositorChains: Record<string, DispositorStep[]> = {};
	for (const key of ["pluto", "chiron"]) {
		if (bodies[key as keyof typeof bodies]) {
			dispositorChains[key] = buildDispositorChain(bodies, key);
		}
	}

	let solLunaPhase: SolLunaPhase | undefined;
	if (bodies.sun && bodies.moon) {
		solLunaPhase = getSolLunaPhase(bodies.sun.lon, bodies.moon.lon);
	}

	const getRulerPlacement = (
		rulerId?: string,
	): NodalRulerPlacement | undefined => {
		if (!rulerId) return undefined;
		const b = bodies[rulerId as keyof typeof bodies];
		if (!b) return undefined;
		return {
			body: rulerId,
			sign: b.sign,
			signDeg: roundPrecision(b.signDeg),
			house: b.house,
			retrograde: b.retrograde ?? b.speed < 0,
		};
	};

	const nnRuler = northNode ? SIGN_RULERS[northNode.sign] : undefined;
	const relationshipAspect = plutoNodalRelationship?.aspect ?? "none";
	const nodalConjunction =
		relationshipAspect === "conjunct_south_node"
			? "south_node"
			: relationshipAspect === "conjunct_north_node"
				? "north_node"
				: undefined;

	return {
		pluto: pluto
			? {
					lon: roundPrecision(pluto.lon),
					sign: pluto.sign,
					signDeg: roundPrecision(pluto.signDeg),
					house: pluto.house,
					retrograde: pluto.retrograde ?? pluto.speed < 0,
					aspects: plutoAspects,
					aspectCount: plutoAspects.length,
					stressfulAspects: plutoAspects.filter((a) => a.stress === "stressful")
						.length,
					nonstressfulAspects: plutoAspects.filter(
						(a) => a.stress === "nonstressful",
					).length,
					nodalRelationship: plutoNodalRelationship ?? {
						aspect: "none",
						polarityPointApplies: true,
					},
					...(nodalConjunction ? { nodalConjunction } : {}),
				}
			: undefined,
		polarityPoint:
			relationshipAspect === "conjunct_north_node" ||
			polarityPoint === undefined
				? undefined
				: {
						...polarityPoint,
						isOperative:
							relationshipAspect === "conjunct_south_node"
								? true
								: (polarityPoint.isOperative ?? true),
					},
		nodes: {
			northNode: northNode
				? {
						sign: northNode.sign,
						signDeg: roundPrecision(northNode.signDeg),
						house: northNode.house,
						ruler: nnRuler,
						rulerPlacement: getRulerPlacement(nnRuler),
						aspects: computeNodeAspects(bodies, northNode.lon),
					}
				: undefined,
			southNode,
			motionStatus: nodeMotionStatus,
		},
		skippedSteps,
		plutoNorthNodeMidpoint,
		dispositorChains,
		solLunaPhase,
	};
}

export { computeEvolutionaryReading as computeEvolutionary };
