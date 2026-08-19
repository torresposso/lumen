import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris";
import { computePrenatalEclipses } from "./astrology/eclipses";
import { computeSolLunaPhase } from "./astrology/geometry";
import { computeNodalAxisFact } from "./astrology/nodes";
import { computeSignature, detectAspectPatterns } from "./astrology/patterns";
import {
	computeAspects,
	computeDeclinationAspects,
	computeHouseRulers,
	computeRawChart,
	projectAngles,
	projectBodies,
	projectCusps,
} from "./astrology/positions";
import { computeSoulFact, describeEvoCriteria } from "./astrology/soul";
import type { Profile } from "./model";
import { type ToonProfile, toonProfile } from "./toon";

export interface NatalChartOutput {
	birth: ToonProfile;
	houseSystem: "porphyry";
	zodiac: "tropical";
	bodies: ReturnType<typeof projectBodies>;
	angles: ReturnType<typeof projectAngles>;
	cusps: ReturnType<typeof projectCusps>;
	aspects: ReturnType<typeof computeAspects>;
	declinationAspects?: ReturnType<typeof computeDeclinationAspects>;
	pluto: ReturnType<typeof computeSoulFact>["pluto"];
	ppp: ReturnType<typeof computeSoulFact>["ppp"];
	midpoint?: ReturnType<typeof computeSoulFact>["midpoint"];
	antiMidpoint?: ReturnType<typeof computeSoulFact>["antiMidpoint"];
	nodalAxis: ReturnType<typeof computeNodalAxisFact>["nodalAxis"];
	phase?: string;
	dispositorChains: {
		pluto: ReturnType<typeof computeSoulFact>["dispositorChain"];
		southNodeRuler?: ReturnType<
			typeof computeNodalAxisFact
		>["dispositorChains"]["southNodeRuler"];
		northNodeRuler?: ReturnType<
			typeof computeNodalAxisFact
		>["dispositorChains"]["northNodeRuler"];
	};
	prenatalEclipses: ReturnType<typeof computePrenatalEclipses>;
	patterns: ReturnType<typeof detectAspectPatterns>;
	signature: ReturnType<typeof computeSignature>;
	houseRulers: ReturnType<typeof computeHouseRulers>;
	counts: {
		plutoAspects: number;
		nodeAspects: number;
		skippedSteps: number;
		eclipses: number;
	};
	method: string;
}

/** Stage 1: Geometric measurements and ecliptic projections. */
function computeMeasurements(profile: Profile, ephemeris: Ephemeris) {
	const rawChart = computeRawChart(
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		ephemeris,
	);

	const bodies = projectBodies(rawChart.bodies, rawChart.cusps);
	const angles = projectAngles(rawChart.angles);
	const cusps = projectCusps(rawChart.cusps);
	const aspects = computeAspects(rawChart.bodies);
	const declinationAspects = computeDeclinationAspects(rawChart.bodies);
	const houseRulers = computeHouseRulers(cusps);

	return {
		rawChart,
		bodies,
		angles,
		cusps,
		aspects,
		declinationAspects,
		houseRulers,
	};
}

/** Stage 2: Evolutionary mechanics (JWGEA canon). */
function computeEvolutionaryMechanics(
	profile: Profile,
	measurements: ReturnType<typeof computeMeasurements>,
	ephemeris: Ephemeris,
) {
	const { rawChart, bodies } = measurements;
	const northNodeLon = rawChart.bodies.true_node?.lon;
	const soul = computeSoulFact(bodies, rawChart.cusps, northNodeLon);
	const nodal = computeNodalAxisFact(bodies, rawChart.cusps);

	const sun = bodies.sun;
	const moon = bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon) : undefined;

	const prenatalEclipses = computePrenatalEclipses(
		ephemeris,
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		rawChart.cusps,
	);

	const patterns = detectAspectPatterns(bodies);
	const signature = computeSignature(bodies);

	const eclipseCount =
		(prenatalEclipses.solar ? 1 : 0) + (prenatalEclipses.lunar ? 1 : 0);
	const nodeAspectCount =
		nodal.nodalAxis.north.aspects.length + nodal.nodalAxis.south.aspects.length;

	const counts = {
		plutoAspects: soul.pluto.aspects.length,
		nodeAspects: nodeAspectCount,
		skippedSteps: nodal.nodalAxis.skippedSteps.length,
		eclipses: eclipseCount,
	};

	return {
		soul,
		nodal,
		phase,
		prenatalEclipses,
		patterns,
		signature,
		counts,
	};
}

/**
 * Computes exact natal chart geometry and evolutionary mechanics as a pure function
 * over a stored Profile (ADR-0008).
 */
export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): NatalChartOutput {
	const measurements = computeMeasurements(profile, ephemeris);
	const evo = computeEvolutionaryMechanics(profile, measurements, ephemeris);

	return {
		birth: toonProfile(profile),
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: measurements.bodies,
		angles: measurements.angles,
		cusps: measurements.cusps,
		aspects: measurements.aspects,
		...(measurements.declinationAspects.length > 0
			? { declinationAspects: measurements.declinationAspects }
			: {}),
		pluto: evo.soul.pluto,
		ppp: evo.soul.ppp,
		...(evo.soul.midpoint ? { midpoint: evo.soul.midpoint } : {}),
		...(evo.soul.antiMidpoint ? { antiMidpoint: evo.soul.antiMidpoint } : {}),
		nodalAxis: evo.nodal.nodalAxis,
		...(evo.phase ? { phase: evo.phase } : {}),
		dispositorChains: {
			pluto: evo.soul.dispositorChain,
			...(evo.nodal.dispositorChains.southNodeRuler
				? { southNodeRuler: evo.nodal.dispositorChains.southNodeRuler }
				: {}),
			...(evo.nodal.dispositorChains.northNodeRuler
				? { northNodeRuler: evo.nodal.dispositorChains.northNodeRuler }
				: {}),
		},
		prenatalEclipses: evo.prenatalEclipses,
		patterns: evo.patterns,
		signature: evo.signature,
		houseRulers: measurements.houseRulers,
		counts: evo.counts,
		method: describeEvoCriteria(),
	};
}
