import { aspectPhase } from "caelus";
import { angularDistance, roundPrecision } from "./geometry";

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

export interface EvaluatedPointAspect {
	body: string;
	aspect: string;
	orb: number;
	stress?: AspectStress;
	phase?: "applying" | "separating" | "exact";
}

export const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

export function matchClosestAspect<
	T extends { name: string; target: number; orb: number },
>(
	lonA: number,
	lonB: number,
	aspectDefs: readonly T[],
): { def: T; orb: number } | undefined {
	const dist = angularDistance(lonA, lonB);
	let best: { def: T; orb: number } | undefined;
	for (const def of aspectDefs) {
		const orb = Math.abs(dist - def.target);
		if (orb <= def.orb && (best === undefined || orb < best.orb)) {
			best = { def, orb };
		}
	}
	return best;
}

export function evaluateAspectsAgainstPoint<
	TDef extends {
		name: string;
		target: number;
		orb: number;
		stress?: AspectStress;
	},
>(
	bodies: Record<string, { lon: number; speed?: number }>,
	target: { lon: number; speed?: number; excludeId?: string },
	aspectDefs: readonly TDef[],
	options: {
		excludeNonPlanetary?: boolean;
		includePhase?: boolean;
		precision?: number;
	} = {},
): EvaluatedPointAspect[] {
	const precision = options.precision ?? 4;
	const results: EvaluatedPointAspect[] = [];

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body) continue;
		if (target.excludeId && bodyId === target.excludeId) continue;
		if (options.excludeNonPlanetary && NON_PLANETARY_IDS.has(bodyId)) continue;

		const match = matchClosestAspect(body.lon, target.lon, aspectDefs);
		if (match) {
			const aspectItem: EvaluatedPointAspect = {
				body: bodyId,
				aspect: match.def.name,
				orb: roundPrecision(match.orb, precision),
				...(match.def.stress ? { stress: match.def.stress } : {}),
			};

			if (
				options.includePhase &&
				body.speed !== undefined &&
				target.speed !== undefined
			) {
				aspectItem.phase = aspectPhase(
					body.lon,
					body.speed,
					target.lon,
					target.speed,
					match.def.target,
				);
			}

			results.push(aspectItem);
		}
	}

	return results.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}
