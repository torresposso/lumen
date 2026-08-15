import type {
	BodyId,
	Chart,
	ChartLots,
	EngineData,
	LunarEclipse,
	SolarEclipse,
	StarEntry,
} from "caelus";
import {
	Engine,
	lots,
	lunarEclipses,
	progressedLongitude,
	solarEclipses,
	starApparent,
	stations,
} from "caelus";
import { embeddedData } from "caelus/data-embedded";

type ChartAtOptions = Parameters<Engine["chartAt"]>[3];

/** Capability seam over the ephemeris engine. Every astronomical computation
 *  the chart path needs — the natal chart plus the extension features
 *  (prenatal eclipses, Hermetic Lots, fixed stars) — flows through this one
 *  interface, so a test double can substitute the whole engine. */
export interface Ephemeris {
	chartAt(
		jdUt: number,
		lat: number,
		lonEast: number,
		opts?: ChartAtOptions,
	): Chart;
	solarEclipses(jdStart: number, jdEnd: number): SolarEclipse[];
	lunarEclipses(jdStart: number, jdEnd: number): LunarEclipse[];
	lots(jdUt: number, lat: number, lonEast: number): ChartLots;
	/** Apparent ecliptic longitude (degrees) of a fixed-star catalog entry at a UT JD. */
	starLongitude(entry: StarEntry, jdUt: number): number;
	/** Fixed-star catalog entries keyed by conventional name. */
	fixedStars(): Record<string, StarEntry>;
	/** Optional timing extension: secondary-progressed longitude for a body. */
	progressedLongitude?(body: BodyId, natalJd: number, targetJd: number): number;
	/** Optional timing extension: body stations in a JD window. */
	stations?(
		body: BodyId,
		jdStart: number,
		jdEnd: number,
		maxHits?: number,
	): Array<[number, "retrograde" | "direct"]>;
}

/** The caelus-backed adapter: the single module that knows how to drive the
 *  caelus engine and its embedded star catalog. */
export class CaelusEphemeris implements Ephemeris {
	private engine: Engine;
	private data: EngineData;

	constructor(
		engine: Engine = new Engine(embeddedData),
		data: EngineData = embeddedData,
	) {
		this.engine = engine;
		this.data = data;
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

	lots(jdUt: number, lat: number, lonEast: number): ChartLots {
		return lots(this.engine, jdUt, lat, lonEast);
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

	starLongitude(entry: StarEntry, jdUt: number): number {
		return (starApparent(this.data, entry, jdUt)[0] * 180) / Math.PI;
	}

	fixedStars(): Record<string, StarEntry> {
		return this.data.fixedStars?.stars ?? {};
	}
}
