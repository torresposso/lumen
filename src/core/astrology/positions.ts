import type { BodyId, Chart, Dignity } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import {
	findAspect,
	findDeclinationAspect,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
} from "./soul";

export interface ChartBodyProjection {
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	retrograde: boolean;
	speed: number;
	lat: number;
	dist: number | null;
	ra: number;
	dec: number;
	dignities: Dignity[];
}

export interface AngleProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface CuspProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: "applying" | "separating" | "exact";
	strength: number;
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: "parallel" | "contraparallel";
	orb: number;
}

export interface HouseRulerRow {
	house: number;
	sign: string;
	ruler: string;
}

export const MAJOR_ASPECT_DEFS = [
	{ name: "conjunction", target: 0, orb: 8 },
	{ name: "sextile", target: 60, orb: 6 },
	{ name: "square", target: 90, orb: 7 },
	{ name: "trine", target: 120, orb: 8 },
	{ name: "opposition", target: 180, orb: 8 },
] as const;

export const DEFAULT_BODIES: BodyId[] = [
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
];

export function computeRawChart(
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

export function projectBodies(
	rawBodies: Chart["bodies"],
	cusps: number[],
): Record<string, ChartBodyProjection> {
	const result: Record<string, ChartBodyProjection> = {};

	for (const [id, body] of Object.entries(rawBodies)) {
		if (!body) continue;
		const point = projectPoint(body.lon, cusps, 4);
		result[id] = {
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
			retrograde: body.speed < 0,
			speed: roundPrecision(body.speed, 6),
			lat: roundPrecision(body.lat, 4),
			dist: body.dist !== null ? roundPrecision(body.dist, 4) : null,
			ra: roundPrecision(body.ra, 4),
			dec: roundPrecision(body.dec, 4),
			dignities: body.dignities ?? [],
		};
	}

	return result;
}

export function projectAngles(angles: Chart["angles"]): {
	asc: AngleProjection;
	mc: AngleProjection;
	vertex: AngleProjection;
	eastPoint: AngleProjection;
} {
	const ascLon =
		typeof angles.asc === "number"
			? angles.asc
			: (angles.asc as { lon: number }).lon;
	const mcLon =
		typeof angles.mc === "number"
			? angles.mc
			: (angles.mc as { lon: number }).lon;
	const vertexLon =
		typeof angles.vertex === "number"
			? angles.vertex
			: (angles.vertex as { lon: number }).lon;
	const eastPointLon =
		typeof angles.eastPoint === "number"
			? angles.eastPoint
			: (angles.eastPoint as { lon: number }).lon;

	const asc = projectPoint(ascLon);
	const mc = projectPoint(mcLon);
	const vertex = projectPoint(vertexLon);
	const eastPoint = projectPoint(eastPointLon);

	return {
		asc: { lon: asc.lon, sign: asc.sign, signDeg: asc.signDeg },
		mc: { lon: mc.lon, sign: mc.sign, signDeg: mc.signDeg },
		vertex: { lon: vertex.lon, sign: vertex.sign, signDeg: vertex.signDeg },
		eastPoint: {
			lon: eastPoint.lon,
			sign: eastPoint.sign,
			signDeg: eastPoint.signDeg,
		},
	};
}

export function projectCusps(rawCusps: number[]): CuspProjection[] {
	return rawCusps.map((cuspLon) => {
		const pt = projectPoint(cuspLon);
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	});
}

export function computeHouseRulers(cusps: CuspProjection[]): HouseRulerRow[] {
	return cusps.map((c, idx) => ({
		house: idx + 1,
		sign: c.sign,
		ruler: SIGN_RULERS[c.sign] ?? "unknown",
	}));
}

export function computeAspectPhase(
	speedA: number,
	lonA: number,
	speedB: number,
	lonB: number,
	target: number,
): "applying" | "separating" | "exact" {
	const relSpeed = speedA - speedB;
	let diff = (lonA - lonB) % 360;
	if (diff < 0) diff += 360;
	if (diff > 180) diff -= 360;

	const dev = Math.abs(diff) - target;
	if (Math.abs(dev) < 1e-6 || Math.abs(relSpeed) < 1e-6) return "exact";

	const rateOfDistanceChange =
		(Math.abs(diff) > target ? 1 : -1) * (diff > 0 ? relSpeed : -relSpeed);
	return rateOfDistanceChange < 0 ? "applying" : "separating";
}

export function computeAspects(rawBodies: Chart["bodies"]): AspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		([id, body]) =>
			body !== undefined && id !== "true_node" && id !== "mean_node",
	);

	// include true_node in aspect calculations if present
	if (rawBodies.true_node) {
		bodyEntries.push(["true_node", rawBodies.true_node]);
	}

	const aspects: AspectProjection[] = [];

	for (let i = 0; i < bodyEntries.length; i++) {
		for (let j = i + 1; j < bodyEntries.length; j++) {
			const entryI = bodyEntries[i];
			const entryJ = bodyEntries[j];
			if (!entryI || !entryJ) continue;
			const [idA, bodyA] = entryI;
			const [idB, bodyB] = entryJ;
			if (!bodyA || !bodyB) continue;

			const match = findAspect(bodyA.lon, bodyB.lon, MAJOR_ASPECT_DEFS);
			if (match) {
				const maxOrb =
					MAJOR_ASPECT_DEFS.find((d) => d.name === match.aspect)?.orb ?? 8;
				const strength = roundPrecision(1 - match.orb / maxOrb, 3);
				const phase = computeAspectPhase(
					bodyA.speed,
					bodyA.lon,
					bodyB.speed,
					bodyB.lon,
					match.target,
				);

				aspects.push({
					a: idA,
					b: idB,
					aspect: match.aspect,
					orb: roundPrecision(match.orb, 2),
					phase,
					strength,
				});
			}
		}
	}

	return aspects;
}

export function computeDeclinationAspects(
	rawBodies: Chart["bodies"],
): DeclinationAspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		([_, body]) => body !== undefined,
	);
	const results: DeclinationAspectProjection[] = [];

	for (let i = 0; i < bodyEntries.length; i++) {
		for (let j = i + 1; j < bodyEntries.length; j++) {
			const entryI = bodyEntries[i];
			const entryJ = bodyEntries[j];
			if (!entryI || !entryJ) continue;
			const [idA, bodyA] = entryI;
			const [idB, bodyB] = entryJ;
			if (!bodyA || !bodyB) continue;

			if (bodyA.dec !== undefined && bodyB.dec !== undefined) {
				const match = findDeclinationAspect(bodyA.dec, bodyB.dec, 1.2);
				if (match) {
					results.push({
						a: idA,
						b: idB,
						aspect: match.aspect,
						orb: roundPrecision(match.orb, 4),
					});
				}
			}
		}
	}

	return results;
}
