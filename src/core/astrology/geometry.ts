import type { BodyId } from "caelus";

export type AspectStress = "stressful" | "nonstressful";

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface DispositorStep {
	body: string;
	sign: string;
	ruler: string;
}

export const SIGNS = [
	"Aries",
	"Taurus",
	"Gemini",
	"Cancer",
	"Leo",
	"Virgo",
	"Libra",
	"Scorpio",
	"Sagittarius",
	"Capricorn",
	"Aquarius",
	"Pisces",
] as const;

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

export const SIGN_ELEMENTS: Record<string, string> = {
	Aries: "fire",
	Leo: "fire",
	Sagittarius: "fire",
	Taurus: "earth",
	Virgo: "earth",
	Capricorn: "earth",
	Gemini: "air",
	Libra: "air",
	Aquarius: "air",
	Cancer: "water",
	Scorpio: "water",
	Pisces: "water",
};

export const SIGN_MODALITIES: Record<string, string> = {
	Aries: "cardinal",
	Cancer: "cardinal",
	Libra: "cardinal",
	Capricorn: "cardinal",
	Taurus: "fixed",
	Leo: "fixed",
	Scorpio: "fixed",
	Aquarius: "fixed",
	Gemini: "mutable",
	Virgo: "mutable",
	Sagittarius: "mutable",
	Pisces: "mutable",
};

export const PLANETARY_BODIES = new Set([
	"sun",
	"moon",
	"mercury",
	"venus",
	"mars",
	"jupiter",
	"saturn",
	"uranus",
	"neptune",
	"pluto",
]);

export function isPlanet(bodyId: string): boolean {
	return PLANETARY_BODIES.has(bodyId);
}

export const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

export const DEFAULT_BODIES: BodyId[] = [
	"sun",
	"moon",
	"mercury",
	"venus",
	"mars",
	"jupiter",
	"saturn",
	"uranus",
	"neptune",
	"pluto",
	"chiron",
	"true_node",
];

export const MAJOR_ASPECT_DEFS = [
	{ name: "conjunction", target: 0, orb: 8 },
	{ name: "sextile", target: 60, orb: 6 },
	{ name: "square", target: 90, orb: 7 },
	{ name: "trine", target: 120, orb: 8 },
	{ name: "opposition", target: 180, orb: 8 },
] as const;

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
export const SKIPPED_STEPS_ORB = 5;

export function normalizeLongitude(lon: number): number {
	let val = lon % 360;
	if (val < 0) val += 360;
	if (Math.abs(val - 360) < 1e-9 || Math.abs(val) < 1e-9) val = 0;
	return val;
}

export function shiftLongitude(lon: number, nodeLon: number): number {
	return normalizeLongitude(lon - nodeLon);
}

export function angularDistance(lonA: number, lonB: number): number {
	let diff = Math.abs(lonA - lonB);
	if (diff > 180) diff = 360 - diff;
	return diff;
}

export function angularDistanceDirect(lonFrom: number, lonTo: number): number {
	return normalizeLongitude(lonTo - lonFrom);
}

export function signOf(lon: number): string {
	const norm = normalizeLongitude(lon);
	const idx = Math.floor(norm / 30) % 12;
	const sign = SIGNS[idx];
	if (!sign) throw new Error(`unreachable: sign index ${idx} out of range`);
	return sign;
}

export function houseOf(cusps: number[], lon: number): number {
	if (!cusps || cusps.length < 12) return 1;
	const normLon = normalizeLongitude(lon);
	for (let i = 0; i < 12; i++) {
		const curr = cusps[i];
		const next = cusps[(i + 1) % 12];
		if (curr === undefined || next === undefined) continue;
		if (curr < next) {
			if (normLon >= curr && normLon < next) return i + 1;
		} else {
			if (normLon >= curr || normLon < next) return i + 1;
		}
	}
	return 1;
}

export function roundPrecision(val: number, digits = 4): number {
	return Number(val.toFixed(digits));
}

