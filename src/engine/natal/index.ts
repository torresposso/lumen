import type { BodyId, Chart, Position } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import { toonProfile } from "../../domain/toon";
import { projectPoint, roundPrecision } from "../shared/geometry";
import { SIGN_RULERS } from "../shared/rulers";
import { computePrenatalEclipses } from "./eclipses";
import { computeNodalAxisFact } from "./nodal";
import {
	calculateAstrologicalSignature,
	detectAspectPatterns,
} from "./patterns";
import { getSolLunaPhaseDetails } from "./phases";
import { computePlutoPolarityFact } from "./pluto-polarity";
import { computeSoulLots } from "./soul-lots";
import type {
	AngleProjection,
	AspectProjection,
	ChartBodyProjection,
	CuspProjection,
	DeclinationAspectProjection,
	EclipticGeometryProjection,
	NatalChartOutput,
	NatalInterpretationOutput,
} from "./types";

export {
	computeSolLunaPhase,
	getSolLunaPhaseDetails,
	type SolLunaPhaseName,
	type SolLunaPhaseOutput,
} from "./phases";
export { computeSoulLots } from "./soul-lots";
export type {
	NatalChartOutput,
	NatalInterpretationOutput,
	SoulLotsProjection,
} from "./types";

const DEFAULT_BODIES: BodyId[] = [
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
	"true_lilith",
];

function projectBodies(
	rawBodies: Chart["bodies"],
	cusps: number[],
	jdUt?: number,
	ephemeris?: Ephemeris,
): Record<string, ChartBodyProjection> {
	const result: Record<string, ChartBodyProjection> = {};

	for (const [id, body] of Object.entries(rawBodies)) {
		if (
			!body ||
			id === "true_node" ||
			id === "true_lilith" ||
			id === "mean_node"
		)
			continue;
		const point = projectPoint(body.lon, cusps, 4);
		const oob =
			ephemeris && jdUt !== undefined
				? ephemeris.outOfBounds(id as BodyId, jdUt)
				: Math.abs(body.dec) > 23.44;
		result[id] = {
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			dec: roundPrecision(body.dec, 4),
			outOfBounds: oob,
			dignities: body.dignities ?? [],
		};
	}

	return result;
}

function angleLon(val: number | { lon: number }): number {
	return typeof val === "number" ? val : val.lon;
}

function projectAngles(angles: Chart["angles"]): {
	asc: AngleProjection;
	mc: AngleProjection;
	vertex: AngleProjection;
	eastPoint: AngleProjection;
} {
	const project = (val: number | { lon: number }): AngleProjection => {
		const pt = projectPoint(angleLon(val));
		return { sign: pt.sign, signDeg: pt.signDeg };
	};

	return {
		asc: project(angles.asc),
		mc: project(angles.mc),
		vertex: project(angles.vertex),
		eastPoint: project(angles.eastPoint),
	};
}

function projectCusps(rawCusps: number[]): CuspProjection[] {
	return rawCusps.map((cuspLon, idx) => {
		const pt = projectPoint(cuspLon);
		return {
			house: idx + 1,
			sign: pt.sign,
			signDeg: pt.signDeg,
			ruler: SIGN_RULERS[pt.sign] ?? "unknown",
		};
	});
}

function computeAspects(
	rawBodies: Chart["bodies"],
	ephemeris: Ephemeris,
): AspectProjection[] {
	const bodyMap: Record<string, Position> = {};
	for (const [id, body] of Object.entries(rawBodies)) {
		if (body && id !== "mean_node") {
			bodyMap[id] = body;
		}
	}

	const orbs: Record<string, number> = {
		conjunction: 8,
		sextile: 6,
		square: 7,
		trine: 8,
		opposition: 8,
	};

	const aspects = ephemeris.aspects(bodyMap, orbs);
	return aspects.map((a) => {
		const isStressful =
			a.aspect === "conjunction" ||
			a.aspect === "square" ||
			a.aspect === "opposition" ||
			a.aspect === "semisquare" ||
			a.aspect === "sesquiquadrate" ||
			a.aspect === "quincunx";
		return {
			a: a.a,
			b: a.b,
			aspect: a.aspect,
			orb: roundPrecision(a.orb, 2),
			phase: a.phase,
			strength: roundPrecision(a.strength, 3),
			stress: isStressful ? "stressful" : "nonstressful",
		};
	});
}

