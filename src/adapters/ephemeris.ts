import type {
	Aspect,
	AspectKind,
	AspectPhase,
	BodyId,
	Chart,
	DeclinationPair,
	LunarEclipse,
	Pheno,
	Position,
	SolarEclipse,
} from "caelus";
import {
	aspectPhase,
	declinationAspects,
	Engine,
	findAspects,
	lunarEclipses,
	outOfBounds,
	pheno,
	progressedLongitude,
	returns,
	solarEclipses,
} from "caelus";
import { embeddedData } from "caelus/data-embedded";

export type {
	Aspect,
	AspectKind,
	AspectPhase,
	BodyId,
	Chart,
	DeclinationPair,
	LunarEclipse,
	Pheno,
	Position,
	SolarEclipse,
};
export { aspectPhase, findAspects };

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
	aspects(
		bodies: Record<string, Position>,
		orbs?: Record<string, number>,
	): Aspect[];
	declinationAspects(
		bodies: BodyId[],
		jdUt: number,
		orb?: number,
	): DeclinationPair[];
	outOfBounds(body: BodyId, jdUt: number): boolean;
	returns(
		body: BodyId,
		natalJd: number,
		jdStart: number,
		jdEnd: number,
	): number[];
	progressedLongitude(body: BodyId, natalJd: number, targetJd: number): number;
	pheno(body: BodyId, jdUt: number): Pheno;
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

	aspects(
		bodies: Record<string, Position>,
		orbs?: Record<string, number>,
	): Aspect[] {
		return findAspects(bodies, orbs);
	}

	declinationAspects(
		bodies: BodyId[],
		jdUt: number,
		orb?: number,
	): DeclinationPair[] {
		return declinationAspects(this.engine, bodies, jdUt, orb);
	}

	outOfBounds(body: BodyId, jdUt: number): boolean {
		return outOfBounds(this.engine, body, jdUt);
	}

	returns(
		body: BodyId,
		natalJd: number,
		jdStart: number,
		jdEnd: number,
	): number[] {
		return returns(this.engine, body, natalJd, jdStart, jdEnd);
	}

	progressedLongitude(body: BodyId, natalJd: number, targetJd: number): number {
		return progressedLongitude(this.engine, body, natalJd, targetJd);
	}

	pheno(body: BodyId, jdUt: number): Pheno {
		return pheno(this.engine, body, jdUt);
	}
}

export interface InMemoryEphemerisOptions {
	chart?:
		| Chart
		| ((
				jdUt: number,
				lat: number,
				lonEast: number,
				opts?: ChartAtOptions,
		  ) => Chart);
	solarEclipses?:
		| SolarEclipse[]
		| ((jdStart: number, jdEnd: number) => SolarEclipse[]);
	lunarEclipses?:
		| LunarEclipse[]
		| ((jdStart: number, jdEnd: number) => LunarEclipse[]);
	aspects?:
		| Aspect[]
		| ((
				bodies: Record<string, Position>,
				orbs?: Record<string, number>,
		  ) => Aspect[]);
	declinationAspects?:
		| DeclinationPair[]
		| ((bodies: BodyId[], jdUt: number, orb?: number) => DeclinationPair[]);
	outOfBounds?: boolean | ((body: BodyId, jdUt: number) => boolean);
	returns?:
		| number[]
		| ((
				body: BodyId,
				natalJd: number,
				jdStart: number,
				jdEnd: number,
		  ) => number[]);
	progressedLongitude?:
		| number
		| ((body: BodyId, natalJd: number, targetJd: number) => number);
	pheno?: Pheno | ((body: BodyId, jdUt: number) => Pheno);
}

/**
 * In-memory test adapter behind the Ephemeris port: provides deterministic
 * charts and eclipses without initializing Caelus embedded ephemeris data.
 */
export class InMemoryEphemeris implements Ephemeris {
	constructor(private readonly options: InMemoryEphemerisOptions = {}) {}

