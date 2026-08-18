import type { HouseSystem } from "caelus";
import { describeEvoCriteria, generateEvoAtoms } from "./classical";
import {
	computeNodalReading,
	computePrenatalEclipses,
	type EclipsesResult,
	type NodeAspect,
	type SkippedStep,
} from "./nodes";
import { computeSolLunaPhase } from "./phases";
import { roundSeparation, roundToon } from "./projection";
import {
	computeSoulReading,
	type DispositorStep,
	type PlutoAspect,
	PPP_DEACTIVATION_ORB,
	type PPPAspect,
} from "./soul";
import type {
	ChartBodiesLite,
	Ephemeris,
	NodeMotionStatus,
	ResolvedBirth,
} from "./types";

// ============================================================================
// Evolutionary reading publication
//
// Single source of the `evo` block output shape (ADR-0010). Aggregates the
// three core evolutionary computators — soul (Pluto/PPP), nodal axis, and
// prenatal eclipses — into the publication `EvoOutput` and its factual atoms.
// Co-located with the computators that feed it so a field rename surfaces at
// one site; the commands layer only forwards inputs. The chart computation
// invariant (pluto + true node always present) makes the assembly total — no
// `undefined` branch (ADR-0014).
// ============================================================================

export interface EvoNodalPoint {
	sign: string;
	lon: number;
	house: number;
	signDeg: number;
	ruler?: string;
	rulerPlacement?: {
		body: string;
		sign: string;
		signDeg: number;
		house: number;
		motion: NodeMotionStatus;
	};
	aspects: NodeAspect[];
}

export interface EvoNodalAxis {
	north: EvoNodalPoint;
	south: EvoNodalPoint;
	motion: NodeMotionStatus;
	skippedSteps: SkippedStep[];
}

export interface EvoOutput {
	pluto: {
		sign: string;
		lon: number;
		house: number;
		signDeg: number;
		retrograde: boolean;
		stressfulCount: number;
		nonstressfulCount: number;
		aspects: PlutoAspect[];
	};
	ppp: {
		sign: string;
		lon: number;
		house: number;
		signDeg: number;
		active: boolean;
		separation?: number;
		reason?: string;
		aspects: PPPAspect[];
	};
	midpoint?: string;
	antiMidpoint?: string;
	nodalAxis: EvoNodalAxis;
	phase?: string;
	dispositorChains: {
		pluto: DispositorStep[];
		southNodeRuler?: DispositorStep[];
		northNodeRuler?: DispositorStep[];
	};
	prenatalEclipses: EclipsesResult;
	counts: {
		plutoAspects: number;
		nodeAspects: number;
		skippedSteps: number;
		eclipses: number;
	};
	method: string;
}

export interface EvolutionaryReading {
	evo: EvoOutput;
	atoms: string[];
}

/**
 * Assembles the evolutionary (`evo`) reading from the three core computators.
 * Total: the chart computation invariant (ADR-0014) guarantees `bodies` carries
 * pluto and the true node, so a missing required input is a programming error
 * and throws defensively — never returns `undefined`.
 */