export function projectEclipticGeometry(
	rawChart: Chart,
	ephemeris: Ephemeris,
): EclipticGeometryProjection {
	const cusps = projectCusps(rawChart.cusps);
	const bodies = projectBodies(
		rawChart.bodies,
		rawChart.cusps,
		rawChart.jdUt,
		ephemeris,
	);
	const angles = projectAngles(rawChart.angles);
	const aspects = computeAspects(rawChart.bodies, ephemeris);

	let declinationAspects: DeclinationAspectProjection[] = [];
	if (ephemeris) {
		const activeBodies = Object.keys(rawChart.bodies).filter(
			(id) => rawChart.bodies[id] !== undefined,
		);
		const declPairs = ephemeris.declinationAspects(
			activeBodies,
			rawChart.jdUt,
			1.2,
		);
		declinationAspects = declPairs
			.filter((p) => p.kind !== null)
			.map((p) => {
				const decA = rawChart.bodies[p.a]?.dec ?? 0;
				const decB = rawChart.bodies[p.b]?.dec ?? 0;
				const orb =
					p.kind === "parallel"
						? Math.abs(decA - decB)
						: Math.abs(Math.abs(decA) - Math.abs(decB));
				return {
					a: p.a,
					b: p.b,
					aspect: p.kind as string,
					orb: roundPrecision(orb, 4),
				};
			});
	}

	const sun = rawChart.bodies.sun;
	const moon = rawChart.bodies.moon;
	const phase =
		sun && moon ? getSolLunaPhaseDetails(sun.lon, moon.lon) : undefined;

	return {
		bodies,
		angles,
		cusps,
		aspects,
		declinationAspects,
		phase,
	};
}

function computeRawChart(
	jdUt: number,
	lat: number,
	lon: number,
	ephemeris: Ephemeris,
): Chart {
	const raw = ephemeris.chartAt(jdUt, lat, lon, {
		houseSystem: "porphyry",
		zodiac: "tropical",
		bodies: DEFAULT_BODIES,
		topocentric: true,
	});

	const bodies = Object.fromEntries(
		Object.entries(raw.bodies).filter(([id]) => id !== "mean_node"),
	) as Chart["bodies"];

	if (!bodies.pluto || !bodies.true_node) {
		throw new Error(
			"Ephemeris calculation failed: natal chart must carry pluto and true_node",
		);
	}

	return { ...raw, bodies };
}

function computeMeasurements(profile: Profile, ephemeris: Ephemeris) {
	const rawChart = computeRawChart(
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		ephemeris,
	);

	const geom = projectEclipticGeometry(rawChart, ephemeris);

	return {
		rawChart,
		...geom,
	};
}

