import { describe, expect, it } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { chartAt } from "../../src/core/charts";
import type { Ephemeris, NatalRequest } from "../../src/core/types";

const CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function body(lon: number): ChartBody {
	return {
		lon,
		sign: "Aries",
		signDeg: 0,
		house: 1,
		retrograde: false,
		speed: 1,
		lat: 0,
		dist: null,
		ra: lon,
		dec: 0,
		dignities: [],
	};
}

function baseChart(): Chart {
	return {
		jdUt: 0,
		zodiac: "tropical",
		houseSystem: "whole_sign",
		houseSystemRequested: "whole_sign",
		bodies: {
			sun: body(10),
			moon: body(20),
			mercury: body(30),
			venus: body(40),
			mars: body(50),
			jupiter: body(60),
			saturn: body(70),
			uranus: body(80),
			neptune: body(90),
			pluto: body(100),
			mean_node: body(110),
			true_node: body(120),
		} as unknown as Chart["bodies"],
		unavailable: [],
		angles: { asc: 0, mc: 90, vertex: 180, eastPoint: 270 },
		cusps: CUSPS,
		aspects: [],
	};
}

const request: NatalRequest = {
	birth: {
		jdUt: 2444630.5,
		lat: 9.24,
		lon: -74.75,
		local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
		zone: "America/Bogota",
		offsetMinutes: -300,
		dst: false,
		status: "ok",
	},
	options: {
		houseSystem: "whole_sign",
		zodiac: "tropical",
		bodies: ["mean_lilith"],
		topocentric: true,
		draconic: false,
	},
};

describe("core/charts chartAt", () => {
	it("forwards the full chart options through the ephemeris seam", () => {
		const calls: Array<{
			jdUt: number;
			lat: number;
			lon: number;
			opts?: unknown;
		}> = [];
		const ephemeris: Ephemeris = {
			chartAt(jdUt, lat, lon, opts) {
				calls.push({ jdUt, lat, lon, opts });
				return baseChart();
			},
			solarEclipses: () => [],
			lunarEclipses: () => [],
		};

		chartAt(request, 1234.5, ephemeris);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.jdUt).toBe(1234.5);
		expect(calls[0]?.lat).toBe(9.24);
		expect(calls[0]?.lon).toBe(-74.75);
		expect(calls[0]?.opts).toEqual({
			houseSystem: "whole_sign",
			zodiac: "tropical",
			bodies: ["mean_lilith"],
			topocentric: true,
		});
	});

	it("drops mean_node and keeps true_node", () => {
		const ephemeris: Ephemeris = {
			chartAt: () => baseChart(),
			solarEclipses: () => [],
			lunarEclipses: () => [],
		};

		const result = chartAt(request, request.birth.jdUt, ephemeris);

		expect(result.bodies.mean_node).toBeUndefined();
		expect(result.bodies.true_node).toBeDefined();
	});
});
