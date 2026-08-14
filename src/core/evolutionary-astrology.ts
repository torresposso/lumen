import type { Chart } from "caelus";
import {
	type AspectDef,
	findAspect,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision as round4,
} from "./celestial-coordinates";

/** Represents a karmic Skipped Step: a planetary archetype that forms a square (90° ± 5°)
 *  to the Nodal Axis or Pluto, indicating unresolved evolutionary blocks from prior lives. */
export interface SkippedStep {
	body: string;
	aspect: string;
	target: string;
	orb: number;
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

/** The complete Jeffrey Wolf Green Evolutionary Astrology (JWGEA) reading result. */
export interface EvolutionaryResult {
	pluto?: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		retrograde: boolean;
	};
	polarityPoint?: ProjectedEclipticPoint & {
		aspects?: PPPAspect[];
	};
	nodes: {
		northNode?: {
			sign: string;
			signDeg: number;
			house: number;
			ruler?: string;
		};
		southNode?: ProjectedEclipticPoint & { ruler?: string };
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

/** Major planetary aspects evaluated for the Pluto Polarity Point (orb ≤ 5°). */
const PPP_MAJOR_ASPECTS: AspectDef[] = [
	{ name: "conjunction", target: 0, orb: 5 },
	{ name: "sextile", target: 60, orb: 5 },
	{ name: "square", target: 90, orb: 5 },
	{ name: "trine", target: 120, orb: 5 },
	{ name: "opposition", target: 180, orb: 5 },
];

/** Skipped step square aspect definition (90° ± 5°). */
const SKIPPED_STEP_ASPECT: AspectDef[] = [
	{ name: "square", target: 90, orb: 5 },
];

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

/** Computes the Jeffrey Wolf Green Evolutionary Astrology reading directly from a chart:
 *  Pluto's soul placement and Polarity Point (evolutionary direction), the Nodal Axis
 *  with its planetary rulers, Skipped Steps (karmic squares), the Pluto–North Node Midpoint,
 *  Sol-Luna Phase Mechanics, and the Pluto/Chiron dispositor chains. */
export function computeEvolutionaryReading(
	chart: EvolutionaryInput | Chart,
): EvolutionaryResult {
	const { bodies, cusps } = chart;
	const pluto = bodies.pluto;
	let polarityPoint:
		| (ProjectedEclipticPoint & { aspects?: PPPAspect[] })
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
		};
	}

	const northNode = bodies.true_node ?? bodies.mean_node;
	let southNode: (ProjectedEclipticPoint & { ruler?: string }) | undefined;
	let nodeMotionStatus: "retrograde" | "direct" | "stationary" | undefined;

	if (northNode) {
		const snLon = normalizeLongitude(northNode.lon + 180);
		const snPoint = projectPoint(snLon, cusps);
		southNode = {
			...snPoint,
			ruler: SIGN_RULERS[snPoint.sign],
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

	const skippedSteps: SkippedStep[] = [];
	const targets = [
		{ id: "north_node", lon: northNode?.lon },
		{ id: "south_node", lon: southNode?.lon },
		{ id: "pluto", lon: pluto?.lon },
	].filter((t) => t.lon !== undefined);

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (
			body &&
			bodyId !== "true_node" &&
			bodyId !== "mean_node" &&
			bodyId !== "pluto"
		) {
			for (const target of targets) {
				if (target.lon !== undefined) {
					const match = findAspect(body.lon, target.lon, SKIPPED_STEP_ASPECT);
					if (match) {
						skippedSteps.push({
							body: bodyId,
							aspect: match.aspect,
							target: target.id,
							orb: match.orb,
						});
					}
				}
			}
		}
	}

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

	return {
		pluto: pluto
			? {
					lon: round4(pluto.lon),
					sign: pluto.sign,
					signDeg: round4(pluto.signDeg),
					house: pluto.house,
					retrograde: pluto.retrograde,
				}
			: undefined,
		polarityPoint,
		nodes: {
			northNode: northNode
				? {
						sign: northNode.sign,
						signDeg: round4(northNode.signDeg),
						house: northNode.house,
						ruler: SIGN_RULERS[northNode.sign],
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
