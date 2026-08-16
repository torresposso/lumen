import type { Chart, ChartBody } from "caelus";
import {
	angularDistance,
	angularDistanceDirect,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
} from "./celestial-coordinates";
import type { PlutoPolarityPoint } from "./types";

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

export const SIGN_RULERS: Record<string, string> = {
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

export function computePlutoAspects(
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

export function computePPPAspects(
	bodies: Chart["bodies"],
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

/**
 * Computes the Soul and Pluto paradigm according to Jeffrey Wolf Green (JWGEA).
 */
export function computeSoulReading(
	bodies: Chart["bodies"],
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

	// Pluto conjunct North Node deactivates the Polarity Point (evolution channels through NN)
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

	const dispositorChain = buildDispositorChain(bodies, "pluto");

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
		dispositorChain,
	};
}
