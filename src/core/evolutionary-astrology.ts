import type { Chart, ChartBody } from "caelus";
import {
	angularDistance,
	findAspect,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision as round4,
} from "./celestial-coordinates";

export type AspectStress = "stressful" | "nonstressful";

/** A planet squaring the lunar nodal axis. In Jeffrey Wolf Green's method these
 *  are skipped steps: the Soul attempted to move toward the North Node without
 *  resolving the South Node dynamics that made the step necessary. */
export interface SkippedStep {
	body: string;
	aspect: "square";
	target: "nodal_axis";
	orb: number;
}

/** An aspect formed by another body to Pluto. Stressful aspects imply intensified
 *  metamorphosis; nonstressful aspects imply a smoother evolutionary process. */
export interface PlutoAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

/** An aspect formed by another body to one of the lunar nodes. */
export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
}

/** Step in a planetary dispositor chain, tracing the root psychological and soul drivers. */
export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

/** Aspect formed directly to the Pluto Polarity Point (PPP). */
export interface PPPAspect {
	body: string;
	aspect: string;
	orb: number;
}

/** The Sol-Luna evolutionary phase relationship divided into the 8 archetypal soul phases. */
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

/** Jeffrey Wolf Green's rule for Pluto in aspect to the nodal axis.
 *  `applyingNode` is the node Pluto is applying to; because the mean motion of
 *  the nodes is retrograde, the normal application rules are reversed. */
export interface PlutoNodalRelationship {
	aspect: PlutoNodalAspect;
	/** The node Pluto is applying to, when determinable from nodal motion. */
	applyingNode?: "south_node" | "north_node";
	/** Pluto's polarity point does not apply when Pluto is conjunct the North Node. */
	polarityPointApplies: boolean;
	/** Evidence for the three possible conditions when Pluto is conjunct the South Node. */
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

/** The complete Jeffrey Wolf Green Evolutionary Astrology (JWGEA) reading result. */
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
		/** Backwards-compatible alias for nodalRelationship.aspect. */
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
	skippedSteps: SkippedStep[];
	plutoNorthNodeMidpoint?: ProjectedEclipticPoint;
	dispositorChains?: Record<string, DispositorStep[]>;
	solLunaPhase?: SolLunaPhase;
}

export interface EvolutionaryInput {
	bodies: Chart["bodies"];
	cusps: number[];
}

interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

/** Modern / Evolutionary planetary sign rulership matrix (JWGEA). */
const SIGN_RULERS: Record<string, string> = {
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

/** Pluto aspects from Jeffrey Wolf Green, Pluto Vol. 1: stressful aspects are
 *  conjunction, square, sesquiquadrate, inconjunct, semi-square and opposition;
 *  nonstressful aspects include semi-sextile, septile, quintile and trine. */
const PLUTO_ASPECTS: StressedAspectDef[] = [
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

const PLUTO_NODAL_ORB = 10;
const SKIPPED_STEP_ORB = 7;

/** Major planetary aspects evaluated for the Pluto Polarity Point (orb ≤ 5°). */
const PPP_MAJOR_ASPECTS = [
	{ name: "conjunction", target: 0, orb: 5 },
	{ name: "sextile", target: 60, orb: 5 },
	{ name: "square", target: 90, orb: 5 },
	{ name: "trine", target: 120, orb: 5 },
	{ name: "opposition", target: 180, orb: 5 },
] as const;

const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

function normalizedSignedDelta(from: number, to: number): number {
	const raw = (to - from) % 360;
	if (raw > 180) return raw - 360;
	if (raw < -180) return raw + 360;
	return raw;
}

/** Matches the closest supported aspect instead of the first one in table order. */
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
		orb: round4(best.orb),
		stress: best.def.stress,
	};
}

function aspectPhase(
	body: ChartBody,
	pluto: ChartBody,
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

function computePlutoAspects(
	bodies: Chart["bodies"],
	pluto: ChartBody,
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
	pluto: ChartBody,
	northNode: ChartBody,
	southNode: ChartBody,
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
	// With the nodes in opposition, exactly one node is normally applying to Pluto;
	// the other is separating and is therefore the node Pluto is applying to.
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

/** Determines the Sol-Luna evolutionary phase archetype based on angular separation. */
function getSolLunaPhase(sunLon: number, moonLon: number): SolLunaPhase {
	const angle = round4(normalizeLongitude(moonLon - sunLon));
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

/** Traces the planetary dispositor chain for a given body up to maxDepth steps. */
function buildDispositorChain(
	bodies: Chart["bodies"],
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

		chain.push({
			body: currentId,
			sign: body.sign,
			ruler,
		});

		if (ruler === currentId) break;
		currentId = ruler;
	}

	return chain;
}

function computeNodeAspects(
	bodies: Chart["bodies"],
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

/** Computes the Jeffrey Wolf Green Evolutionary Astrology reading directly from a chart:
 *  Pluto's soul placement and Polarity Point (evolutionary direction), the Nodal Axis
 *  with its planetary rulers and aspects, Skipped Steps (squares to the nodal axis),
 *  the Pluto–North Node Midpoint, Sol-Luna Phase Mechanics, and the Pluto/Chiron
 *  dispositor chains. */
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
		// The derived South Node shares the selected node's speed; only its
		// longitude differs. This preserves the node application logic.
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

	const skippedSteps: SkippedStep[] = [];
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
					orb: round4(
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
			signDeg: round4(b.signDeg),
			house: b.house,
			retrograde: b.retrograde,
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
					lon: round4(pluto.lon),
					sign: pluto.sign,
					signDeg: round4(pluto.signDeg),
					house: pluto.house,
					retrograde: pluto.retrograde,
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
						signDeg: round4(northNode.signDeg),
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
