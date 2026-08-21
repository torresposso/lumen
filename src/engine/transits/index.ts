import type { BodyId } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import type { Profile } from "../../domain/model";
import { toonProfile } from "../../domain/toon";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart } from "../natal/index";
import type { AngleProjection, CuspProjection } from "../natal/types";
import {
	lonFromSignDeg,
	projectPoint,
	roundPrecision,
	signOf,
} from "../shared/geometry";
import { extractNatalPoints } from "../shared/natal-points";
import { SIGN_RULERS } from "../shared/rulers";
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
	const transitingBodiesForAspects: Record<
		string,
		{ lon: number; speed?: number; natalHouse: number }
	> = {};
	const natalCusps = natalChart.cusps.map((c) =>
		lonFromSignDeg(c.sign, c.signDeg),
	);

	for (const [bodyId, body] of Object.entries(tChart.bodies)) {
		if (!body || bodyId === "mean_node") continue;
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
			sign,
			signDeg,
			natalHouse: natalHouseProj.house,
			localHouse: localHouseProj?.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			dec: roundPrecision(body.dec, 4),
			outOfBounds: isOob,
		};

		transitingBodiesForAspects[bodyId] = {
			lon: body.lon,
			speed: body.speed,
			natalHouse: natalHouseProj.house,
		};
	}

	// Natal points dictionary via shared helper
	const natalPoints = extractNatalPoints(natalChart);

	// Compute inter-chart aspects
	const aspectsToNatal = computeTransitAspects(
		transitingBodiesForAspects,
		natalPoints,
	);

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
				sign: signOf(angles.asc),
				signDeg: roundPrecision(angles.asc % 30, 4),
			},
			mc: {
				sign: signOf(angles.mc),
				signDeg: roundPrecision(angles.mc % 30, 4),
			},
			vertex: {
				sign: signOf(angles.vertex),
				signDeg: roundPrecision(angles.vertex % 30, 4),
			},
			eastPoint: {
				sign: signOf(angles.eastPoint),
				signDeg: roundPrecision(angles.eastPoint % 30, 4),
			},
		};

		transitCuspsOutput = tChart.cusps.map((cLon, idx) => {
			const sign = signOf(cLon);
			return {
				house: idx + 1,
				sign,
				signDeg: roundPrecision(cLon % 30, 4),
				ruler: SIGN_RULERS[sign] ?? "unknown",
			};
		});
	}

	return {
		target: {
			dateTime: target.dateTime,
			jdUt: roundPrecision(target.jdUt, 6),
			place: target.place,
			lat: target.lat !== undefined ? roundPrecision(target.lat, 4) : undefined,
			lon: target.lon !== undefined ? roundPrecision(target.lon, 4) : undefined,
		},
		birth: toonProfile(natalProfile),
		meta: {
			houseSystem: transitCusps ? "porphyry" : undefined,
			zodiac: "tropical",
			ephemeris: "caelus: 0.24.1",
		},
		transitingBodies,
		transitAngles,
		transitCusps: transitCuspsOutput,
		aspectsToNatal,
		evolutionaryTriggers,
		outOfBounds,
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
			transitingHouse: tBody?.natalHouse ?? asp.transitingNatalHouse,
		};
	});

	const outOfBoundsTransits = Object.entries(transits.transitingBodies)
		.filter(([_, b]) => b.outOfBounds)
		.map(([name, b]) => ({
			planet: name,
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
			natal: transits.birth,
			activeTriggers,
			outOfBoundsTransits,
		},
	};
}