	chartAt(
		jdUt: number,
		lat: number,
		lonEast: number,
		opts?: ChartAtOptions,
	): Chart {
		if (typeof this.options.chart === "function") {
			return this.options.chart(jdUt, lat, lonEast, opts);
		}
		if (this.options.chart) {
			return this.options.chart;
		}

		return {
			julianDay: jdUt,
			siderealTime: 0,
			armc: 0,
			vertex: 0,
			eastPoint: 0,
			angles: {
				asc: { lon: 0, sign: "Aries", signDeg: 0, house: 1 },
				mc: { lon: 90, sign: "Cancer", signDeg: 0, house: 10 },
				vertex: { lon: 180, sign: "Libra", signDeg: 0, house: 7 },
				eastPoint: { lon: 270, sign: "Capricorn", signDeg: 0, house: 4 },
			},
			cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
			bodies: {
				pluto: {
					lon: 220,
					lat: 0,
					ra: 0,
					dec: 0,
					dist: 30,
					speed: -0.01,
					sign: "Scorpio",
					signDeg: 10,
					house: 8,
					dignities: [],
				},
				true_node: {
					lon: 40,
					lat: 0,
					ra: 0,
					dec: 0,
					dist: 0,
					speed: -0.05,
					sign: "Taurus",
					signDeg: 10,
					house: 2,
					dignities: [],
				},
				sun: {
					lon: 80,
					lat: 0,
					ra: 0,
					dec: 0,
					dist: 1,
					speed: 1.0,
					sign: "Gemini",
					signDeg: 20,
					house: 3,
					dignities: [],
				},
				moon: {
					lon: 120,
					lat: 0,
					ra: 0,
					dec: 0,
					dist: 0.002,
					speed: 13.0,
					sign: "Leo",
					signDeg: 0,
					house: 5,
					dignities: [],
				},
			},
		} as unknown as Chart;
	}

	solarEclipses(jdStart: number, jdEnd: number): SolarEclipse[] {
		if (typeof this.options.solarEclipses === "function") {
			return this.options.solarEclipses(jdStart, jdEnd);
		}
		return this.options.solarEclipses ?? [];
	}

	lunarEclipses(jdStart: number, jdEnd: number): LunarEclipse[] {
		if (typeof this.options.lunarEclipses === "function") {
			return this.options.lunarEclipses(jdStart, jdEnd);
		}
		return this.options.lunarEclipses ?? [];
	}

	aspects(
		bodies: Record<string, Position>,
		orbs?: Record<string, number>,
	): Aspect[] {
		if (typeof this.options.aspects === "function") {
			return this.options.aspects(bodies, orbs);
		}
		if (this.options.aspects !== undefined) {
			return this.options.aspects;
		}
		return findAspects(bodies, orbs);
	}

	declinationAspects(
		bodies: BodyId[],
		jdUt: number,
		orb?: number,
	): DeclinationPair[] {
		if (typeof this.options.declinationAspects === "function") {
			return this.options.declinationAspects(bodies, jdUt, orb);
		}
		return this.options.declinationAspects ?? [];
	}

	outOfBounds(body: BodyId, jdUt: number): boolean {
		if (typeof this.options.outOfBounds === "function") {
			return this.options.outOfBounds(body, jdUt);
		}
		return this.options.outOfBounds ?? false;
	}

	returns(
		body: BodyId,
		natalJd: number,
		jdStart: number,
		jdEnd: number,
	): number[] {
		if (typeof this.options.returns === "function") {
			return this.options.returns(body, natalJd, jdStart, jdEnd);
		}
		return this.options.returns ?? [];
	}

	progressedLongitude(body: BodyId, natalJd: number, targetJd: number): number {
		if (typeof this.options.progressedLongitude === "function") {
			return this.options.progressedLongitude(body, natalJd, targetJd);
		}
		return this.options.progressedLongitude ?? 0;
	}

	pheno(body: BodyId, jdUt: number): Pheno {
		if (typeof this.options.pheno === "function") {
			return this.options.pheno(body, jdUt);
		}
		return (
			this.options.pheno ?? {
				phaseAngle: 0,
				phase: 1,
				elongation: 0,
				diameter: 0,
				magnitude: 0,
			}
		);
	}
}
