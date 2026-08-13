import type { Chart } from "caelus";
import {
	angularDistance,
	houseOf,
	type LotInfo,
	normalizeLongitude,
	signOf,
} from "./zodiac";

export interface SkippedStep {
	body: string;
	aspect: string;
	target: string;
	orb: number;
}

export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

export interface PPPAspect {
	body: string;
	aspect: string;
	orb: number;
}

export interface SolLunaPhase {
	name: string;
	angle: number;
}

export interface EvolutionaryResult {
	pluto?: {
		lon: number;
		sign: string;
		signDeg: number;
		house: number;
		retrograde: boolean;
	};
	polarityPoint?: LotInfo & {
		aspects?: PPPAspect[];
	};
	nodes: {
		northNode?: {
			sign: string;
			signDeg: number;
			house: number;
			ruler?: string;
		};
		southNode?: LotInfo & { ruler?: string };
		motionStatus?: "retrograde" | "direct" | "stationary";
	};
	skippedSteps: SkippedStep[];
	plutoNorthNodeMidpoint?: LotInfo;
	dispositorChains?: Record<string, DispositorStep[]>;
	solLunaPhase?: SolLunaPhase;
}

export interface EvolutionaryInput {
	bodies: Chart["bodies"];
	cusps: number[];
}

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

const MAJOR_ASPECTS = [
	{ name: "conjunction", target: 0, orb: 8 },
	{ name: "sextile", target: 60, orb: 5 },
	{ name: "square", target: 90, orb: 5 },
	{ name: "trine", target: 120, orb: 5 },
	{ name: "opposition", target: 180, orb: 8 },
];

function round4(val: number): number {
	return Number(val.toFixed(4));
}

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

/** Trace dispositor chain for a given body up to maxDepth steps. */
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

/** Compute the Jeffrey Wolf Green evolutionary reading directly from a chart:
 *  Pluto's placement and Polarity Point, the lunar-node axis with rulers, Skipped
 *  Steps, the Pluto–North Node Midpoint, and the Pluto/Chiron dispositor chains. */
export function computeEvolutionaryReading(
	chart: EvolutionaryInput | Chart,
): EvolutionaryResult {
	const { bodies, cusps } = chart;
	const pluto = bodies.pluto;
	let polarityPoint: (LotInfo & { aspects?: PPPAspect[] }) | undefined;

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
				const dist = angularDistance(body.lon, pppLon);
				for (const asp of MAJOR_ASPECTS) {
					const diff = Math.abs(dist - asp.target);
					if (diff <= 5.0) {
						pppAspects.push({
							body: bodyId,
							aspect: asp.name,
							orb: round4(diff),
						});
					}
				}
			}
		}



		polarityPoint = {
			lon: round4(pppLon),
			sign: signOf(pppLon),
			signDeg: round4(pppLon % 30),
			house: houseOf(cusps, pppLon),
			...(pppAspects.length > 0 ? { aspects: pppAspects } : {}),
		};
	}

	const northNode = bodies.true_node ?? bodies.mean_node;
	let southNode: (LotInfo & { ruler?: string }) | undefined;
	let nodeMotionStatus: "retrograde" | "direct" | "stationary" | undefined;

	if (northNode) {
		const snLon = normalizeLongitude(northNode.lon + 180);
		const snSign = signOf(snLon);
		southNode = {
			lon: round4(snLon),
			sign: snSign,
			signDeg: round4(snLon % 30),
			house: houseOf(cusps, snLon),
			ruler: SIGN_RULERS[snSign],
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
					const diff = angularDistance(body.lon, target.lon);
					const orb = Math.abs(diff - 90);
					if (orb <= 5.0) {
						skippedSteps.push({
							body: bodyId,
							aspect: "square",
							target: target.id,
							orb: round4(orb),
						});
					}
				}
			}
		}
	}

	let plutoNorthNodeMidpoint: LotInfo | undefined;
	if (pluto && northNode) {
		const diff = Math.abs(pluto.lon - northNode.lon);
		let mid = (pluto.lon + northNode.lon) / 2;
		if (diff > 180) mid = (mid + 180) % 360;
		plutoNorthNodeMidpoint = {
			lon: round4(mid),
			sign: signOf(mid),
			signDeg: round4(mid % 30),
			house: houseOf(cusps, mid),
		};
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

