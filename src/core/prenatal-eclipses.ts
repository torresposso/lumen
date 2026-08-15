import { AxiError } from "axi-sdk-js";
import type { HouseSystem } from "caelus";
import type { ResolvedBirth } from "../cli/natal-intake";
import { projectPoint, roundPrecision } from "./celestial-coordinates";
import type { Ephemeris } from "./ephemeris-gateway";

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

/** Computes the prenatal solar and lunar eclipses occurring within 180 days prior to birth.
 *  In Jeffrey Wolf Green evolutionary astrology, prenatal eclipses represent the soul's
 *  intentions and primary karmic evolutionary blueprint for the current incarnation. */
export function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birth: ResolvedBirth,
	cusps: number[],
	houseSystem: HouseSystem,
	topocentric = false,
): EclipsesResult {
	const jdStart = birth.jdUt - 180;
	const jdEnd = birth.jdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (
		tMax: number,
		type: string,
		isLunar = false,
	): EclipseInfo => {
		const pos = ephemeris.chartAt(tMax, birth.lat, birth.lon, {
			houseSystem,
			topocentric,
		});
		const targetBody = isLunar ? pos.bodies.moon : pos.bodies.sun;
		if (!targetBody) {
			throw new AxiError(
				`${isLunar ? "Moon" : "Sun"} position unavailable for eclipse calculation`,
				"INVALID_VALUE",
			);
		}
		const point = projectPoint(targetBody.lon, cusps);
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
			? formatEclipse(lastSolar.tMax, lastSolar.type, false)
			: undefined,
		lunar: lastLunar
			? formatEclipse(lastLunar.tMax, lastLunar.type, true)
			: undefined,
	};
}
