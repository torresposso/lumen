import type { BodyId } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart } from "../natal/index";
import { computeSolLunaPhase } from "../natal/phases";
import { matchClosestAspect, type StressedAspectDef } from "../shared/aspects";
import { projectPoint, roundPrecision, signOf } from "../shared/geometry";
import type {
	ProgressedAspect,
	ProgressedBody,
	ProgressedChartOutput,
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

	const natalCusps = natalChart.cusps.map((c) => c.lon);
	const progressedBodies: Record<string, ProgressedBody> = {};

	for (const [bodyId, body] of Object.entries(pChart.bodies)) {
		if (!body) continue;
		const isOob = ephemeris.outOfBounds(bodyId as BodyId, progressedJd);
		const normLon = ((body.lon % 360) + 360) % 360;
		const sign = signOf(normLon);
		const signDeg = roundPrecision(normLon % 30, 4);
		const natalProj = projectPoint(body.lon, natalCusps);

		progressedBodies[bodyId] = {
			name: bodyId,
			lon: roundPrecision(normLon, 4),
			sign,
			signDeg,
			lat: roundPrecision(body.lat, 4),
			dec: roundPrecision(body.dec, 4),
			speed: roundPrecision(body.speed, 6),
			retrograde: body.speed < 0,
			natalHouse: natalProj.house,
			outOfBounds: isOob,
		};
	}

	// Sol-Luna Phase in Progressions (28-year evolutionary cycle)
	const progSun = pChart.bodies.sun;
	const progMoon = pChart.bodies.moon;
	const solLunaPhaseName =
		progSun && progMoon
			? computeSolLunaPhase(progSun.lon, progMoon.lon)
			: "New";
	const angle =
		progSun && progMoon
			? (((progMoon.lon - progSun.lon) % 360) + 360) % 360
			: 0;

	// Natal points dictionary
	const natalPoints: Record<string, { lon: number }> = {};
	for (const [bId, b] of Object.entries(natalChart.bodies)) {
		natalPoints[bId] = { lon: b.lon };
	}
	natalPoints.asc = { lon: natalChart.angles.asc.lon };
	natalPoints.mc = { lon: natalChart.angles.mc.lon };
	natalPoints.pluto = { lon: natalChart.pluto.lon };
	if (natalChart.ppp.active) {
		natalPoints.ppp = { lon: natalChart.ppp.lon };
	}
	if (natalChart.nodalAxis.south) {
		natalPoints.south_node = { lon: natalChart.nodalAxis.south.lon };
	}

	// Aspects from Progressed Planets to Natal Points (max orb 1.0°)
	const aspectsToNatal: ProgressedAspect[] = [];
	for (const [pName, pBody] of Object.entries(progressedBodies)) {
		for (const [nName, nPoint] of Object.entries(natalPoints)) {
			const match = matchClosestAspect(
				pBody.lon,
				nPoint.lon,
				PROGRESSED_ASPECT_DEFS,
			);
			if (match) {
				aspectsToNatal.push({
					progressedBody: pName,
					natalPoint: nName,
					aspect: match.def.name,
					orb: roundPrecision(match.orb, 4),
					maxOrb: match.def.orb,
					isApplying: true,
					stress: match.def.stress,
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
	const skippedSteps = natalChart.nodalAxis.skippedSteps ?? [];
	const skippedStepNames = new Set(
		skippedSteps.map((s) => s.body.toLowerCase()),
	);
	const skippedStepActivations = aspectsToNatal.filter((a) =>
		skippedStepNames.has(a.natalPoint.toLowerCase()),
	);

	return {
		target: {
			dateTime: target.dateTime,
			jdUt: roundPrecision(targetJd, 6),
			ageYears: roundPrecision(ageYears, 2),
			progressedJdUt: roundPrecision(progressedJd, 6),
		},
		natal: {
			id: natalProfile.id,
			name: natalProfile.name,
			birthPlace: natalProfile.birthPlace,
			birthDateTime: natalProfile.birthDateTime,
			birthLat: roundPrecision(natalProfile.birthLat, 4),
			birthLon: roundPrecision(natalProfile.birthLon, 4),
			birthJdUt: roundPrecision(natalProfile.birthJdUt, 6),
		},
		zodiac: "tropical",
		solLunaPhase: {
			phase: solLunaPhaseName,
			angle: roundPrecision(angle, 2),
			description: `28-year secondary progression Sol-Luna cycle (${solLunaPhaseName} phase)`,
		},
		progressedBodies,
		aspectsToNatal,
		evolutionaryTriggers: {
			plutoContacts,
			pppContacts,
			nodalContacts,
			skippedStepActivations,
		},
		method:
			"JWGEA Secondary Progressions (Day-for-a-Year, Tropical year 365.24219d, 1° max orbs)",
	};
}
