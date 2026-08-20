import type { BodyId } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";

import type { Profile } from "../../domain/model";
import type { TransitTargetInput } from "../../domain/transit-input";
import { computeNatalChart } from "../natal/index";
import { projectPoint, roundPrecision, signOf } from "../shared/geometry";
import { computeTransitAspects } from "./aspects";
import { computeEvolutionaryTriggers } from "./triggers";
import type { TransitBody, TransitChartOutput } from "./types";

export function computeTransitChart(
	natalProfile: Profile,
	target: TransitTargetInput,
	ephemeris: Ephemeris,
): TransitChartOutput {
	// 1. Calculate the base natal chart to get natal bodies, cusps, skipped steps, etc.
	const natalChart = computeNatalChart(natalProfile, ephemeris);

	// 2. Calculate transit chart bodies and houses (if target coords exist)
	const targetLat = target.lat ?? 0;
	const targetLon = target.lon ?? 0;
	const tChart = ephemeris.chartAt(target.jdUt, targetLat, targetLon);

	const natalCusps = natalChart.cusps.map((c) => c.lon);
	const transitCusps =
		target.lat !== undefined && target.lon !== undefined
			? tChart.cusps
			: undefined;

	const transitingBodies: Record<string, TransitBody> = {};
	const outOfBounds: string[] = [];

	for (const [bodyId, body] of Object.entries(tChart.bodies)) {
		if (!body) continue;
		const isOob = ephemeris.outOfBounds(bodyId as BodyId, target.jdUt);
		if (isOob) {
			outOfBounds.push(bodyId);
		}

		const normLon = ((body.lon % 360) + 360) % 360;
		const sign = signOf(normLon);
		const signDeg = roundPrecision(normLon % 30, 4);
		const natalProj = projectPoint(body.lon, natalCusps);
		const localProj = transitCusps
			? projectPoint(body.lon, transitCusps)
			: undefined;

		transitingBodies[bodyId] = {
			name: bodyId,
			lon: roundPrecision(normLon, 4),
			sign,
			signDeg,
			lat: roundPrecision(body.lat, 4),
			dec: roundPrecision(body.dec, 4),
			speed: roundPrecision(body.speed, 6),
			retrograde: body.speed < 0,
			natalHouse: natalProj.house,
			localHouse: localProj?.house,
			outOfBounds: isOob,
		};
	}

	// 3. Compile natal points for aspect calculation (bodies + angles + PPP + Lilith)
	const natalPoints: Record<string, { lon: number; speed?: number }> = {};
	for (const [bId, b] of Object.entries(natalChart.bodies)) {
		natalPoints[bId] = { lon: b.lon, speed: b.speed };
	}
	natalPoints.asc = { lon: natalChart.angles.asc.lon, speed: 0 };
	natalPoints.mc = { lon: natalChart.angles.mc.lon, speed: 0 };
	natalPoints.vertex = { lon: natalChart.angles.vertex.lon, speed: 0 };
	natalPoints.eastPoint = { lon: natalChart.angles.eastPoint.lon, speed: 0 };
	natalPoints.pluto = {
		lon: natalChart.pluto.lon,
		speed: natalChart.bodies.pluto?.speed,
	};
	if (natalChart.ppp.active) {
		natalPoints.ppp = { lon: natalChart.ppp.lon, speed: 0 };
	}
	if (natalChart.nodalAxis.south) {
		natalPoints.south_node = {
			lon: natalChart.nodalAxis.south.lon,
			speed: natalChart.bodies.true_node?.speed,
		};
	}

	// 4. Compute inter-chart aspects
	const aspectsToNatal = computeTransitAspects(transitingBodies, natalPoints);

	// 5. Compute evolutionary triggers
	const evolutionaryTriggers = computeEvolutionaryTriggers(
		aspectsToNatal,
		natalChart,
	);

	// 6. Assemble local transit angles & cusps if target coordinates provided
	let transitAngles: TransitChartOutput["transitAngles"];
	let transitCuspsOutput: TransitChartOutput["transitCusps"];

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
