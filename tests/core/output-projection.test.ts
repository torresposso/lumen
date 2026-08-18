import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import type { NatalRequest } from "../../src/commands/intake";
import { describeEvoCriteria } from "../../src/core/evo-criteria";
import { computeReading } from "../../src/core/reading";

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
		bodies: ["mean_lilith"],
		topocentric: false,
		draconic: false,
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

function createMockEphemeris(chartOverrides: ChartOverrides = {}) {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	const { bodies: overrideBodies, ...rest } = chartOverrides;
	const mockChart = {
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

	return {
		chartAt: () => mockChart,
		solarEclipses: () => [],
		lunarEclipses: () => [],
	};
}

describe("computeReading Output Projection", () => {
	test("formats chart output with rounded projections and summary counts", () => {
		const mockEphemeris = createMockEphemeris({
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
		});

		const out = computeReading(request, mockEphemeris);

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
			bodies: BODIES.length - 2,
			aspects: 1,
			applying: 1,
			separating: 0,
			exact: 0,
		});
		expect(out.help).toBeUndefined();
	});

	test("maps cusp longitudes onto signs at boundaries", () => {
		const mockEphemeris = createMockEphemeris({ cusps: [0, 30, 360] });
		const out = computeReading(request, mockEphemeris);
		expect(out.chart.cusps.map((c) => c.sign)).toEqual([
			"Aries",
			"Taurus",
			"Aries",
		]);
		expect(out.chart.cusps.map((c) => c.signDeg)).toEqual([0, 0, 0]);
	});

	test("reports house fallback and unavailable bodies in help", () => {
		const mockEphemeris = createMockEphemeris({
			houseSystem: "whole_sign",
			houseSystemRequested: "placidus",
			unavailable: ["chiron"],
		});
		const out = computeReading(request, mockEphemeris);

		expect(out.help).toEqual([
			'House system "placidus" fell back to "whole_sign" (undefined above the polar circle)',
			"Bodies omitted (outside fitted ephemeris range): chiron",
		]);
	});
});

describe("computeReading evo block (mock ephemeris)", () => {
	const fullCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

	function evoEphemeris(plutoLon: number, nodeLon: number) {
		return createMockEphemeris({
			cusps: fullCusps,
			bodies: {
				pluto: body({
					lon: plutoLon,
					sign: "Scorpio",
					signDeg: plutoLon - 210,
					speed: 0.02,
				}),
				true_node: body({
					lon: nodeLon,
					signDeg: nodeLon - 210,
					speed: -0.05,
				}),
			},
		});
	}

	test("deactivates ppp with the measured separation and a derived reason", () => {
		const out = computeReading(request, evoEphemeris(230, 232));
		expect(out.evo.ppp.active).toBe(false);
		expect(out.evo.ppp.separation).toBe(2);
		expect(out.evo.ppp.reason).toBe(
			"pluto conjunct north node (separation 2° <= 10°)",
		);
		expect(out.interpretationContext.atoms).toContain("ppp_inactive");
		expect(out.evo.method).toBe(describeEvoCriteria());
	});

	test("keeps ppp active with the measured separation when Pluto is far from the node", () => {
		const out = computeReading(request, evoEphemeris(230, 130));
		expect(out.evo.ppp.active).toBe(true);
		expect(out.evo.ppp.separation).toBe(100);
		expect(out.evo.ppp.reason).toBeUndefined();
		expect(out.interpretationContext.atoms).toContain("ppp_active");
		// counts aggregates once and stays consistent with the published aspects.
		expect(out.evo.counts.plutoAspects).toBe(out.evo.pluto.aspects.length);
	});

	test("cleans the mean node once: the evo path reads the same canon as the chart", () => {
		const out = computeReading(request, evoEphemeris(230, 130));
		expect(out.evo).toBeDefined();
		expect(out.chart.bodies.mean_node).toBeUndefined();
	});
});