function synthesizeEvolutionaryCanon(
	profile: Profile,
	measurements: ReturnType<typeof computeMeasurements>,
	ephemeris: Ephemeris,
) {
	const { rawChart } = measurements;
	const cuspLons = rawChart.cusps;
	const northNodeLon = rawChart.bodies.true_node?.lon;

	// Build full bodies record for internal soul/nodal evaluations
	const allBodies: Record<
		string,
		{
			lon: number;
			sign: string;
			signDeg: number;
			house: number;
			speed: number;
			dec?: number;
		}
	> = {};
	for (const [id, b] of Object.entries(rawChart.bodies)) {
		if (!b) continue;
		const pt = projectPoint(b.lon, cuspLons);
		allBodies[id] = {
			lon: b.lon,
			sign: pt.sign,
			signDeg: pt.signDeg,
			house: pt.house,
			speed: b.speed,
			dec: b.dec,
		};
	}

	const soul = computePlutoPolarityFact(allBodies, cuspLons, northNodeLon);
	const nodal = computeNodalAxisFact(allBodies, cuspLons);
	const prenatalEclipses = computePrenatalEclipses(
		ephemeris,
		profile.birthJdUt,
		profile.birthLat,
		profile.birthLon,
		cuspLons,
	);
	const lots = computeSoulLots(rawChart, cuspLons);
	const patterns = detectAspectPatterns(rawChart);
	const signature = calculateAstrologicalSignature(rawChart);

	const lilithRaw = rawChart.bodies.true_lilith;
	const lilithPt = lilithRaw
		? projectPoint(lilithRaw.lon, cuspLons)
		: { sign: "unknown", signDeg: 0, house: 1 };
	const lilithOob =
		ephemeris && profile.birthJdUt !== undefined
			? ephemeris.outOfBounds("true_lilith" as BodyId, profile.birthJdUt)
			: Math.abs(lilithRaw?.dec ?? 0) > 23.44;

	const trueLilith = {
		sign: lilithPt.sign,
		signDeg: roundPrecision(lilithPt.signDeg, 4),
		house: lilithPt.house,
		speed: roundPrecision(lilithRaw?.speed ?? 0, 6),
		dec: roundPrecision(lilithRaw?.dec ?? 0, 4),
		outOfBounds: lilithOob,
	};

	return {
		ppp: soul.ppp,
		plutoNorthNodeMidpoint: {
			near: soul.midpoint ?? projectPoint(0),
			anti: soul.antiMidpoint ?? projectPoint(180),
		},
		nodalAxis: nodal.nodalAxis,
		skippedSteps: nodal.skippedSteps,
		dispositorChains: {
			pluto: soul.dispositorChain,
			southNodeRuler: nodal.dispositorChains.southNodeRuler,
			northNodeRuler: nodal.dispositorChains.northNodeRuler,
		},
		prenatalEclipses,
		trueLilith,
		soulLots: lots,
		patterns,
		signature,
	};
}

/**
 * Computes exact natal chart geometry and evolutionary mechanics as a pure function
 * over a stored Profile (ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0015).
 */
export function computeNatalChart(
	profile: Profile,
	ephemeris: Ephemeris,
): NatalChartOutput {
	const measurements = computeMeasurements(profile, ephemeris);
	const evo = synthesizeEvolutionaryCanon(profile, measurements, ephemeris);

	return {
		birth: toonProfile(profile),
		meta: {
			houseSystem: "porphyry",
			zodiac: "tropical",
			ephemeris: "caelus: 0.24.1",
			solLunaPhase: measurements.phase ?? {
				name: "Balsamic",
				number: 8,
				angle: 0,
				isWaxing: false,
			},
		},
		bodies: measurements.bodies,
		angles: measurements.angles,
		cusps: measurements.cusps,
		aspects: measurements.aspects,
		...(measurements.declinationAspects.length > 0
			? { declinationAspects: measurements.declinationAspects }
			: {}),
		patterns: evo.patterns,
		signature: evo.signature,
		evolutionary: {
			ppp: evo.ppp,
			plutoNorthNodeMidpoint: evo.plutoNorthNodeMidpoint,
			nodalAxis: evo.nodalAxis,
			skippedSteps: evo.skippedSteps,
			dispositorChains: evo.dispositorChains,
			prenatalEclipses: evo.prenatalEclipses,
			trueLilith: evo.trueLilith,
			soulLots: evo.soulLots,
		},
	};
}

/**
 * Extracts the evolutionary karmic root and core interpretative blocks from a computed natal chart.
 */
