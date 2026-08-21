import { aspectPhase, type BodyId } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import { toonProfile } from "../../domain/toon";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart } from "../natal/index";
import { getSolLunaPhaseDetails } from "../natal/phases";
import { matchClosestAspect, type StressedAspectDef } from "../shared/aspects";
import {
	lonFromSignDeg,
	projectPoint,
	roundPrecision,
	signOf,
} from "../shared/geometry";
import { extractNatalPoints } from "../shared/natal-points";
import type {
	ProgressedAspect,
	ProgressedBody,
	ProgressedChartOutput,
	ProgressedSkippedStepActivation,
	ProgressionsInterpretationOutput,
} from "./types";

export type {
	ProgressedChartOutput,
	ProgressionsInterpretationOutput,
} from "./types";

export const TROPICAL_YEAR = 365.24219;

export const PROGRESSED_ASPECT_DEFS: readonly StressedAspectDef[] = [
	{ name: "conjunction", target: 0, orb: 1.0, stress: "stressful" },
	{ name: "semisextile", target: 30, orb: 0.5, stress: "nonstressful" },
	{ name: "semisquare", target: 45, orb: 0.5, stress: "stressful" },
	{ name: "sextile", target: 60, orb: 1.0, stress: "nonstressful" },
	{ name: "square", target: 90, orb: 1.0, stress: "stressful" },
	{ name: "trine", target: 120, orb: 1.0, stress: "nonstressful" },
	{ name: "sesquiquadrate", target: 135, orb: 0.5, stress: "stressful" },
	{ name: "quincunx", target: 150, orb: 0.5, stress: "stressful" },
	{ name: "opposition", target: 180, orb: 1.0, stress: "stressful" },
];

export function computeProgressedChart(
	natalProfile: Profile,
	target: TransitTargetInput,
	ephemeris: Ephemeris,
): ProgressedChartOutput {
	const natalChart = computeNatalChart(natalProfile, ephemeris);
	const natalJd = natalProfile.birthJdUt;
	const targetJd = target.jdUt;
	const ageYears = (targetJd - natalJd) / TROPICAL_YEAR;
	const progressedJd = natalJd + ageYears;

	// Progressed chart evaluated at natal coordinates with progressed JD
	const pChart = ephemeris.chartAt(
		progressedJd,
		natalProfile.birthLat,
		natalProfile.birthLon,
	);

	const natalCusps = natalChart.cusps.map((c) =>
		lonFromSignDeg(c.sign, c.signDeg),
	);
	const progressedBodies: Record<string, ProgressedBody> = {};
	const progressedBodiesForAspects: Record<
		string,
		{ lon: number; speed: number; natalHouse: number }
	> = {};

	for (const [bodyId, body] of Object.entries(pChart.bodies)) {
		if (!body || bodyId === "mean_node") continue;
		const isOob = ephemeris.outOfBounds(bodyId as BodyId, progressedJd);
		const normLon = ((body.lon % 360) + 360) % 360;
		const sign = signOf(normLon);
		const signDeg = roundPrecision(normLon % 30, 4);
		const natalProj = projectPoint(body.lon, natalCusps);

		progressedBodies[bodyId] = {
			sign,
			signDeg,
			natalHouse: natalProj.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			dec: roundPrecision(body.dec, 4),
			outOfBounds: isOob,
		};

		progressedBodiesForAspects[bodyId] = {
			lon: body.lon,
			speed: body.speed,
			natalHouse: natalProj.house,
		};
	}

	// Sol-Luna Phase in Progressions (28-year evolutionary cycle)
	const progSun = pChart.bodies.sun;
	const progMoon = pChart.bodies.moon;
	const solLunaPhase =
		progSun && progMoon
			? getSolLunaPhaseDetails(progSun.lon, progMoon.lon)
			: {
					name: "New" as const,
					number: 1,
					angle: 0,
					isWaxing: true,
				};

	// Natal points dictionary via shared helper
	const natalPoints = extractNatalPoints(natalChart);

	// Aspects from Progressed Planets to Natal Points (max orb 1.0°)
	const aspectsToNatal: ProgressedAspect[] = [];
	for (const [pName, pBody] of Object.entries(progressedBodiesForAspects)) {
		for (const [nName, nPoint] of Object.entries(natalPoints)) {
			const match = matchClosestAspect(
				pBody.lon,
				nPoint.lon,
				PROGRESSED_ASPECT_DEFS,
			);
			if (match) {
				const phase = aspectPhase(
					pBody.lon,
					pBody.speed,
					nPoint.lon,
					nPoint.speed ?? 0,
					match.def.target,
				);
				aspectsToNatal.push({
					progressedBody: pName,
					natalPoint: nName,
					aspect: match.def.name,
					orb: roundPrecision(match.orb, 4),
					isApplying: phase === "applying",
					stress: match.def.stress,
					progressedNatalHouse: pBody.natalHouse,
				});
			}
		}
	}
	aspectsToNatal.sort(
		(a, b) => a.orb - b.orb || a.progressedBody.localeCompare(b.progressedBody),
	);

	// Evolutionary triggers
	const plutoContacts = aspectsToNatal.filter(
		(a) => a.natalPoint.toLowerCase() === "pluto",
	);
	const pppContacts = aspectsToNatal.filter(
		(a) => a.natalPoint.toLowerCase() === "ppp",
	);
	const nodalContacts = aspectsToNatal.filter(
		(a) =>
			a.natalPoint.toLowerCase() === "true_node" ||
			a.natalPoint.toLowerCase() === "south_node",
	);

	const skippedSteps = natalChart.evolutionary?.skippedSteps ?? [];
	const skippedStepsMap = new Map(
		skippedSteps.map((s) => [s.body.toLowerCase(), s.resolutionNode]),
	);

	const skippedStepActivations: ProgressedSkippedStepActivation[] = [];
	for (const aspect of aspectsToNatal) {
		const targetLower = aspect.natalPoint.toLowerCase();
		if (skippedStepsMap.has(targetLower)) {
			skippedStepActivations.push({
				...aspect,
				skippedStepBody: targetLower,
				resolutionNode: skippedStepsMap.get(targetLower) ?? "north",
			});
		}
	}

	return {
		target: {
			dateTime: target.dateTime,
			jdUt: roundPrecision(targetJd, 6),
			ageYears: roundPrecision(ageYears, 2),
			progressedJdUt: roundPrecision(progressedJd, 6),
		},
		birth: toonProfile(natalProfile),
		meta: {
			zodiac: "tropical",
			ephemeris: "caelus: 0.24.1",
			solLunaPhase,
		},
		progressedBodies,
		aspectsToNatal,
		evolutionaryTriggers: {
			plutoContacts,
			pppContacts,
			nodalContacts,
			skippedStepActivations,
		},
	};
}

