import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody, StarEntry } from "caelus";
import { BODIES } from "caelus";
import type { Ephemeris } from "../../src/adapters/ephemeris-gateway";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import type { ResolvedBirth } from "../../src/commands/client";
import {
	computeFixedStarMatches,
	computeHermeticLots,
} from "../../src/core/classical";

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

describe("classical extension calculators", () => {
	const ephemeris = new CaelusEphemeris();
	const baseChart = chart();

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

	test("filters fixed stars to major magnitudes and includes angles", () => {
		const bright: StarEntry = {
			ra: 0,
			dec: 0,
			pmra: 0,
			pmdec: 0,
			rv: 0,
			plx: 0,
			mag: 1,
			bayer: "",
		};
		const faint: StarEntry = { ...bright, mag: 5 };
		const mockEphemeris = {
			chartAt: () => baseChart,
			solarEclipses: () => [],
			lunarEclipses: () => [],
			lots: () => ({
				day: true,
				fortune: 0,
				spirit: 0,
				eros: 0,
				necessity: 0,
				courage: 0,
				victory: 0,
				nemesis: 0,
			}),
			starLongitude: () => 0,
			fixedStars: () => ({ Bright: bright, Faint: faint }),
		} satisfies Ephemeris;

		const stars = computeFixedStarMatches(
			mockEphemeris,
			birth,
			{ sun: body() },
			{ asc: 0, mc: 90, vertex: 180, eastPoint: 270 },
		);

		expect(stars.map((s) => s.star)).toEqual(["Bright", "Bright"]);
		expect(new Set(stars.map((s) => s.body))).toEqual(new Set(["sun", "asc"]));
		expect(stars.every((s) => s.orb === 0)).toBe(true);
	});
});
