import type { Chart } from "caelus";
import type { ResolvedBirth } from "../cli/intake";
import type { Ephemeris } from "./ephemeris";
import {
	angularDistance,
	isOrbWithin,
	type LotInfo,
	normalizeLongitude,
	projectPoint,
	roundPrecision,
	signOf,
} from "./zodiac";

export interface LotsResult {
	spirit: LotInfo;
	fortune: LotInfo;
}

export interface FixedStarMatch {
	star: string;
	body: string;
	orb: number;
	sign: string;
}

/** Computes the classical Hermetic Lots (Lot of Spirit and Lot of Fortune) from Ascendant, Sun, and Moon. */
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

/** Evaluates major fixed-star conjunctions (orb <= 1.5°) against natal body positions. */
export function computeFixedStarMatches(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	bodies: Chart["bodies"],
): FixedStarMatch[] {
	const matches: FixedStarMatch[] = [];

	for (const [starName, starEntry] of Object.entries(ephemeris.fixedStars())) {
		const starLon = normalizeLongitude(
			ephemeris.starLongitude(starEntry, birth.jdUt),
		);

		for (const [bodyId, body] of Object.entries(bodies)) {
			if (body && isOrbWithin(body.lon, starLon, 1.5)) {
				const diff = angularDistance(body.lon, starLon);
				matches.push({
					star: starName,
					body: bodyId,
					orb: roundPrecision(diff),
					sign: signOf(starLon),
				});
			}
		}
	}

	return matches;
}
