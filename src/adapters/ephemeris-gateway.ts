import type { BodyId, Chart, LunarEclipse, SolarEclipse } from "caelus";
import {
	Engine,
	lunarEclipses,
	progressedLongitude,
	solarEclipses,
	stations,
} from "caelus";
import { embeddedData } from "caelus/data-embedded";
import type { Ephemeris } from "../core/types";

export type { Ephemeris };

type ChartAtOptions = Parameters<Engine["chartAt"]>[3];

/** The caelus-backed adapter: the single module that knows how to drive the
 *  caelus engine. */
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
