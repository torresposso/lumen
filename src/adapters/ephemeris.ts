import type { BodyId, Chart, LunarEclipse, SolarEclipse } from "caelus";
import {
	Engine,
	lunarEclipses,
	progressedLongitude,
	solarEclipses,
	stations,
} from "caelus";
import { embeddedData } from "caelus/data-embedded";

export type ChartAtOptions = Parameters<Engine["chartAt"]>[3];

/**
 * Pure capability seam over the astronomical ephemeris engine.
 */
export interface Ephemeris {
	chartAt(
		jdUt: number,
		lat: number,
		lonEast: number,
		opts?: ChartAtOptions,
	): Chart;
	solarEclipses(jdStart: number, jdEnd: number): SolarEclipse[];
	lunarEclipses(jdStart: number, jdEnd: number): LunarEclipse[];
	progressedLongitude?(body: BodyId, natalJd: number, targetJd: number): number;
	stations?(
		body: BodyId,
		jdStart: number,
		jdEnd: number,
		maxHits?: number,
	): Array<[number, "retrograde" | "direct"]>;
}

/**
 * The Caelus-backed adapter implementing the Ephemeris seam.
 */
export class CaelusEphemeris implements Ephemeris {
	private engine: Engine;

	constructor(engine: Engine = new Engine(embeddedData)) {
		this.engine = engine;
	}

	chartAt(
		jdUt: number,
		lat: number,
		lonEast: number,
		opts?: ChartAtOptions,
	): Chart {
		return this.engine.chartAt(jdUt, lat, lonEast, opts);
	}

	solarEclipses(jdStart: number, jdEnd: number): SolarEclipse[] {
		return solarEclipses(this.engine, jdStart, jdEnd);
	}

	lunarEclipses(jdStart: number, jdEnd: number): LunarEclipse[] {
		return lunarEclipses(this.engine, jdStart, jdEnd);
	}

	progressedLongitude(body: BodyId, natalJd: number, targetJd: number): number {
		return progressedLongitude(this.engine, body, natalJd, targetJd);
	}

	stations(
		body: BodyId,
		jdStart: number,
		jdEnd: number,
		maxHits = 30,
	): Array<[number, "retrograde" | "direct"]> {
		return stations(this.engine, body, jdStart, jdEnd, maxHits);
	}
}
