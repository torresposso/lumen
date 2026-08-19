import type { Chart } from "caelus";
import type { Ephemeris } from "../../adapters/ephemeris";
import {
	DEFAULT_BODIES,
	determineAspectPhase,
	eachPair,
	findAspect,
	findDeclinationAspect,
	MAJOR_ASPECT_DEFS,
	projectPoint,
	roundPrecision,
	SIGN_RULERS,
} from "./geometry";

export { DEFAULT_BODIES, MAJOR_ASPECT_DEFS };

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
	dignities: string[];
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

function angleLon(val: number | { lon: number }): number {
	return typeof val === "number" ? val : val.lon;
}

export function projectAngles(angles: Chart["angles"]): {
	asc: AngleProjection;
	mc: AngleProjection;
	vertex: AngleProjection;
	eastPoint: AngleProjection;
} {
	const project = (val: number | { lon: number }): AngleProjection => {
		const pt = projectPoint(angleLon(val));
		return { lon: pt.lon, sign: pt.sign, signDeg: pt.signDeg };
	};

	return {
		asc: project(angles.asc),
		mc: project(angles.mc),
		vertex: project(angles.vertex),
		eastPoint: project(angles.eastPoint),
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

export { determineAspectPhase as computeAspectPhase };

type RawBody = NonNullable<Chart["bodies"][string]>;

export function computeAspects(rawBodies: Chart["bodies"]): AspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		(entry): entry is [string, RawBody] =>
			entry[1] !== undefined &&
			entry[0] !== "true_node" &&
			entry[0] !== "mean_node",
	);

	// include true_node in aspect calculations if present
	if (rawBodies.true_node) {
		bodyEntries.push(["true_node", rawBodies.true_node]);
	}

	const aspects: AspectProjection[] = [];

	eachPair(bodyEntries, ([idA, bodyA], [idB, bodyB]) => {
		const match = findAspect(bodyA.lon, bodyB.lon, MAJOR_ASPECT_DEFS);
		if (match) {
			const maxOrb =
				MAJOR_ASPECT_DEFS.find((d) => d.name === match.aspect)?.orb ?? 8;
			const strength = roundPrecision(1 - match.orb / maxOrb, 3);
			const phase = determineAspectPhase(
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
	});

	return aspects;
}

export function computeDeclinationAspects(
	rawBodies: Chart["bodies"],
): DeclinationAspectProjection[] {
	const bodyEntries = Object.entries(rawBodies).filter(
		(entry): entry is [string, RawBody] => entry[1] !== undefined,
	);
	const results: DeclinationAspectProjection[] = [];

	eachPair(bodyEntries, ([idA, bodyA], [idB, bodyB]) => {
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
	});

	return results;
}
