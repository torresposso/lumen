import {
	type AspectStress,
	angularDistance,
	buildDispositorChain,
	type DispositorStep,
	determineAspectPhase,
	matchClosestAspect,
	NON_PLANETARY_IDS,
	normalizeLongitude,
	PLUTO_ASPECTS,
	PPP_DEACTIVATION_ORB,
	PPP_MAJOR_ASPECTS,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	type StressedAspectDef,
} from "./geometry";

export {
	angularDistance,
	angularDistanceDirect,
	buildDispositorChain,
	findAspect,
	findDeclinationAspect,
	houseOf,
	MAJOR_ASPECT_DEFS,
	NON_PLANETARY_IDS,
	normalizeLongitude,
	PLUTO_ASPECTS,
	PPP_DEACTIVATION_ORB,
	PPP_MAJOR_ASPECTS,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
	SIGNS,
	SKIPPED_STEPS_ORB,
} from "./geometry";
// Re-export geometry types & constants that form part of the astrology contract
export type {
	AspectStress,
	DispositorStep,
	ProjectedEclipticPoint,
	StressedAspectDef,
};

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

function matchClosestPlutoAspect(
	lonA: number,
	lonB: number,
): { def: StressedAspectDef; orb: number } | undefined {
	return matchClosestAspect(lonA, lonB, PLUTO_ASPECTS);
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
				phase: determineAspectPhase(
					body.speed,
					body.lon,
					pluto.speed,
					pluto.lon,
					match.def.target,
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

function nearMidpoint(a: number, b: number): number {
	const arc = (((b - a) % 360) + 360) % 360;
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
	return `orbs PLUTO_ASPECTS: ${plutoOrbs}; ppp: major aspects only (orb ${firstPppAspect.orb}°); skipped: squares to the nodal axis (orb ${PPP_DEACTIVATION_ORB + 2}°); ppp inactive when pluto conjunct the north node (orb ${PPP_DEACTIVATION_ORB}°)`;
}
