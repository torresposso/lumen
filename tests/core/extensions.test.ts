import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import type { ResolvedBirth } from "../../src/cli/intake";
import { CaelusEphemeris } from "../../src/core/ephemeris";
import {
	computeFixedStarMatches,
	computeHermeticLots,
	computePrenatalEclipses,
} from "../../src/core/extensions";

const birth: ResolvedBirth = {
	jdUt: 2448053.2708,
	lat: 27.95,
	lon: -82.46,
	local: { year: 1990, month: 6, day: 10, hour: 14, minute: 30 },
	zone: "America/New_York",
	offsetMinutes: -240,
	dst: true,
	status: "ok",
};

function body(): ChartBody {
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
	};
}

function chart(): Chart {
	const defaults = Object.fromEntries(BODIES.map((id) => [id, body()]));
	return {
		jdUt: birth.jdUt,
		zodiac: "tropical",
		houseSystem: "placidus",
		houseSystemRequested: "placidus",
		bodies: defaults as Chart["bodies"],
		unavailable: [],
		angles: { asc: 0, mc: 90, vertex: 180, eastPoint: 270 },
		cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
		aspects: [],
	};
}

describe("pure extension calculators", () => {
	const ephemeris = new CaelusEphemeris();
	const baseChart = chart();

	test("computes prenatal eclipses when requested", () => {
		const eclipses = computePrenatalEclipses(
			ephemeris,
			birth,
			baseChart.cusps,
			"placidus",
		);
		expect(eclipses).toBeDefined();
		expect(eclipses.solar).toBeDefined();
		expect(eclipses.lunar).toBeDefined();
		if (eclipses.solar) {
			expect(eclipses.solar.house).toBeGreaterThanOrEqual(1);
			expect(eclipses.solar.house).toBeLessThanOrEqual(12);
		}
	});

	test("computes Hermetic Lots when requested", () => {
		const lots = computeHermeticLots(ephemeris, birth, baseChart.cusps);
		expect(lots).toBeDefined();
		expect(typeof lots.spirit.lon).toBe("number");
		expect(typeof lots.spirit.sign).toBe("string");
		expect(typeof lots.spirit.house).toBe("number");
		expect(typeof lots.fortune.lon).toBe("number");
		expect(typeof lots.fortune.sign).toBe("string");
		expect(typeof lots.fortune.house).toBe("number");
	});

	test("computes fixed star matches when requested", () => {
		const stars = computeFixedStarMatches(ephemeris, birth, baseChart.bodies);
		expect(stars).toBeDefined();
		expect(Array.isArray(stars)).toBe(true);
		if (stars.length > 0) {
			const match = stars[0];
			expect(match).toHaveProperty("star");
			expect(match).toHaveProperty("body");
			expect(match).toHaveProperty("orb");
			expect(match).toHaveProperty("sign");
		}
	});
});
