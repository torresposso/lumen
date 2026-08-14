import { AxiError } from "axi-sdk-js";
import type { Chart } from "caelus";
import type { ChartRequestOptions, ResolvedBirth } from "../cli/intake";
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

/** Evaluates optional chart features (prenatal solar & lunar eclipses, Hermetic
 *  Lots, and Fixed Star conjunctions) based on request flags. */
export function applyExtensions<T extends Chart>(
	ephemeris: Ephemeris,
	chart: T,
	birth: ResolvedBirth,
	options: ChartRequestOptions,
): T & {
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
} {
	const result = { ...chart } as T & {
		eclipses?: EclipsesResult;
		lots?: LotsResult;
		stars?: FixedStarMatch[];
	};

	if (options.eclipses) {
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
				houseSystem: options.houseSystem,
			});
			const sun = pos.bodies.sun;
			if (!sun) {
				throw new AxiError(
					"Sun position unavailable for eclipse calculation",
					"INVALID_VALUE",
				);
			}
			const point = projectPoint(sun.lon, chart.cusps);
			return {
				tMax: roundPrecision(tMax),
				type,
				lon: point.lon,
				sign: point.sign,
				signDeg: point.signDeg,
				house: point.house,
			};
		};

		result.eclipses = {
			solar: lastSolar
				? formatEclipse(lastSolar.tMax, lastSolar.type)
				: undefined,
			lunar: lastLunar
				? formatEclipse(lastLunar.tMax, lastLunar.type)
				: undefined,
		};
	}

	if (options.lots) {
		const chartLots = ephemeris.lots(birth.jdUt, birth.lat, birth.lon);

		result.lots = {
			spirit: projectPoint(chartLots.spirit, chart.cusps),
			fortune: projectPoint(chartLots.fortune, chart.cusps),
		};
	}

	if (options.stars) {
		const matches: FixedStarMatch[] = [];

		for (const [starName, starEntry] of Object.entries(
			ephemeris.fixedStars(),
		)) {
			const starLon = normalizeLongitude(
				ephemeris.starLongitude(starEntry, birth.jdUt),
			);

			for (const [bodyId, body] of Object.entries(chart.bodies)) {
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

		result.stars = matches;
	}

	return result;
}