export function projectPoint(
	rawLon: number,
	cusps?: number[],
	digits = 4,
): ProjectedEclipticPoint {
	const norm = normalizeLongitude(rawLon);
	const lon = normalizeLongitude(roundPrecision(norm, digits));
	let signDeg = roundPrecision(norm % 30, digits);
	let sign = signOf(norm);
	if (signDeg >= 30) {
		signDeg = 0;
		sign = signOf((norm + 30) % 360);
	}
	const house = cusps && cusps.length >= 12 ? houseOf(cusps, norm) : 1;
	return { lon, sign, signDeg, house };
}

export function findAspect(
	lonA: number,
	lonB: number,
	aspects: readonly { name: string; target: number; orb: number }[],
): { aspect: string; target: number; orb: number } | undefined {
	const dist = angularDistance(lonA, lonB);
	for (const asp of aspects) {
		const diff = Math.abs(dist - asp.target);
		if (diff <= asp.orb) {
			return {
				aspect: asp.name,
				target: asp.target,
				orb: roundPrecision(diff),
			};
		}
	}
	return undefined;
}

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

export function determineAspectPhase(
	speedA: number,
	lonA: number,
	speedB: number,
	lonB: number,
	target: number,
): "applying" | "separating" | "exact" {
	const relSpeed = speedA - speedB;
	let diff = (lonA - lonB) % 360;
	if (diff < 0) diff += 360;
	if (diff > 180) diff -= 360;

	const dev = Math.abs(diff) - target;
	if (Math.abs(dev) < 1e-6 || Math.abs(relSpeed) < 1e-6) return "exact";

	const rateOfDistanceChange =
		(Math.abs(diff) > target ? 1 : -1) * (diff > 0 ? relSpeed : -relSpeed);
	return rateOfDistanceChange < 0 ? "applying" : "separating";
}

export function eachPair<T>(
	items: readonly T[],
	fn: (a: T, b: T) => void,
): void {
	for (let i = 0; i < items.length; i++) {
		const a = items[i];
		if (!a) continue;
		for (let j = i + 1; j < items.length; j++) {
			const b = items[j];
			if (!b) continue;
			fn(a, b);
		}
	}
}

export function findDeclinationAspect(
	decA: number,
	decB: number,
	maxOrb = 1.2,
): { aspect: "parallel" | "contraparallel"; orb: number } | undefined {
	const isSameHemisphere = (decA >= 0 && decB >= 0) || (decA <= 0 && decB <= 0);

	if (isSameHemisphere) {
		const diff = Math.abs(decA - decB);
		if (diff <= maxOrb) {
			return { aspect: "parallel", orb: roundPrecision(diff, 4) };
		}
	} else {
		const diff = Math.abs(Math.abs(decA) - Math.abs(decB));
		if (diff <= maxOrb) {
			return { aspect: "contraparallel", orb: roundPrecision(diff, 4) };
		}
	}

	return undefined;
}

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

const PHASES: readonly { name: SolLunaPhaseName; max: number }[] = [
	{ name: "New", max: 45 },
	{ name: "Crescent", max: 90 },
	{ name: "First Quarter", max: 135 },
	{ name: "Gibbous", max: 180 },
	{ name: "Full", max: 225 },
	{ name: "Disseminating", max: 270 },
	{ name: "Last Quarter", max: 315 },
	{ name: "Balsamic", max: 360 },
];

export function computeSolLunaPhase(sunLon: number, moonLon: number): string {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];
	return phase ? phase.name : "Balsamic";
}

export function buildDispositorChain(
	bodies: Record<string, { sign: string }>,
	startBodyId: string,
	maxDepth = 5,
): DispositorStep[] {
	const chain: DispositorStep[] = [];
	let currentId = startBodyId;
	const visited = new Set<string>();

	for (let i = 0; i < maxDepth; i++) {
		const body = bodies[currentId];
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
