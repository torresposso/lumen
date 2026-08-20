import type { Chart } from "caelus";
import { hermeticLots } from "caelus";
import { projectPoint } from "../shared/geometry";
import type { SoulLotsProjection } from "./types";

/**
 * Computes the seven Hermetic Soul Lots: Fortune (body/vessel), Spirit (daimon/purpose),
 * Eros (desire), Necessity (karmic constraint), Courage (volition), Victory (grace/attainment),
 * and Nemesis (karmic shadow) based on diurnal/nocturnal chart sect.
 */
export function computeSoulLots(
	rawChart: Chart,
	cusps: number[],
): SoulLotsProjection {
	const asc =
		typeof rawChart.angles.asc === "number"
			? rawChart.angles.asc
			: ((rawChart.angles.asc as unknown as { lon: number })?.lon ?? 0);
	const sun = rawChart.bodies.sun?.lon ?? 0;
	const moon = rawChart.bodies.moon?.lon ?? 0;
	const mercury = rawChart.bodies.mercury?.lon ?? 0;
	const venus = rawChart.bodies.venus?.lon ?? 0;
	const mars = rawChart.bodies.mars?.lon ?? 0;
	const jupiter = rawChart.bodies.jupiter?.lon ?? 0;
	const saturn = rawChart.bodies.saturn?.lon ?? 0;
	const sunHouse = rawChart.bodies.sun?.house;
	// Diurnal when Sun is in upper hemisphere (houses 7, 8, 9, 10, 11, 12)
	const isDay = sunHouse !== undefined ? sunHouse >= 7 && sunHouse <= 12 : true;

	const lotsMap = hermeticLots(
		asc,
		isDay,
		sun,
		moon,
		mercury,
		venus,
		mars,
		jupiter,
		saturn,
	);

	return {
		fortune: projectPoint(lotsMap.fortune, cusps, 4),
		spirit: projectPoint(lotsMap.spirit, cusps, 4),
		eros: projectPoint(lotsMap.eros, cusps, 4),
		necessity: projectPoint(lotsMap.necessity, cusps, 4),
		courage: projectPoint(lotsMap.courage, cusps, 4),
		victory: projectPoint(lotsMap.victory, cusps, 4),
		nemesis: projectPoint(lotsMap.nemesis, cusps, 4),
		isDay,
	};
}
