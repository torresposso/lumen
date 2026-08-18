import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import { describeEvoCriteria } from "../../src/core/classical";
import { computeEvolutionaryReading } from "../../src/core/evolutionary-reading";
import type { Ephemeris } from "../../src/core/types";

// Reuses the verified mock ephemeris from tests/core/output-projection.test.ts:
// a deterministic caelus stand-in whose `chartAt` always returns the same chart,
// so the evolutionary assembly can be exercised directly (not only through the engine).
const fullCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

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
		cusps: fullCusps,
		aspects: [],
		...rest,
		bodies: {
			...defaults,
			chiron: undefined,
			...(overrideBodies ?? {}),
		} as Chart["bodies"],
	} as Chart;

	return {
		chartAt: (_jdUt: number, _lat: number, _lonEast: number) => mockChart,
		solarEclipses: () => [],
		lunarEclipses: () => [],
	} satisfies Ephemeris;
}

const birth = {
	jdUt: 2448053.2708,
	lat: 27.95,
	lon: -82.46,
	local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
	zone: "America/New_York",
	offsetMinutes: -240,
	dst: true,
	status: "ok" as const,
};

// Pulls the deterministic body map + cusps out of the verified mock ephemeris.
function mockChart(bodies: Record<string, ChartBody | undefined>) {
	const ephemeris = createMockEphemeris({
		cusps: fullCusps,
		bodies,
	});
	const chart = ephemeris.chartAt(0, 0, 0);
	return { ephemeris, bodies: chart.bodies, cusps: chart.cusps };
}

describe("computeEvolutionaryReading (direct assembly)", () => {
	test("deactivates ppp with the measured separation and a derived reason", () => {
		const { ephemeris, bodies, cusps } = mockChart({
			pluto: body({
				lon: 230,
				sign: "Scorpio",
				signDeg: 20.123456,
				speed: 0.02,
			}),
			true_node: body({
				lon: 232,
				sign: "Scorpio",
				signDeg: 22,
				speed: -0.05,
			}),
		});

		const reading = computeEvolutionaryReading({
			bodies,
			cusps,
			ephemeris,
			birth,
			houseSystem: "placidus",
			topocentric: false,
		});

		// ppp reflects the measured (rounded) Pluto–North Node separation.
		expect(reading.evo.ppp.active).toBe(false);
		expect(reading.evo.ppp.separation).toBe(2);
		expect(reading.evo.ppp.reason).toBe(
			"pluto conjunct north node (separation 2° <= 10°)",
		);
		expect(reading.atoms).toContain("ppp_inactive");

		// counts aggregate once and stay consistent with the published aspects.
		expect(reading.evo.counts.plutoAspects).toBe(
			reading.evo.pluto.aspects.length,
		);
		expect(reading.evo.method).toBe(describeEvoCriteria());

		// rulerPlacement is published WITHOUT the core `description` field
		// (decision 5): the agent reads structured fields only.
		expect(reading.evo.nodalAxis.north.rulerPlacement).toBeDefined();
		expect(reading.evo.nodalAxis.north.rulerPlacement).not.toHaveProperty(
			"description",
		);
		expect(reading.evo.nodalAxis.south.rulerPlacement).not.toHaveProperty(
			"description",
		);

		// rulerPlacement.signDeg is explicitly routed through the chart-projection
		// policy (ADR-0011). Core already produced 4 dp, so this pins the published
		// surface via the named helper, not a byte change.
		expect(reading.evo.nodalAxis.north.rulerPlacement?.signDeg).toBe(20.1235);

		// phase is derived from sun/moon (both default to Aries/0° → "New").
		expect(reading.evo.phase).toBe("New");
		expect(reading.atoms).toContain("sol_luna_phase_new");
	});

	test("keeps ppp active with the measured separation when Pluto is far from the node", () => {
		const { ephemeris, bodies, cusps } = mockChart({
			pluto: body({
				lon: 230,
				sign: "Scorpio",
				signDeg: 20,
				speed: 0.02,
			}),
			true_node: body({
				lon: 130,
				sign: "Leo",
				signDeg: 10,
				speed: -0.05,
			}),
		});

		const reading = computeEvolutionaryReading({
			bodies,
			cusps,
			ephemeris,
			birth,
			houseSystem: "placidus",
			topocentric: false,
		});

		expect(reading.evo.ppp.active).toBe(true);
		expect(reading.evo.ppp.separation).toBe(100);
		expect(reading.evo.ppp.reason).toBeUndefined();
		expect(reading.atoms).toContain("ppp_active");
	});

	test("throws on the missing-input branch (no pluto) — the invariant is contractual", () => {
		const { ephemeris, bodies, cusps } = mockChart({
			pluto: undefined,
			true_node: body({
				lon: 232,
				sign: "Scorpio",
				signDeg: 22,
				speed: -0.05,
			}),
		});

		expect(() =>
			computeEvolutionaryReading({
				bodies,
				cusps,
				ephemeris,
				birth,
				houseSystem: "placidus",
				topocentric: false,
			}),
		).toThrow(/must carry pluto and the true node/);
	});

	test("throws on the missing-input branch (no node bodies) — the invariant is contractual", () => {
		const { ephemeris, bodies, cusps } = mockChart({
			pluto: body({
				lon: 230,
				sign: "Scorpio",
				signDeg: 20,
				speed: 0.02,
			}),
			true_node: undefined,
			mean_node: undefined,
		});

		expect(() =>
			computeEvolutionaryReading({
				bodies,
				cusps,
				ephemeris,
				birth,
				houseSystem: "placidus",
				topocentric: false,
			}),
		).toThrow(/must carry pluto and the true node/);
	});
});
