import { AxiError } from "axi-sdk-js";
import type { Chart, HouseSystem } from "caelus";
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

export interface EclipseInfo {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface EclipsesResult {
	solar?: EclipseInfo;
	lunar?: EclipseInfo;
}

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

/** Computes the prenatal solar and lunar eclipses occurring within 200 days prior to birth. */
export function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
	houseSystem: HouseSystem,
): EclipsesResult {
	const jdStart = birth.jdUt - 200;
	const jdEnd = birth.jdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (tMax: number, type: string): EclipseInfo => {
		const pos = ephemeris.chartAt(tMax, birth.lat, birth.lon, {
			houseSystem,
		});
		const sun = pos.bodies.sun;
		if (!sun) {
			throw new AxiError(
				"Sun position unavailable for eclipse calculation",
				"INVALID_VALUE",
			);
		}
		const point = projectPoint(sun.lon, cusps);
		return {
			tMax: roundPrecision(tMax),
			type,
			lon: point.lon,
			sign: point.sign,
			signDeg: point.signDeg,
			house: point.house,
		};
	};

	return {
		solar: lastSolar
			? formatEclipse(lastSolar.tMax, lastSolar.type)
			: undefined,
		lunar: lastLunar
			? formatEclipse(lastLunar.tMax, lastLunar.type)
			: undefined,
	};
}

/** Computes the Hermetic Lots (Lot of Spirit and Lot of Fortune) from Ascendant, Sun, and Moon. */
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

/** Evaluates major fixed-star conjunctions (orb <= 1.5°) against chart bodies. */
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
