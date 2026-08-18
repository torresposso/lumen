import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import {
	CaelusEphemeris,
	type Ephemeris,
} from "../../src/adapters/ephemeris-gateway";
import { DRACONIC_FRAME_DISCLOSURE } from "../../src/core/classical";
import { describeEvoCriteria } from "../../src/core/evo-criteria";
import {
	type AstrologicalReading,
	computeReading,
} from "../../src/core/reading";
import type { NatalRequest } from "../../src/core/types";

// Deterministic caelus stand-ins: chartAt always returns the same natal chart,
// so the draconic recalculated evo can be exercised directly.
const fullCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const ECLIPSE_TMAX = 2448053.2708 - 10;
const BIRTH = {
	jdUt: 2448053.2708,
	lat: 27.95,
	lon: -82.46,
	local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
	zone: "America/New_York",
	offsetMinutes: -240,
	dst: true,
	status: "ok",
} as const;

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

/** Natal chart with pluto at 230 and the true node at `nodeLon` (both from
 *  Scorpio; sun/moon default to Aries/0°). `chartAt` returns the eclipse
 *  snapshot (sun at `eclipseSunLon`) only at `ECLIPSE_TMAX`. */
function draconicEvoEphemeris(
	nodeLon: number,
	eclipseSunLon?: number,
): Ephemeris {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	const natalBodies = {
		...defaults,
		chiron: undefined,
		pluto: body({
			lon: 230,
			sign: "Scorpio",
			signDeg: 20,
			speed: 0.02,
		}),
		true_node: body({
			lon: nodeLon,
			sign: "Scorpio",
			signDeg: nodeLon - 210,
			speed: -0.05,
		}),
	} as Chart["bodies"];
	const natalChart = {
		jdUt: BIRTH.jdUt,
		zodiac: "tropical",
		houseSystem: "placidus",
		houseSystemRequested: "placidus",
		unavailable: [],
		angles: { asc: 100, mc: 250, vertex: 45, eastPoint: 200 },
		cusps: fullCusps,
		aspects: [],
		bodies: natalBodies,
	} as Chart;

	return {
		chartAt: (jd: number) => {
			if (jd === ECLIPSE_TMAX && eclipseSunLon !== undefined) {
				return {
					...natalChart,
					bodies: {
						...natalBodies,
						sun: body({ lon: eclipseSunLon, sign: "Aries" }),
					},
				} as Chart;
			}
			return natalChart;
		},
		solarEclipses: () =>
			eclipseSunLon === undefined
				? []
				: [{ tMax: ECLIPSE_TMAX, type: "solar" }],
		lunarEclipses: () => [],
	} as unknown as Ephemeris;
}

function draconicRequest(): NatalRequest {
	return {
		birth: BIRTH,
		options: {
			houseSystem: "placidus",
			zodiac: "tropical",
			bodies: [],
			topocentric: false,
			draconic: true,
		},
	};
}

/** The draconic request guarantees the projected draconic section and its pluto. */
function draconicPluto(reading: AstrologicalReading) {
	const pluto = reading.chart.draconic?.bodies.pluto;
	if (pluto === undefined) {
		throw new Error("expected the draconic pluto");
	}
	return pluto;
}

describe("computeReading draconic evo (ADR-0014)", () => {
	test("publishes the fixed nodal axis by construction for any natal node", () => {
		// Arbitrary natal node longitude: the draconic axis is constant.
		const ephemeris = draconicEvoEphemeris(123.456);
		const reading = computeReading(draconicRequest(), ephemeris);

		expect(reading.evo.nodalAxis.north.sign).toBe("Aries");
		expect(reading.evo.nodalAxis.north.lon).toBe(0);
		expect(reading.evo.nodalAxis.north.signDeg).toBe(0);
		expect(reading.evo.nodalAxis.south.sign).toBe("Libra");
		expect(reading.evo.nodalAxis.south.lon).toBe(180);
		expect(reading.evo.nodalAxis.south.signDeg).toBe(0);
	});

	test("recalculates pluto over the draconic zodiac (bodies shifted by the node)", () => {
		const nodeLon = 123.456;
		const ephemeris = draconicEvoEphemeris(nodeLon);
		const reading = computeReading(draconicRequest(), ephemeris);

		// Pluto at 230, node at 123.456 → draconic pluto at 106.544.
		const expectedPlutoLon = Number((230 - nodeLon).toFixed(4));
		expect(reading.evo.pluto.lon).toBe(expectedPlutoLon);
		expect(reading.evo.pluto.sign).toBe(draconicPluto(reading).sign);
		// The separation is frame-independent (both shifted identically) and
		// still uses the true node as reference (2 dp, ADR-0011).
		expect(reading.evo.ppp.separation).toBe(106.54);
	});

	test("projects the prenatal eclipses by the same North-Node subtraction", () => {
		const nodeLon = 123.456;
		const eclipseSunLon = 45;
		const ephemeris = draconicEvoEphemeris(nodeLon, eclipseSunLon);
		const reading = computeReading(draconicRequest(), ephemeris);

		const solar = reading.evo.prenatalEclipses.solar;
		expect(solar).toBeDefined();
		expect(solar?.lon).toBeCloseTo(
			Number(((((eclipseSunLon - nodeLon) % 360) + 360) % 360).toFixed(4)),
			4,
		);
	});

	test("declares the draconic frame and its constants in method", () => {
		const ephemeris = draconicEvoEphemeris(130);
		const reading = computeReading(draconicRequest(), ephemeris);

		expect(reading.evo.method).toBe(
			`${describeEvoCriteria()}; ${DRACONIC_FRAME_DISCLOSURE}`,
		);
	});

	test("the natal window does not declare the draconic frame", () => {
		const ephemeris = draconicEvoEphemeris(130);
		const natalRequest = {
			...draconicRequest(),
			options: { ...draconicRequest().options, draconic: false },
		};
		const reading = computeReading(natalRequest, ephemeris);

		expect(reading.evo.method).toBe(describeEvoCriteria());
		expect(reading.evo.nodalAxis.north.sign).toBe("Scorpio");
	});
});

describe("computeReading draconic evo (caelus integration)", () => {
	test("the reading carries the recalculated evo on the draconic zodiac", () => {
		const reading = computeReading(draconicRequest(), new CaelusEphemeris());

		// Axis fixed by construction.
		expect(reading.evo.nodalAxis.north.sign).toBe("Aries");
		expect(reading.evo.nodalAxis.north.lon).toBe(0);
		expect(reading.evo.nodalAxis.south.sign).toBe("Libra");
		expect(reading.evo.nodalAxis.south.lon).toBe(180);

		// Pluto/PPP live on the draconic zodiac and agree with the projection.
		expect(reading.evo.pluto.sign).toBe(draconicPluto(reading).sign);
		expect(reading.evo.pluto.lon).toBe(draconicPluto(reading).lon);

		// Frame disclosure present; the axis atoms reflect Aries/Libra (ruler
		// mars for the fixed north node at 0° Aries).
		expect(reading.evo.method).toContain("draconic frame");
		expect(reading.interpretationContext.atoms).toContain(
			"north_node_ruler_mars",
		);
	});
});
