import type { HouseSystem } from "caelus";
import {
	type AspectStress,
	PLUTO_ASPECTS,
	SKIPPED_STEPS_ORB,
} from "./evo-criteria";
import {
	buildDispositorChain,
	type DispositorStep,
	NON_PLANETARY_IDS,
	SIGN_RULERS,
} from "./soul";
import type {
	ChartBodiesLite,
	Ephemeris,
	NodalRulerPlacement,
	NodeMotionStatus,
	ResolvedBirth,
	SkippedStep,
} from "./types";
import {
	angularDistance,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	shiftLongitude,
} from "./types";

export { SKIPPED_STEPS_ORB } from "./evo-criteria";
export type { NodalRulerPlacement, NodeMotionStatus, SkippedStep };

export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
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
	bodies: ChartBodiesLite,
	nodeLon: number,
): NodeAspect[] {
	const aspects: NodeAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (body === undefined || NON_PLANETARY_IDS.has(bodyId)) {
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
	bodies: ChartBodiesLite,
	northNodeLon: number,
	orbLimit = SKIPPED_STEPS_ORB,
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
	bodies: ChartBodiesLite,
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
	bodies: ChartBodiesLite,
	cusps: number[],
	orbLimit = SKIPPED_STEPS_ORB,
): NodalAxisReading | undefined {
	const northNode = bodies.true_node;
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

// ---------------------------------------------------------------------------
// Prenatal eclipses (nodal events of the soul's evolutionary intention)
// ---------------------------------------------------------------------------

export interface EclipseInfo {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface EclipsesResult {
	solar?: EclipseInfo;
	lunar?: EclipseInfo;
}

/**
 * Computes the prenatal solar and lunar eclipses within 180 days before birth.
 *
 * `eclipseShiftLon` (draconic frame, ADR-0014): when set, the natal eclipse
 * longitude is shifted (`lon − eclipseShiftLon`) before projecting against the
 * given `cusps` — the same North-Node subtraction the draconic projection
 * applies to bodies, so the eclipse is published on the draconic zodiac.
 */
export function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
	houseSystem: HouseSystem,
	topocentric = false,
	eclipseShiftLon?: number,
): EclipsesResult {
	const jdStart = birth.jdUt - 180;
	const jdEnd = birth.jdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (
		tMax: number,
		type: string,
		isLunar = false,
	): EclipseInfo => {
		const pos = ephemeris.chartAt(tMax, birth.lat, birth.lon, {
			houseSystem,
			topocentric,
		});
		const targetBody = isLunar ? pos.bodies.moon : pos.bodies.sun;
		if (!targetBody) {
			throw new Error(
				`${isLunar ? "Moon" : "Sun"} position unavailable for eclipse calculation`,
			);
		}
		const rawLon = targetBody.lon;
		const frameLon =
			eclipseShiftLon === undefined
				? rawLon
				: shiftLongitude(rawLon, eclipseShiftLon);
		const point = projectPoint(frameLon, cusps);
		return {
			tMax: roundPrecision(tMax),
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