export function computeEvolutionaryReading(input: {
	bodies: ChartBodiesLite;
	cusps: number[];
	ephemeris: Ephemeris;
	birth: ResolvedBirth;
	houseSystem: HouseSystem;
	topocentric?: boolean;
}): EvolutionaryReading {
	const northNodeLon = input.bodies.true_node?.lon;
	const soul = computeSoulReading(input.bodies, input.cusps, northNodeLon);
	const nodal = computeNodalReading(input.bodies, input.cusps);
	if (!soul || !nodal) {
		throw new Error(
			"evo invariant violated: the chart must carry pluto and the true node (default natal bodies)",
		);
	}

	const north = nodal.northNode;
	const south = nodal.southNode;
	const sun = input.bodies.sun;
	const moon = input.bodies.moon;
	const phase =
		sun && moon ? computeSolLunaPhase(sun.lon, moon.lon).name : undefined;

	// Pluto–North Node separation: republished from core — the same raw
	// measurement the PPP deactivation rule already made, so the published
	// number always matches the rule (same reference: true node, no fallback).
	const plutoNorthNodeSeparation =
		soul.plutoNorthNodeSeparation === undefined
			? undefined
			: roundSeparation(soul.plutoNorthNodeSeparation);

	const eclipses = computePrenatalEclipses(
		input.ephemeris,
		input.birth,
		input.cusps,
		input.houseSystem,
		input.topocentric ?? false,
	);

	// Aggregated once; feeds both `evo.counts` and the atoms input (the
	// shared aggregation base — no recomputation of pluto.aspects.length).
	const counts: EvoOutput["counts"] = {
		plutoAspects: soul.pluto.aspects.length,
		nodeAspects: north.aspects.length + south.aspects.length,
		skippedSteps: nodal.skippedSteps.length,
		eclipses: (eclipses.solar ? 1 : 0) + (eclipses.lunar ? 1 : 0),
	};

	const evo: EvoOutput = {
		pluto: {
			sign: soul.pluto.sign,
			lon: roundToon(soul.pluto.lon),
			signDeg: roundToon(soul.pluto.signDeg),
			house: soul.pluto.house,
			retrograde: soul.pluto.retrograde,
			stressfulCount: soul.pluto.stressfulAspects,
			nonstressfulCount: soul.pluto.nonstressfulAspects,
			aspects: soul.pluto.aspects,
		},
		ppp: {
			sign: soul.ppp.sign,
			lon: roundToon(soul.ppp.lon),
			signDeg: roundToon(soul.ppp.signDeg),
			house: soul.ppp.house,
			active: soul.ppp.active,
			separation: plutoNorthNodeSeparation,
			...(soul.ppp.active
				? {}
				: {
						reason:
							plutoNorthNodeSeparation === undefined
								? `pluto conjunct north node (orb <= ${PPP_DEACTIVATION_ORB}°)`
								: `pluto conjunct north node (separation ${plutoNorthNodeSeparation}° <= ${PPP_DEACTIVATION_ORB}°)`,
					}),
			aspects: soul.ppp.aspects,
		},
		midpoint: soul.plutoNorthNodeMidpoint?.formatted,
		antiMidpoint: soul.plutoNorthNodeAntiMidpoint?.formatted,
		nodalAxis: {
			north: {
				sign: north.sign,
				lon: roundToon(north.lon),
				signDeg: roundToon(north.signDeg),
				house: north.house,
				ruler: north.ruler,
				rulerPlacement: north.rulerPlacement
					? {
							body: north.rulerPlacement.body,
							sign: north.rulerPlacement.sign,
							signDeg: roundToon(north.rulerPlacement.signDeg),
							house: north.rulerPlacement.house,
							motion: north.rulerPlacement.motion,
						}
					: undefined,
				aspects: north.aspects,
			},
			south: {
				sign: south.sign,
				lon: roundToon(south.lon),
				signDeg: roundToon(south.signDeg),
				house: south.house,
				ruler: south.ruler,
				rulerPlacement: south.rulerPlacement
					? {
							body: south.rulerPlacement.body,
							sign: south.rulerPlacement.sign,
							signDeg: roundToon(south.rulerPlacement.signDeg),
							house: south.rulerPlacement.house,
							motion: south.rulerPlacement.motion,
						}
					: undefined,
				aspects: south.aspects,
			},
			motion: nodal.motionStatus,
			skippedSteps: nodal.skippedSteps,
		},
		phase,
		dispositorChains: {
			pluto: soul.dispositorChain,
			southNodeRuler: nodal.dispositorChains.southNodeRuler,
			northNodeRuler: nodal.dispositorChains.northNodeRuler,
		},
		prenatalEclipses: eclipses,
		counts,
		method: describeEvoCriteria(),
	};

	const atoms = generateEvoAtoms({
		plutoAspectCount: counts.plutoAspects,
		plutoStressfulCount: soul.pluto.stressfulAspects,
		plutoNonstressfulCount: soul.pluto.nonstressfulAspects,
		ppp: {
			sign: soul.ppp.sign,
			house: soul.ppp.house,
			active: soul.ppp.active,
		},
		plutoNorthNodeSeparation,
		midpoint: soul.plutoNorthNodeMidpoint
			? {
					sign: soul.plutoNorthNodeMidpoint.sign,
					signDeg: soul.plutoNorthNodeMidpoint.signDeg,
				}
			: undefined,
		antiMidpoint: soul.plutoNorthNodeAntiMidpoint
			? {
					sign: soul.plutoNorthNodeAntiMidpoint.sign,
					signDeg: soul.plutoNorthNodeAntiMidpoint.signDeg,
				}
			: undefined,
		phase,
		northNodeRuler: north.ruler,
		southNodeRuler: south.ruler,
		northNodeAspectCount: north.aspects.length,
		southNodeAspectCount: south.aspects.length,
		nodalMotion: nodal.motionStatus,
		skippedSteps: nodal.skippedSteps,
		eclipses: [
			...(eclipses.solar
				? [
						{
							kind: "solar" as const,
							type: eclipses.solar.type,
							sign: eclipses.solar.sign,
							signDeg: eclipses.solar.signDeg,
						},
					]
				: []),
			...(eclipses.lunar
				? [
						{
							kind: "lunar" as const,
							type: eclipses.lunar.type,
							sign: eclipses.lunar.sign,
							signDeg: eclipses.lunar.signDeg,
						},
					]
				: []),
		],
	});

	return { evo, atoms };
}
