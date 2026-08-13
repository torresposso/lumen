import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import type { NatalRequest } from "../../src/cli/intake";
import { formatChart } from "../../src/cli/output";

const request: NatalRequest = {
	birth: {
		jdUt: 2448053.2708,
		lat: 27.95,
		lon: -82.46,
		local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
		zone: "America/New_York",
		offsetMinutes: -240,
		dst: true,
		status: "ok",
	},
	options: {
		houseSystem: "placidus",
		zodiac: "tropical",
		node: "both",
		bodies: ["mean_lilith"],
		topocentric: false,
		draconic: false,
		eclipses: false,
		lots: false,
		stars: false,
		evolutionary: false,
	},
};

function body(overrides: Partial<ChartBody> = {}): ChartBody {
	return {
		lon: 0,
		speed: 1,
		retrograde: false,
		sign: "Aries",
		signDeg: 0,
		lat: 0,
		dist: 1,
		ra: 0,
		dec: 0,
		house: 1,
		dignities: [],
		...overrides,
	};
}

type ChartOverrides = Omit<Partial<Chart>, "bodies"> & {
	bodies?: Record<string, ChartBody | undefined>;
};

function chart(overrides: ChartOverrides = {}): Chart {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	const { bodies: overrideBodies, ...rest } = overrides;
	return {
		jdUt: 2448053.2708,
		zodiac: "tropical",
		houseSystem: "placidus",
		houseSystemRequested: "placidus",
		unavailable: [],
		angles: {
			asc: 100.123456,
			mc: 250.987654,
			vertex: 45.111111,
			eastPoint: 200.222222,
		},
		cusps: [100.123, 130.456, 160.789],
		aspects: [
			{
				a: "sun",
				b: "moon",
				aspect: "trine",
				orb: 0.1234567,
				phase: "applying",
				strength: 0.876543,
			},
		],
		...rest,
		bodies: {
			...defaults,
			chiron: undefined,
			...(overrideBodies ?? {}),
		} as Chart["bodies"],
	} as Chart;
}

describe("formatChart", () => {
	test("formats chart output with rounded projections and summary counts", () => {
		const out = formatChart(
			chart({
				bodies: {
					sun: body({
						lon: 79.611345,
						sign: "Gemini",
						signDeg: 19.611345,
						dist: 1.01531234,
						ra: 78.6998123,
						dec: 23.0353123,
						house: 9,
					}),
					chiron: undefined,
				},
			}),
			request,
		);

		const sun = out.chart.bodies.sun as {
			lon: number;
			sign: string;
			signDeg: number;
			house: number;
			dist: number | null;
		};
		expect(sun.lon).toBe(79.6113);
		expect(sun.sign).toBe("Gemini");
		expect(sun.signDeg).toBe(19.6113);
		expect(sun.house).toBe(9);
		expect(sun.dist).toBe(1.0153);
		expect(out.chart.bodies.chiron).toBeUndefined();

		expect(out.chart.angles.asc).toEqual({
			lon: 100.1235,
			sign: "Cancer",
			signDeg: 10.1235,
		});
		expect(out.chart.cusps).toHaveLength(3);
		expect(out.chart.cusps[0]).toEqual({
			lon: 100.123,
			sign: "Cancer",
			signDeg: 10.123,
		});
		expect(out.chart.aspects[0]).toEqual({
			a: "sun",
			b: "moon",
			aspect: "trine",
			orb: 0.1235,
			phase: "applying",
			strength: 0.877,
		});

		expect(out.chart.birth.year).toBe(1990);
		expect(out.chart.birth.zone).toBe("America/New_York");
		expect(out.chart.birth.status).toBe("ok");
		expect(out.chart.birth.requested).toEqual(request.options);

		expect(out.summary).toEqual({
			bodies: BODIES.length - 1,
			aspects: 1,
			applying: 1,
			separating: 0,
			exact: 0,
		});
		expect(out.help).toBeUndefined();
	});

	test("maps cusp longitudes onto signs at boundaries", () => {
		const out = formatChart(chart({ cusps: [0, 30, 360] }), request);
		expect(out.chart.cusps.map((c) => c.sign)).toEqual([
			"Aries",
			"Taurus",
			"Aries",
		]);
		expect(out.chart.cusps.map((c) => c.signDeg)).toEqual([0, 0, 0]);
	});

	test("reports house fallback and unavailable bodies in help", () => {
		const out = formatChart(
			chart({
				houseSystem: "whole_sign",
				houseSystemRequested: "placidus",
				unavailable: ["chiron"],
			}),
			request,
		);

		expect(out.help).toEqual([
			'House system "placidus" fell back to "whole_sign" (undefined above the polar circle)',
			"Bodies omitted (outside fitted ephemeris range): chiron",
		]);
	});

	test("AstrologicalFormatter provides object-oriented projection seam", () => {
		const { AstrologicalFormatter } = require("../../src/cli/output");
		const formatter = new AstrologicalFormatter();
		const out = formatter.format(chart(), request);
		expect(out.summary.bodies).toBeDefined();
		expect(out.chart.meta.houseSystem).toBe("placidus");
	});
});
