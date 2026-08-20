import type { BodyId } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart } from "../natal/index";
import type { AngleProjection, CuspProjection } from "../natal/types";

import { projectPoint, roundPrecision, signOf } from "../shared/geometry";
import { extractNatalPoints } from "../shared/natal-points";
import { computeTransitAspects } from "./aspects";
import { computeEvolutionaryTriggers } from "./triggers";
import type {
	TransitBody,
	TransitChartOutput,
	TransitsInterpretationOutput,
} from "./types";

export type { TransitChartOutput, TransitsInterpretationOutput } from "./types";

export function computeTransitChart(
	natalProfile: Profile,
	target: TransitTargetInput,
	ephemeris: Ephemeris,
): TransitChartOutput {
	const natalChart = computeNatalChart(natalProfile, ephemeris);
	const targetJd = target.jdUt;

	const evalLat = target.lat ?? natalProfile.birthLat;
	const evalLon = target.lon ?? natalProfile.birthLon;

	const tChart = ephemeris.chartAt(targetJd, evalLat, evalLon);

	let transitCusps: number[] | undefined;
	if (target.lat !== undefined && target.lon !== undefined && tChart.cusps) {
		transitCusps = tChart.cusps;
	}

	const transitingBodies: Record<string, TransitBody> = {};
	const natalCusps = natalChart.cusps.map((c) => c.lon);

	for (const [bodyId, body] of Object.entries(tChart.bodies)) {
		if (!body) continue;
		const isOob = ephemeris.outOfBounds(bodyId as BodyId, targetJd);
		const normLon = ((body.lon % 360) + 360) % 360;
		const sign = signOf(normLon);
		const signDeg = roundPrecision(normLon % 30, 4);

		const natalHouseProj = projectPoint(body.lon, natalCusps);
		let localHouseProj: { house: number } | undefined;
		if (transitCusps) {
			localHouseProj = projectPoint(body.lon, transitCusps);
		}

		transitingBodies[bodyId] = {
			name: bodyId,
			lon: roundPrecision(normLon, 4),
			sign,
			signDeg,
			lat: roundPrecision(body.lat, 4),
			dec: roundPrecision(body.dec, 4),
			speed: roundPrecision(body.speed, 6),
			retrograde: body.speed < 0,
			natalHouse: natalHouseProj.house,
			localHouse: localHouseProj?.house,
			outOfBounds: isOob,
		};
	}

	// Natal points dictionary via shared helper
	const natalPoints = extractNatalPoints(natalChart);

	// Compute inter-chart aspects
	const aspectsToNatal = computeTransitAspects(transitingBodies, natalPoints);

	// Compute evolutionary triggers
	const evolutionaryTriggers = computeEvolutionaryTriggers(
		aspectsToNatal,
		natalChart,
	);

	// Out of bounds transiting bodies
	const outOfBounds = Object.entries(transitingBodies)
		.filter(([_, b]) => b.outOfBounds)
		.map(([name]) => name);

	let transitAngles:
		| {
				asc: AngleProjection;
				mc: AngleProjection;
				vertex: AngleProjection;
				eastPoint: AngleProjection;
		  }
		| undefined;
	let transitCuspsOutput: CuspProjection[] | undefined;

	if (target.lat !== undefined && target.lon !== undefined && tChart.angles) {
		const angles = tChart.angles;
		transitAngles = {
			asc: {
				lon: roundPrecision(angles.asc, 4),
				sign: signOf(angles.asc),
				signDeg: roundPrecision(angles.asc % 30, 4),
			},
			mc: {
				lon: roundPrecision(angles.mc, 4),
				sign: signOf(angles.mc),
				signDeg: roundPrecision(angles.mc % 30, 4),
			},
			vertex: {
				lon: roundPrecision(angles.vertex, 4),
				sign: signOf(angles.vertex),
				signDeg: roundPrecision(angles.vertex % 30, 4),
			},
			eastPoint: {
				lon: roundPrecision(angles.eastPoint, 4),
				sign: signOf(angles.eastPoint),
				signDeg: roundPrecision(angles.eastPoint % 30, 4),
			},
		};

		transitCuspsOutput = tChart.cusps.map((cLon, idx) => ({
			house: idx + 1,
			lon: roundPrecision(cLon, 4),
			sign: signOf(cLon),
			signDeg: roundPrecision(cLon % 30, 4),
		}));
	}

	return {
		target: {
			dateTime: target.dateTime,
			jdUt: roundPrecision(target.jdUt, 6),
			place: target.place,
			lat: target.lat !== undefined ? roundPrecision(target.lat, 4) : undefined,
			lon: target.lon !== undefined ? roundPrecision(target.lon, 4) : undefined,
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
		houseSystem: transitCusps ? "porphyry" : undefined,
		transitingBodies,
		transitAngles,
		transitCusps: transitCuspsOutput,
		aspectsToNatal,
		evolutionaryTriggers,
		outOfBounds,
		method:
			"JWGEA Transit Engine (Porphyry cusps / True Node / Tight Evolutionary Orbs)",
	};
}

/**
 * Extracts active triggers and out-of-bounds pressure from a computed transits chart.
 */
export function extractTransitsInterpretation(
	transits: TransitChartOutput,
): TransitsInterpretationOutput {
	const activeTriggers = transits.aspectsToNatal.map((asp) => {
		const tBody = transits.transitingBodies[asp.transitBody];
		return {
			transitingBody: asp.transitBody,
			natalPoint: asp.natalPoint,
			aspect: asp.aspect,
			orb: asp.orb,
			isApplying: asp.isApplying,
			transitingHouse: tBody?.natalHouse ?? 1,
		};
	});

	const outOfBoundsTransits = Object.values(transits.transitingBodies)
		.filter((b) => b.outOfBounds)
		.map((b) => ({
			planet: b.name,
			declination: b.dec,
			status: (b.dec >= 0 ? "out_of_bounds_north" : "out_of_bounds_south") as
				| "out_of_bounds_north"
				| "out_of_bounds_south",
		}));

	const coordinates =
		transits.target.lat !== undefined && transits.target.lon !== undefined
			? {
					lat: transits.target.lat,
					lon: transits.target.lon,
					place: transits.target.place,
				}
			: undefined;

	return {
		transitsInterpretation: {
			target: {
				dateTime: transits.target.dateTime,
				jdUt: transits.target.jdUt,
				...(coordinates ? { coordinates } : {}),
			},
			natal: {
				id: transits.natal.id,
				name: transits.natal.name ?? null,
				birthPlace: transits.natal.birthPlace,
				birthDateTime: transits.natal.birthDateTime,
				birthLat: transits.natal.birthLat,
				birthLon: transits.natal.birthLon,
				birthJdUt: transits.natal.birthJdUt,
			},
			activeTriggers,
			outOfBoundsTransits,
		},
	};
}