/**
 * Extracts the 28-year Sol-Luna evolutionary season, archetype phase, and progressed triggers.
 */
export function extractProgressionsInterpretation(
	progressions: ProgressedChartOutput,
): ProgressionsInterpretationOutput {
	const progSun = progressions.progressedBodies.sun;
	const progMoon = progressions.progressedBodies.moon;

	const phaseDetails = progressions.meta.solLunaPhase;

	const progressedSun = {
		sign: progSun?.sign ?? "unknown",
		house: progSun?.natalHouse ?? 1,
		degree: progSun?.signDeg ?? 0,
	};

	const progressedMoon = {
		sign: progMoon?.sign ?? "unknown",
		house: progMoon?.natalHouse ?? 1,
		degree: progMoon?.signDeg ?? 0,
	};

	const progressedTriggers = progressions.aspectsToNatal.map((asp) => ({
		progressedBody: asp.progressedBody,
		natalPoint: asp.natalPoint,
		aspect: asp.aspect,
		orb: asp.orb,
	}));

	return {
		progressionsInterpretation: {
			target: {
				dateTime: progressions.target.dateTime,
				jdUt: progressions.target.jdUt,
				ageYears: progressions.target.ageYears,
				progressedJdUt: progressions.target.progressedJdUt,
			},
			natal: progressions.birth,
			solLunaPhase: {
				phaseNumber: phaseDetails.number,
				phaseName: phaseDetails.name,
				archetype: phaseDetails.name,
				sunMoonAngle: phaseDetails.angle,
				isWaxing: phaseDetails.isWaxing,
				description: `28-year progressed Sol-Luna ${phaseDetails.name} Phase`,
			},
			progressedSun,
			progressedMoon,
			progressedTriggers,
		},
	};
}
