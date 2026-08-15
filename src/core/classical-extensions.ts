import type { Chart, ChartBody } from "caelus";
import type { ResolvedBirth } from "../cli/natal-intake";
import {
	angularDistance,
	isOrbWithin,
	normalizeLongitude,
	type ProjectedEclipticPoint,
	projectPoint,
	roundPrecision,
	signOf,
} from "./celestial-coordinates";
import type { Ephemeris } from "./ephemeris-gateway";

export interface LotsResult {
	spirit: ProjectedEclipticPoint;
	fortune: ProjectedEclipticPoint;
}

export interface FixedStarMatch {
	star: string;
	body: string;
	orb: number;
	sign: string;
}

const FIXED_STAR_ORB = 1.5;
const MAJOR_STAR_MAX_MAG = 2.5;

/** Computes the classical Hermetic Lots (Lot of Spirit / Daimon and Lot of Fortune / Tyche)
 *  from Ascendant, Sun, and Moon relative to chart cusps. */
export function computeHermeticLots(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
): LotsResult {
	const chartLots = ephemeris.lots(birth.jdUt, birth.lat, birth.lon);
	return {
		spirit: projectPoint(chartLots.spirit, cusps),
		fortune: projectPoint(chartLots.fortune, cusps),
	};
}

/** Evaluates major fixed-star conjunctions (orb <= 1.5°, magnitude <= 2.5)
 *  against natal body and angle positions. Results are sorted by orb. */
export function computeFixedStarMatches(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	bodies: Partial<Record<string, ChartBody>>,
	angles?: Chart["angles"],
): FixedStarMatch[] {
	const matches: FixedStarMatch[] = [];
	const targets: Array<{ id: string; lon: number }> = [];

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (body !== undefined) {
			targets.push({ id: bodyId, lon: body.lon });
		}
	}
	if (angles !== undefined) {
		for (const angleId of ["asc", "mc", "vertex", "eastPoint"] as const) {
			targets.push({ id: angleId, lon: angles[angleId] });
		}
	}

	for (const [starName, starEntry] of Object.entries(ephemeris.fixedStars())) {
		if (
			typeof starEntry.mag !== "number" ||
			starEntry.mag > MAJOR_STAR_MAX_MAG
		) {
			continue;
		}

		const starLon = normalizeLongitude(
			ephemeris.starLongitude(starEntry, birth.jdUt),
		);

		for (const target of targets) {
			if (isOrbWithin(target.lon, starLon, FIXED_STAR_ORB)) {
				const diff = angularDistance(target.lon, starLon);
				matches.push({
					star: starName,
					body: target.id,
					orb: roundPrecision(diff),
					sign: signOf(starLon),
				});
			}
		}
	}

	return matches.sort(
		(a, b) =>
			a.orb - b.orb ||
			a.star.localeCompare(b.star) ||
			a.body.localeCompare(b.body),
	);
}
