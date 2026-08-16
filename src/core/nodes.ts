import type { Chart } from "caelus";
import {
	angularDistance,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
} from "./celestial-coordinates";
import {
	buildDispositorChain,
	type DispositorStep,
	NON_PLANETARY_IDS,
	PLUTO_ASPECTS,
	SIGN_RULERS,
} from "./soul";
import type {
	NodalRulerPlacement,
	NodeMotionStatus,
	SkippedStep,
} from "./types";

export type { NodalRulerPlacement, NodeMotionStatus, SkippedStep };

export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: "stressful" | "nonstressful";
}

export interface NodalAxisReading {
	northNode: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		ruler?: string;
		rulerPlacement?: NodalRulerPlacement;
		aspects: NodeAspect[];
	};
	southNode: ProjectedEclipticPoint & {
		ruler?: string;
		rulerPlacement?: NodalRulerPlacement;
		aspects: NodeAspect[];
	};
	motionStatus: NodeMotionStatus;
	skippedSteps: SkippedStep[];
	dispositorChains: {
		southNodeRuler?: DispositorStep[];
		northNodeRuler?: DispositorStep[];
	};
}

function matchClosestAspect(
	lonA: number,
	lonB: number,
):
	| { aspect: string; orb: number; stress: "stressful" | "nonstressful" }
	| undefined {
	const dist = angularDistance(lonA, lonB);
	let best: { def: (typeof PLUTO_ASPECTS)[number]; orb: number } | undefined;
	for (const def of PLUTO_ASPECTS) {
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

export function computeNodeAspects(
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
		const match = matchClosestAspect(body.lon, nodeLon);
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

export function computeSkippedSteps(
	bodies: Chart["bodies"],
	northNodeLon: number,
	orbLimit = 5,
): SkippedStep[] {
	const skippedSteps: SkippedStep[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (
			body === undefined ||
			bodyId === "pluto" ||
			NON_PLANETARY_IDS.has(bodyId)
		) {
			continue;
		}
		const dist = angularDistance(body.lon, northNodeLon);
		const orb = Math.abs(dist - 90);
		if (orb <= orbLimit) {
			skippedSteps.push({
				body: bodyId,
				aspect: "square",
				orb: roundPrecision(orb),
			});
		}
	}
	return skippedSteps.sort((a, b) => a.orb - b.orb);
}

export function computeNodalRuler(
	rulerId: string | undefined,
	bodies: Chart["bodies"],
): NodalRulerPlacement | undefined {
	if (!rulerId) return undefined;
	const body = bodies[rulerId as keyof typeof bodies];
	if (!body) return undefined;

	const motion: "direct" | "retrograde" | "stationary" =
		Math.abs(body.speed) < 0.0001
			? "stationary"
			: body.speed < 0
				? "retrograde"
				: "direct";

	const capitalized = rulerId.charAt(0).toUpperCase() + rulerId.slice(1);
	const motionLabel = motion.charAt(0).toUpperCase() + motion.slice(1);

	return {
		body: rulerId,
		sign: body.sign,
		signDeg: roundPrecision(body.signDeg),
		house: body.house,
		motion,
		description: `${capitalized} in ${body.sign}/H${body.house} (${motionLabel})`,
	};
}

/**
 * Computes the complete Nodal Axis mechanics (North Node, South Node, Rulers, Skipped Steps).
 */
export function computeNodalReading(
	bodies: Chart["bodies"],
	cusps: number[],
	orbLimit = 5,
): NodalAxisReading | undefined {
	const northNode = bodies.true_node ?? bodies.mean_node;
	if (!northNode) return undefined;

	const southNodeLon = normalizeLongitude(northNode.lon + 180);
	const southNodeProjected = projectPoint(southNodeLon, cusps);

	const motionStatus: NodeMotionStatus =
		Math.abs(northNode.speed) < 0.0001
			? "stationary"
			: northNode.speed < 0
				? "retrograde"
				: "direct";

	const northNodeRulerId = SIGN_RULERS[northNode.sign];
	const southNodeRulerId = SIGN_RULERS[southNodeProjected.sign];

	const northNodeRulerPlacement = computeNodalRuler(northNodeRulerId, bodies);
	const southNodeRulerPlacement = computeNodalRuler(southNodeRulerId, bodies);

	const skippedSteps = computeSkippedSteps(bodies, northNode.lon, orbLimit);

	const northNodeAspects = computeNodeAspects(bodies, northNode.lon);
	const southNodeAspects = computeNodeAspects(bodies, southNodeLon);

	const southNodeDispositor = southNodeRulerId
		? buildDispositorChain(bodies, southNodeRulerId)
		: undefined;
	const northNodeDispositor = northNodeRulerId
		? buildDispositorChain(bodies, northNodeRulerId)
		: undefined;

	return {
		northNode: {
			lon: northNode.lon,
			sign: northNode.sign,
			signDeg: northNode.signDeg,
			house: northNode.house,
			ruler: northNodeRulerId,
			rulerPlacement: northNodeRulerPlacement,
			aspects: northNodeAspects,
		},
		southNode: {
			...southNodeProjected,
			ruler: southNodeRulerId,
			rulerPlacement: southNodeRulerPlacement,
			aspects: southNodeAspects,
		},
		motionStatus,
		skippedSteps,
		dispositorChains: {
			southNodeRuler: southNodeDispositor,
			northNodeRuler: northNodeDispositor,
		},
	};
}
