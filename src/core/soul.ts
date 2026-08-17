import type {
	ChartBodiesLite,
	ChartBodyLite,
	PlutoPolarityPoint,
} from "./types";
import {
	angularDistance,
	angularDistanceDirect,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
} from "./types";

export { SIGN_RULERS };

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

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

export interface NodeAspect {
	body: string;
	aspect: string;
	orb: number;
	stress: AspectStress;
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
	plutoNorthNodeAntiMidpoint?: ProjectedEclipticPoint & { formatted: string };
	dispositorChain: DispositorStep[];
}

// ---------------------------------------------------------------------------
// Shared aspect mechanics
// ---------------------------------------------------------------------------

function normalizedSignedDelta(from: number, to: number): number {
	const raw = (to - from) % 360;
	if (raw > 180) return raw - 360;
	if (raw < -180) return raw + 360;
	return raw;
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

function aspectPhase(
	body: ChartBodyLite,
	pluto: ChartBodyLite,
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
	if ((relativeSpeed > 0 && delta > 0) || (relativeSpeed < 0 && delta < 0)) {
		return "applying";
	}
	return "separating";
}

export function computePlutoAspects(
	bodies: ChartBodiesLite,
	pluto: ChartBodyLite,
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

export function computePPPAspects(
	bodies: ChartBodiesLite,
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
	bodies: ChartBodiesLite,
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

		chain.push({ body: currentId, sign: body.sign, ruler });
		if (ruler === currentId) break;
		currentId = ruler;
	}

	return chain;
}

/** Returns the near midpoint (shortest arc) between two longitudes. */
function nearMidpoint(a: number, b: number): number {
	const arc = angularDistanceDirect(a, b); // [0, 360)
	if (arc <= 180) return normalizeLongitude(a + arc / 2);
	return normalizeLongitude(a - (360 - arc) / 2);
}

function formatPoint(
	point: ProjectedEclipticPoint,
): ProjectedEclipticPoint & { formatted: string } {
	const deg = Math.floor(point.signDeg);
	const min = Math.round((point.signDeg - deg) * 60);
	return {
		...point,
		formatted: `${point.sign} ${deg}°${String(min).padStart(2, "0")}' (H${point.house})`,
	};
}

/**
 * Deep Soul reading: Pluto paradigm, PPP (deactivated when conjunct NN),
 * Pluto-NN midpoint, aspect balance and Pluto dispositor chain.
 */
export function computeSoulReading(
	bodies: ChartBodiesLite,
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

	const isConjunctNN =
		northNodeLon !== undefined &&
		angularDistance(pluto.lon, northNodeLon) <= 10;
	const pppActive = !isConjunctNN;
	const pppDescription = pppActive
		? `${pppProjected.sign}/H${pppProjected.house}`
		: "none (Direct integration through North Node)";

	type FormattedPoint = ProjectedEclipticPoint & { formatted: string };
	let plutoNorthNodeMidpoint: FormattedPoint | undefined;
	let plutoNorthNodeAntiMidpoint: FormattedPoint | undefined;
	if (northNodeLon !== undefined) {
		const near = nearMidpoint(pluto.lon, northNodeLon);
		const far = normalizeLongitude(near + 180);
		plutoNorthNodeMidpoint = formatPoint(projectPoint(near, cusps));
		plutoNorthNodeAntiMidpoint = formatPoint(projectPoint(far, cusps));
	}

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
		plutoNorthNodeAntiMidpoint,
		dispositorChain: buildDispositorChain(bodies, "pluto"),
	};
}
