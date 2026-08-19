import {
	buildDispositorChain,
	type DispositorStep,
	NON_PLANETARY_IDS,
	normalizeLongitude,
	PLUTO_ASPECTS,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
	SKIPPED_STEPS_ORB,
} from "./soul";

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

function matchClosestNodeAspect(
	lonA: number,
	lonB: number,
):
	| { name: string; orb: number; stress: "stressful" | "nonstressful" }
	| undefined {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;

	let best:
		| { name: string; orb: number; stress: "stressful" | "nonstressful" }
		| undefined;
	for (const def of PLUTO_ASPECTS) {
		const orb = Math.abs(diff - def.target);
		if (orb <= def.orb && (best === undefined || orb < best.orb)) {
			best = { name: def.name, orb, stress: def.stress };
		}
	}
	return best;
}

export function computeNodeAspects(
	bodies: Record<string, { lon: number }>,
	nodeLon: number,
): NodeAspect[] {
	const aspects: NodeAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body || NON_PLANETARY_IDS.has(bodyId)) continue;
		const match = matchClosestNodeAspect(body.lon, nodeLon);
		if (match) {
			aspects.push({
				body: bodyId,
				aspect: match.name,
				orb: roundPrecision(match.orb, 4),
				stress: match.stress,
			});
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
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
