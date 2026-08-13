import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import type { NatalRequest } from "./intake";
import { echoBirth, project, renderChart } from "./output";

const request: NatalRequest = {
	birth: {
		jdUt: 2448053.2708,
		lat: 27.95,
		lon: -82.46,
		local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30, second: 0 },
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

/** Typed fixture builder: fills every default body so tests construct real
 *  `Chart` values through the interface — no per-test casts. */
function chart(overrides: ChartOverrides = {}): Chart {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	return {
		jdUt: 2448053.2708,
		zodiac: "tropical",
		houseSystem: "placidus",
		houseSystemRequested: "placidus",
		bodies: {
			...defaults,
			chiron: undefined,
			...overrides.bodies,
		} as Chart["bodies"],
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
		...overrides,
	} as Chart;
}

describe("project", () => {
	test("projects bodies with rounding and drops undefined bodies", () => {
		const out = project(
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
		);

		const sun = out.bodies.sun as {
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
		expect(out.bodies.chiron).toBeUndefined();
	});

	test("projects angles, cusps and aspects", () => {
		const out = project(chart());

		expect(out.angles.asc).toEqual({
			lon: 100.1235,
			sign: "Cancer",
			signDeg: 10.1235,
		});
		expect(out.cusps).toHaveLength(3);
		expect(out.cusps[0]).toEqual({
			lon: 100.123,
			sign: "Cancer",
			signDeg: 10.123,
		});
		expect(out.aspects[0]).toEqual({
			a: "sun",
			b: "moon",
			aspect: "trine",
			orb: 0.1235,
			phase: "applying",
			strength: 0.877,
		});
	});

	test("maps cusp longitudes onto signs at the boundaries", () => {
		const out = project(chart({ cusps: [0, 30, 360] }));
		expect(out.cusps.map((c) => c.sign)).toEqual(["Aries", "Taurus", "Aries"]);
		expect(out.cusps.map((c) => c.signDeg)).toEqual([0, 0, 0]);
	});
});

describe("echoBirth", () => {
	test("echoes the resolved birth and a copy of the requested options", () => {
		const out = echoBirth(request.birth, request.options);

		expect(out.year).toBe(1990);
		expect(out.zone).toBe("America/New_York");
		expect(out.status).toBe("ok");
		expect(out.requested).toEqual(request.options);
	});
});

describe("renderChart", () => {
	test("composes projection, echo and summary counts", () => {
		const out = renderChart(chart(), request);

		expect(out.chart.birth.year).toBe(1990);
		expect(out.chart.birth.requested).toEqual(request.options);
		expect(out.summary).toEqual({
			bodies: BODIES.length - 1, // chiron is undefined in the fixture and dropped
			aspects: 1,
			applying: 1,
			separating: 0,
			exact: 0,
		});
		expect(out.help).toBeUndefined();
	});

	test("reports the house fallback and unavailable bodies as help", () => {
		const out = renderChart(
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
});
