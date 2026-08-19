import {
	evaluateAspectsAgainstPoint,
	type StressedAspectDef,
} from "../shared/aspects";
import {
	angularDistance,
	computeMidpoints,
	normalizeLongitude,
	projectPoint,
	roundPrecision,
} from "../shared/geometry";
import { buildDispositorChain } from "../shared/rulers";
import type {
	PlutoAspectProjection,
	PlutoPolarityOutput,
	PPPAspectProjection,
	ProjectedEclipticPoint,
} from "./types";

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

export const PPP_DEACTIVATION_ORB = 3;

export function evaluatePlutoAspects(
	bodies: Record<string, { lon: number; speed: number }>,
	pluto: { lon: number; speed: number },
): PlutoAspectProjection[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pluto.lon, speed: pluto.speed, excludeId: "pluto" },
		PLUTO_ASPECTS,
		{ excludeNonPlanetary: true, includePhase: true, precision: 4 },
	) as PlutoAspectProjection[];
}

export function evaluatePPPAspects(
	bodies: Record<string, { lon: number }>,
	pppLon: number,
): PPPAspectProjection[] {
	return evaluateAspectsAgainstPoint(
		bodies,
		{ lon: pppLon, excludeId: "pluto" },
		PPP_MAJOR_ASPECTS,
		{ excludeNonPlanetary: true, precision: 4 },
	).map((a) => ({ body: a.body, aspect: a.aspect, orb: a.orb }));
}

export function computePlutoPolarityFact(
	bodies: Record<
		string,
		{ lon: number; sign: string; signDeg: number; house: number; speed: number }
	>,
	cusps: number[],
	northNodeLon?: number,
): PlutoPolarityOutput {
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
