import { EVO_ASPECTS, evaluateAspectsAgainstPoint } from "../shared/aspects";
import {
	computeShadowAntiscia,
	normalizeLongitude,
	projectPoint,
	roundPrecision,
} from "../shared/geometry";
import { buildDispositorChain, SIGN_RULERS } from "../shared/rulers";
import type {
	DispositorChainOutput,
	NodalAxisFact,
	NodalRulerPlacement,
	NodeAspectProjection,
	NodeMotionStatus,
	SkippedStepProjection,
} from "./types";

const SKIPPED_STEPS_ORB = 5;

export function evaluateNodeAspects(
	bodies: Record<string, { lon: number }>,
	nodeLon: number,
): NodeAspectProjection[] {
	return evaluateAspectsAgainstPoint(bodies, { lon: nodeLon }, EVO_ASPECTS, {
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
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: northNodeLon, excludeId: "pluto" },
		[{ name: "square", target: 90, orb: orbLimit }],
		{ excludeNonPlanetary: true, precision: 4 },
	).map((a) => {
		const bodyLon = bodies[a.body]?.lon ?? 0;
		// In JWGEA, nodes move in retrograde direction (decreasing longitude).
		// A planet is moving from North Node to South Node if it lies between NN and SN in zodiacal direct order.
		// Measuring direct distance from North Node to the planet:
		// If 0 < (planet - NN) < 180, the planet last conjoined North Node and is applying/resolving to the South Node.
		// If 180 < (planet - NN) < 360, it last conjoined South Node and is applying/resolving to the North Node.
		const distFromNN = normalizeLongitude(bodyLon - northNodeLon);
		const resolutionNode: "north" | "south" =
			distFromNN > 0 && distFromNN < 180 ? "south" : "north";

		return {
			body: a.body,
			aspect: a.aspect,
			orb: a.orb,
			resolutionNode,
		};
	});
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

export function computeNodalAxisFact(
	bodies: Record<
		string,
		{ lon: number; sign: string; signDeg: number; house: number; speed: number }
	>,
	cusps: number[],
): {
	nodalAxis: NodalAxisFact;
	dispositorChains: {
		southNodeRuler?: DispositorChainOutput;
		northNodeRuler?: DispositorChainOutput;
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

	const southDispositor = southRulerId
		? buildDispositorChain(bodies, southRulerId)
		: undefined;
	const northDispositor = northRulerId
		? buildDispositorChain(bodies, northRulerId)
		: undefined;

	const northAntiscia = computeShadowAntiscia(northNode.lon, cusps);
	const southAntiscia = computeShadowAntiscia(southNodeLon, cusps);

	return {
		nodalAxis: {
			north: {
				sign: northNode.sign,
				signDeg: roundPrecision(northNode.signDeg, 4),
				house: northNode.house,
				speed: roundPrecision(northNode.speed, 6),
				dec: roundPrecision(northNode.dec ?? 0, 4),
				outOfBounds: Math.abs(northNode.dec ?? 0) > 23.44,
				ruler: northRulerId,
				rulerPlacement: northRulerPlacement,
				antiscia: northAntiscia,
			},
			south: {
				sign: southNodeProjected.sign,
				signDeg: roundPrecision(southNodeProjected.signDeg, 4),
				house: southNodeProjected.house,
				speed: roundPrecision(northNode.speed, 6),
				dec: roundPrecision(-(northNode.dec ?? 0), 4),
				outOfBounds: Math.abs(northNode.dec ?? 0) > 23.44,
				ruler: southRulerId,
				rulerPlacement: southRulerPlacement,
				antiscia: southAntiscia,
			},
			motion,
		},
		skippedSteps,
		dispositorChains: {
			southNodeRuler: southDispositor,
			northNodeRuler: northDispositor,
		},
	};
}
