import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import { toDraconicChart } from "../../src/core/classical";
import {
	project,
	roundOrb,
	roundSeparation,
	roundSpeed,
	roundStrength,
	roundToon,
	TOON_LON_DIGITS,
	TOON_ORB_DIGITS,
	TOON_SEPARATION_DIGITS,
	TOON_SPEED_DIGITS,
	TOON_STRENGTH_DIGITS,
} from "../../src/core/projection";

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

function mockChart(chartOverrides: ChartOverrides = {}): Chart {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	const { bodies: overrideBodies, ...rest } = chartOverrides;
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
		cusps: [100.123, 130.456],
		aspects: [],
		...rest,
		bodies: {
			...defaults,
			chiron: undefined,
			...(overrideBodies ?? {}),
		} as Chart["bodies"],
	} as Chart;
}

describe("chart projection — precision policy (ADR-0011)", () => {
	test("names the TOON precision constants", () => {
		expect(TOON_LON_DIGITS).toBe(4);
		expect(TOON_SPEED_DIGITS).toBe(6);
		expect(TOON_ORB_DIGITS).toBe(4);
		expect(TOON_STRENGTH_DIGITS).toBe(3);
		expect(TOON_SEPARATION_DIGITS).toBe(2);
	});

	test("rounds with the named helpers", () => {
		expect(roundToon(204.3456783846121)).toBe(204.3457);
		expect(roundSpeed(0.012345678)).toBe(0.012346);
		expect(roundOrb(0.1234567)).toBe(0.1235);
		expect(roundStrength(0.876543)).toBe(0.877);
		expect(roundSeparation(73.444444)).toBe(73.44);
	});
});

describe("chart projection — published mapping", () => {
	test("maps bodies, angles, cusps and aspects with the policy", () => {
		const chart = mockChart({
			jdUt: 2448053.27081234,
			angles: {
				asc: 100.123456,
				mc: 250.987654,
				vertex: 45.111111,
				eastPoint: 200.222222,
			},
			cusps: [100.123456, 130.456789],
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
			bodies: {
				pluto: body({
					lon: 230.1234567,
					sign: "Scorpio",
					signDeg: 20.1234567,
					speed: 0.01234567,
					lat: -3.123456,
					dist: 30.123456,
					ra: 228.123456,
					dec: -20.123456,
				}),
			},
		});

		const out = project({ chart, bodies: chart.bodies });

		expect(out.meta.jdUt).toBe(2448053.2708);
		expect(out.meta.zodiac).toBe("tropical");

		const pluto = out.bodies.pluto;
		expect(pluto?.lon).toBe(230.1235);
		expect(pluto?.signDeg).toBe(20.1235);
		expect(pluto?.speed).toBe(0.012346);
		expect(pluto?.lat).toBe(-3.1235);
		expect(pluto?.dist).toBe(30.1235);
		expect(pluto?.ra).toBe(228.1235);
		expect(pluto?.dec).toBe(-20.1235);

		expect(out.angles.asc).toEqual({
			lon: 100.1235,
			sign: "Cancer",
			signDeg: 10.1235,
		});
		expect(out.cusps).toEqual([
			{ lon: 100.1235, sign: "Cancer", signDeg: 10.1235 },
			{ lon: 130.4568, sign: "Leo", signDeg: 10.4568 },
		]);
		expect(out.aspects[0]).toEqual({
			a: "sun",
			b: "moon",
			aspect: "trine",
			orb: 0.1235,
			phase: "applying",
			strength: 0.877,
		});
	});

	test("omits undefined bodies and honors a null distance", () => {
		const chart = mockChart({
			bodies: { chiron: undefined, sun: body({ dist: null }) },
		});
		const out = project({ chart, bodies: chart.bodies });
		expect(out.bodies.chiron).toBeUndefined();
		expect(out.bodies.sun?.dist).toBeNull();
	});

	test("projects the draconic chart through the same mapping", () => {
		const chart = mockChart({
			bodies: {
				true_node: body({ lon: 230, sign: "Scorpio", signDeg: 20 }),
				pluto: body({
					lon: 233.1234567,
					sign: "Scorpio",
					signDeg: 23.1234567,
					speed: 0.02,
				}),
			},
		});

		const draconic = toDraconicChart(chart);
		const out = project({ chart, bodies: chart.bodies, draconic });

		expect(out.draconic?.nodeUsed).toBe("true_node");
		const pluto = out.draconic?.bodies.pluto;
		expect(pluto?.lon).toBe(3.1235);
		expect(pluto?.sign).toBe("Aries");
		expect(pluto?.signDeg).toBe(3.1235);
		expect(pluto?.speed).toBe(0.02);
	});
});
