import type { Ephemeris } from "../../adapters/ephemeris";
import { projectPoint, roundPrecision } from "./soul";

export interface EclipseFact {
	tMax: number;
	type: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface PrenatalEclipsesFact {
	solar?: EclipseFact;
	lunar?: EclipseFact;
}

export function computePrenatalEclipses(
	ephemeris: Ephemeris,
	birthJdUt: number,
	birthLat: number,
	birthLon: number,
	cusps: number[],
): PrenatalEclipsesFact {
	const jdStart = birthJdUt - 180;
	const jdEnd = birthJdUt;
	const sEclipses = ephemeris.solarEclipses(jdStart, jdEnd);
	const lEclipses = ephemeris.lunarEclipses(jdStart, jdEnd);

	const lastSolar =
		sEclipses.length > 0 ? sEclipses[sEclipses.length - 1] : undefined;
	const lastLunar =
		lEclipses.length > 0 ? lEclipses[lEclipses.length - 1] : undefined;

	const formatEclipse = (
		tMax: number,
		type: string,
		isLunar: boolean,
	): EclipseFact => {
		const pos = ephemeris.chartAt(tMax, birthLat, birthLon, {
			houseSystem: "porphyry",
			topocentric: false,
		});
		const targetBody = isLunar ? pos.bodies.moon : pos.bodies.sun;
		if (!targetBody) {
			throw new Error(
				`${isLunar ? "Moon" : "Sun"} position unavailable for eclipse calculation`,
			);
		}
		const point = projectPoint(targetBody.lon, cusps, 4);
		return {
			tMax: roundPrecision(tMax, 4),
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
