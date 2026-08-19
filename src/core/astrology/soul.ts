export type AspectStress = "stressful" | "nonstressful";

export const PPP_DEACTIVATION_ORB = 3;
export const SKIPPED_STEPS_ORB = 5;

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

export const NON_PLANETARY_IDS = new Set([
	"mean_node",
	"true_node",
	"mean_lilith",
	"true_lilith",
]);

export interface ProjectedEclipticPoint {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

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

export interface SoulPlutoFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	retrograde: boolean;
	stressfulCount: number;
	nonstressfulCount: number;
	aspects: PlutoAspect[];
}

export interface PPPFact {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	active: boolean;
	separation?: number;
	reason?: string;
	aspects: PPPAspect[];
}

export interface SoulOutput {
	pluto: SoulPlutoFact;
	ppp: PPPFact;
	midpoint?: ProjectedEclipticPoint;
	antiMidpoint?: ProjectedEclipticPoint;
	dispositorChain: DispositorStep[];
}

function normalizedSignedDelta(from: number, to: number): number {
	const raw = (to - from) % 360;
	if (raw > 180) return raw - 360;
	if (raw < -180) return raw + 360;
	return raw;
}

function matchClosestPlutoAspect(
	lonA: number,
	lonB: number,
): { def: StressedAspectDef; orb: number } | undefined {
	const dist = angularDistance(lonA, lonB);
	let best: { def: StressedAspectDef; orb: number } | undefined;
	for (const def of PLUTO_ASPECTS) {
		const orb = Math.abs(dist - def.target);
		if (orb <= def.orb && (best === undefined || orb < best.orb)) {
			best = { def, orb };
		}
	}
	return best;
}

function aspectPhase(
	bodySpeed: number,
	bodyLon: number,
	plutoSpeed: number,
	plutoLon: number,
	aspect: StressedAspectDef,
): PlutoAspect["phase"] {
	const candidates = [aspect.target, -aspect.target]
		.map((target) => normalizeLongitude(plutoLon + target))
		.sort((a, b) => {
			const da = Math.abs(normalizedSignedDelta(bodyLon, a));
			const db = Math.abs(normalizedSignedDelta(bodyLon, b));
			return da - db;
		});
	const exact = candidates[0];
	if (exact === undefined) return undefined;
	const delta = normalizedSignedDelta(bodyLon, exact);
	const relativeSpeed = bodySpeed - plutoSpeed;
	if (Math.abs(delta) < 1e-9 || Math.abs(relativeSpeed) < 1e-9) return "exact";
	if ((relativeSpeed > 0 && delta > 0) || (relativeSpeed < 0 && delta < 0)) {
		return "applying";
	}
	return "separating";
}

export function computePlutoAspects(
	bodies: Record<string, { lon: number; speed: number }>,
	pluto: { lon: number; speed: number },
): PlutoAspect[] {
	const aspects: PlutoAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body || bodyId === "pluto" || NON_PLANETARY_IDS.has(bodyId)) continue;
		const match = matchClosestPlutoAspect(body.lon, pluto.lon);
		if (match) {
			aspects.push({
				body: bodyId,
				aspect: match.def.name,
				orb: roundPrecision(match.orb, 4),
				stress: match.def.stress,
				phase: aspectPhase(
					body.speed,
					body.lon,
					pluto.speed,
					pluto.lon,
					match.def,
				),
			});
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
}

export function computePPPAspects(
	bodies: Record<string, { lon: number }>,
	pppLon: number,
): PPPAspect[] {
	const aspects: PPPAspect[] = [];
	for (const [bodyId, body] of Object.entries(bodies)) {
		if (!body || bodyId === "pluto" || NON_PLANETARY_IDS.has(bodyId)) continue;
		const dist = angularDistance(body.lon, pppLon);
		for (const def of PPP_MAJOR_ASPECTS) {
			const orb = Math.abs(dist - def.target);
			if (orb <= def.orb) {
				aspects.push({
					body: bodyId,
					aspect: def.name,
					orb: roundPrecision(orb, 4),
				});
				break;
			}
		}
	}
	return aspects.sort((a, b) => a.orb - b.orb || a.body.localeCompare(b.body));
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

function nearMidpoint(a: number, b: number): number {
	const arc = angularDistanceDirect(a, b);
	if (arc <= 180) return normalizeLongitude(a + arc / 2);
	return normalizeLongitude(a - (360 - arc) / 2);
}

export function computeSoulFact(
	bodies: Record<
		string,
		{ lon: number; sign: string; signDeg: number; house: number; speed: number }
	>,
	cusps: number[],
	northNodeLon?: number,
): SoulOutput {
	const pluto = bodies.pluto;
	if (!pluto) {
		throw new Error("Missing pluto body in chart calculations");
	}

	const aspects = computePlutoAspects(bodies, pluto);
	const stressfulCount = aspects.filter((a) => a.stress === "stressful").length;
	const nonstressfulCount = aspects.filter(
		(a) => a.stress === "nonstressful",
	).length;

	const pppLon = normalizeLongitude(pluto.lon + 180);
	const pppProjected = projectPoint(pppLon, cusps);
	const pppAspects = computePPPAspects(bodies, pppLon);

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
		const near = nearMidpoint(pluto.lon, northNodeLon);
		const far = normalizeLongitude(near + 180);
		midpoint = projectPoint(near, cusps);
		antiMidpoint = projectPoint(far, cusps);
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

export function describeEvoCriteria(): string {
	const orbGroups = new Map<number, string[]>();
	for (const def of PLUTO_ASPECTS) {
		const names = orbGroups.get(def.orb);
		if (names) names.push(def.name);
		else orbGroups.set(def.orb, [def.name]);
	}
	const plutoOrbs = [...orbGroups.entries()]
		.sort(([a], [b]) => b - a)
		.map(([orb, names]) => `${orb}° ${names.join("/")}`)
		.join(", ");

	const firstPppAspect = PPP_MAJOR_ASPECTS[0];
	return `orbs PLUTO_ASPECTS: ${plutoOrbs}; ppp: major aspects only (orb ${firstPppAspect.orb}°); skipped: squares to the nodal axis (orb ${SKIPPED_STEPS_ORB}°); ppp inactive when pluto conjunct the north node (orb ${PPP_DEACTIVATION_ORB}°)`;
}