export function extractNatalInterpretation(
	chart: NatalChartOutput,
): NatalInterpretationOutput {
	const pluto = chart.bodies.pluto;
	const ppp = chart.evolutionary.ppp;
	const north = chart.evolutionary.nodalAxis.north;
	const south = chart.evolutionary.nodalAxis.south;

	// Nodal rulers locations
	const northRuler = north.ruler ?? "unknown";
	const southRuler = south.ruler ?? "unknown";
	const northRulerBody = chart.bodies[northRuler];
	const southRulerBody = chart.bodies[southRuler];

	const northRulerLocation = {
		sign: northRulerBody?.sign ?? north.rulerPlacement?.sign ?? "unknown",
		house: northRulerBody?.house ?? north.rulerPlacement?.house ?? 1,
	};
	const southRulerLocation = {
		sign: southRulerBody?.sign ?? south.rulerPlacement?.sign ?? "unknown",
		house: southRulerBody?.house ?? south.rulerPlacement?.house ?? 1,
	};

	// Skipped steps
	const skippedSteps = chart.evolutionary.skippedSteps.map((step) => {
		const stepBody = chart.bodies[step.body];
		return {
			planet: step.body,
			sign: stepBody?.sign ?? "unknown",
			house: stepBody?.house ?? 1,
			squareToNode: "both" as const,
			resolutionNode: step.resolutionNode,
		};
	});

	// Dispositor dynamics
	const finalDispositors: string[] = [];
	const dominantLoop: string[] = [];
	for (const chain of Object.values(chart.evolutionary.dispositorChains)) {
		if (!chain) continue;
		if (chain.terminalType === "final_dispositor") {
			for (const b of chain.terminalBodies) {
				if (!finalDispositors.includes(b)) {
					finalDispositors.push(b);
				}
			}
		} else if (
			chain.terminalType === "loop" ||
			chain.terminalType === "mutual_reception"
		) {
			for (const b of chain.terminalBodies) {
				if (!dominantLoop.includes(b)) {
					dominantLoop.push(b);
				}
			}
		}
	}

	// Prenatal eclipses
	const prenatalEclipses = {
		solar: {
			sign: chart.evolutionary.prenatalEclipses.solar?.sign ?? "unknown",
			house: chart.evolutionary.prenatalEclipses.solar?.house ?? 1,
			formatted: `${chart.evolutionary.prenatalEclipses.solar?.signDeg ?? 0}° ${chart.evolutionary.prenatalEclipses.solar?.sign ?? ""}`,
		},
		lunar: {
			sign: chart.evolutionary.prenatalEclipses.lunar?.sign ?? "unknown",
			house: chart.evolutionary.prenatalEclipses.lunar?.house ?? 1,
			formatted: `${chart.evolutionary.prenatalEclipses.lunar?.signDeg ?? 0}° ${chart.evolutionary.prenatalEclipses.lunar?.sign ?? ""}`,
		},
	};

	// Soul lots
	const soulLots = {
		lotOfFortune: {
			sign: chart.evolutionary.soulLots.fortune.sign,
			house: chart.evolutionary.soulLots.fortune.house,
			formatted: `${chart.evolutionary.soulLots.fortune.signDeg}° ${chart.evolutionary.soulLots.fortune.sign}`,
		},
		lotOfSpirit: {
			sign: chart.evolutionary.soulLots.spirit.sign,
			house: chart.evolutionary.soulLots.spirit.house,
			formatted: `${chart.evolutionary.soulLots.spirit.signDeg}° ${chart.evolutionary.soulLots.spirit.sign}`,
		},
	};

	return {
		natalInterpretation: {
			profile: chart.birth,
			karmicRoot: {
				pluto: {
					sign: pluto?.sign ?? "unknown",
					house: pluto?.house ?? 1,
					degree: pluto?.signDeg ?? 0,
					isRetrograde: pluto?.retrograde ?? false,
					polarityPoint: {
						sign: ppp.sign,
						house: ppp.house,
						degree: ppp.signDeg,
					},
				},
				nodalAxis: {
					northNode: {
						sign: north.sign,
						house: north.house,
						ruler: northRuler,
						rulerLocation: northRulerLocation,
					},
					southNode: {
						sign: south.sign,
						house: south.house,
						ruler: southRuler,
						rulerLocation: southRulerLocation,
					},
				},
				skippedSteps,
				dispositorDynamics: {
					dominantLoop,
					finalDispositors,
				},
				prenatalEclipses,
				soulLots,
			},
		},
	};
}
