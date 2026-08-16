import type { BodyId, Chart } from "caelus";
import { computeSolLunaPhase, type SolLunaPhaseResult } from "./phases";
import type { Ephemeris, ResolvedBirth } from "./types";
import { findAspect, normalizeLongitude, roundPrecision } from "./types";

export interface ProgressedBodyPlacement {
	body: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	evolutionaryContacts: ProgressedContact[];
}

export interface ProgressedContact {
	natalPoint: "pluto" | "ppp" | "north_node" | "south_node";
	aspect: string;
	orb: number;
}

export interface JourneyProgressedResult {
	natalDate: string;
	targetDate: string;
	ageYears: number;
	solLunaPhase?: SolLunaPhaseResult;
	bodies: ProgressedBodyPlacement[];
}

export interface StationEvent {
	jdUt: number;
	type: "retrograde" | "direct";
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
}

export interface JourneyStationsResult {
	body: string;
	windowYears: number;
	stations: StationEvent[];
}

export interface StationWindow {
	/** Start JD; defaults to birth. */
	startJd?: number;
	/** End JD; defaults to start + `years` (default 1) after birth. */
	endJd?: number;
	/** Retrocompatible years-from-birth window. */
	years?: number;
}

export const EA_ASPECT_ORB = 3;

const DEFAULT_ASPECT_DEFS = (orb: number) => [
	{ name: "conjunction", target: 0, orb },
	{ name: "opposition", target: 180, orb },
	{ name: "square", target: 90, orb },
	{ name: "trine", target: 120, orb },
	{ name: "sextile", target: 60, orb },
	{ name: "quincunx", target: 150, orb },
];

/**
 * Computes secondary progressions (day-for-a-year) and evolutionary contacts to natal points.
 */
export function computeProgressions(
	birth: ResolvedBirth,
	natalChart: Chart,
	targetJd: number,
	targetDateStr: string,
	ephemeris: Ephemeris,
	bodyIds: BodyId[] = ["moon", "sun", "pluto"],
	aspectOrb = EA_ASPECT_ORB,
): JourneyProgressedResult {
	const natalJd = birth.jdUt;
	const daysDifference = targetJd - natalJd;
	const ageYears = daysDifference / 365.24219;
	const progressedUt = natalJd + ageYears;

	// Progressed chart at progressed UT
	const progressedChart = ephemeris.chartAt(
		progressedUt,
		birth.lat,
		birth.lon,
		{ houseSystem: "placidus" },
	);

	// Natal points for evolutionary contacts
	const natalPluto = natalChart.bodies.pluto?.lon;
	const natalPPP =
		natalPluto !== undefined ? normalizeLongitude(natalPluto + 180) : undefined;
	const natalNN =
		natalChart.bodies.true_node?.lon ?? natalChart.bodies.mean_node?.lon;
	const natalSN =
		natalNN !== undefined ? normalizeLongitude(natalNN + 180) : undefined;

	const natalPoints: Array<{
		name: ProgressedContact["natalPoint"];
		lon: number;
	}> = [];
	if (natalPluto !== undefined)
		natalPoints.push({ name: "pluto", lon: natalPluto });
	if (natalPPP !== undefined) natalPoints.push({ name: "ppp", lon: natalPPP });
	if (natalNN !== undefined)
		natalPoints.push({ name: "north_node", lon: natalNN });
	if (natalSN !== undefined)
		natalPoints.push({ name: "south_node", lon: natalSN });

	const defs = DEFAULT_ASPECT_DEFS(aspectOrb);
	const bodies: ProgressedBodyPlacement[] = [];

	for (const id of bodyIds) {
		const progBody = progressedChart.bodies[id];
		if (!progBody) continue;

		const contacts: ProgressedContact[] = [];
		for (const np of natalPoints) {
			const aspect = findAspect(progBody.lon, np.lon, defs);
			if (aspect && aspect.orb <= aspectOrb) {
				contacts.push({
					natalPoint: np.name,
					aspect: aspect.aspect,
					orb: roundPrecision(aspect.orb),
				});
			}
		}

		bodies.push({
			body: id,
			lon: progBody.lon,
			sign: progBody.sign,
			signDeg: progBody.signDeg,
			house: progBody.house,
			evolutionaryContacts: contacts,
		});
	}

	let solLunaPhase: SolLunaPhaseResult | undefined;
	const progSun = progressedChart.bodies.sun;
	const progMoon = progressedChart.bodies.moon;
	if (progSun && progMoon) {
		solLunaPhase = computeSolLunaPhase(progSun.lon, progMoon.lon);
	}

	const natalDateStr = `${birth.local.year}-${String(birth.local.month).padStart(2, "0")}-${String(birth.local.day).padStart(2, "0")}`;

	return {
		natalDate: natalDateStr,
		targetDate: targetDateStr,
		ageYears: roundPrecision(ageYears),
		solLunaPhase,
		bodies,
	};
}

/**
 * Computes planetary stations in a given time window from birth.
 */
export function computeStations(
	birth: ResolvedBirth,
	bodyId: BodyId,
	ephemeris: Ephemeris,
	window: number | StationWindow = 1,
	limit = 30,
): JourneyStationsResult {
	const numericYears = typeof window === "number" ? window : undefined;
	const options = typeof window === "object" ? window : {};
	const years = numericYears ?? options.years ?? 1;
	const startJd = options.startJd ?? birth.jdUt;
	const endJd = options.endJd ?? startJd + years * 365.24219;
	const windowYears = (endJd - startJd) / 365.24219;

	const rawStations = ephemeris.stations
		? ephemeris.stations(bodyId, startJd, endJd, limit)
		: [];

	const stations: StationEvent[] = rawStations.map(([jd, type]) => {
		const chart = ephemeris.chartAt(jd, birth.lat, birth.lon);
		const b = chart.bodies[bodyId];
		return {
			jdUt: jd,
			type,
			lon: b?.lon ?? 0,
			sign: b?.sign ?? "",
			signDeg: b?.signDeg ?? 0,
			house: b?.house ?? 1,
		};
	});

	return {
		body: bodyId,
		windowYears,
		stations,
	};
}
