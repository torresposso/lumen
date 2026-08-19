import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris";
import { computePrenatalEclipses } from "./astrology/eclipses";
import { computeNodalAxisFact } from "./astrology/nodes";
import { computeSignature, detectAspectPatterns } from "./astrology/patterns";
import { computeSolLunaPhase } from "./astrology/phases";
import {
	computeAspects,
	computeDeclinationAspects,
	computeHouseRulers,
	computeRawChart,
	projectAngles,
	projectBodies,
	projectCusps,
} from "./astrology/positions";
import {
	computeSoulFact,
	describeEvoCriteria,
	roundPrecision,
} from "./astrology/soul";
import type { Profile } from "./model";

export interface NatalChartOutput {
	birth: {
		id: string;
		name: string | null;
		birthPlace: string;
		birthDateTime: string;
		birthLat: number;
		birthLon: number;
		birthJdUt: number;
	};
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

export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris = new CaelusEphemeris(),
): NatalChartOutput {
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
	const houseRulers = computeHouseRulers(cusps);

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
		birth: {
			id: profile.id,
			name: profile.name,
			birthPlace: profile.birthPlace,
			birthDateTime: profile.birthDateTime,
			birthLat: roundPrecision(profile.birthLat, 4),
			birthLon: roundPrecision(profile.birthLon, 4),
			birthJdUt: roundPrecision(profile.birthJdUt, 6),
		},
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies,
		angles,
		cusps,
		aspects,
		...(declinationAspects.length > 0 ? { declinationAspects } : {}),
		pluto: soul.pluto,
		ppp: soul.ppp,
		...(soul.midpoint ? { midpoint: soul.midpoint } : {}),
		...(soul.antiMidpoint ? { antiMidpoint: soul.antiMidpoint } : {}),
		nodalAxis: nodal.nodalAxis,
		...(phase ? { phase } : {}),
		dispositorChains: {
			pluto: soul.dispositorChain,
			...(nodal.dispositorChains.southNodeRuler
				? { southNodeRuler: nodal.dispositorChains.southNodeRuler }
				: {}),
			...(nodal.dispositorChains.northNodeRuler
				? { northNodeRuler: nodal.dispositorChains.northNodeRuler }
				: {}),
		},
		prenatalEclipses,
		patterns,
		signature,
		houseRulers,
		counts,
		method: describeEvoCriteria(),
	};
}
