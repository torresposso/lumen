import { describe, expect, test } from "bun:test";
import type { Chart, ChartBody } from "caelus";
import { BODIES } from "caelus";
import type { ChartRequestOptions, ResolvedBirth } from "../../src/cli/intake";
import { CaelusEphemeris } from "../../src/core/ephemeris";
import { applyExtensions } from "../../src/core/extensions";

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

const baseOptions: ChartRequestOptions = {
	houseSystem: "placidus",
	zodiac: "tropical",
	node: "both",
	bodies: [],
	topocentric: false,
	draconic: false,
	eclipses: false,
	lots: false,
	stars: false,
	evolutionary: false,
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

describe("applyExtensions", () => {
	const ephemeris = new CaelusEphemeris();

	test("does not add extensions when options are false", () => {
		const res = applyExtensions(ephemeris, chart(), birth, baseOptions);
		expect(res.eclipses).toBeUndefined();
		expect(res.lots).toBeUndefined();
		expect(res.stars).toBeUndefined();
	});

	test("computes prenatal eclipses when requested", () => {
		const res = applyExtensions(ephemeris, chart(), birth, {
			...baseOptions,
			eclipses: true,
		});
		expect(res.eclipses).toBeDefined();
		expect(res.eclipses?.solar).toBeDefined();
		expect(res.eclipses?.lunar).toBeDefined();
		if (res.eclipses?.solar) {
			expect(res.eclipses.solar.house).toBeGreaterThanOrEqual(1);
			expect(res.eclipses.solar.house).toBeLessThanOrEqual(12);
		}
	});

	test("computes Hermetic Lots when requested", () => {
		const res = applyExtensions(ephemeris, chart(), birth, {
			...baseOptions,
			lots: true,
		});
		expect(res.lots).toBeDefined();
		expect(typeof res.lots?.spirit.lon).toBe("number");
		expect(typeof res.lots?.spirit.sign).toBe("string");
		expect(typeof res.lots?.spirit.house).toBe("number");
		expect(typeof res.lots?.fortune.lon).toBe("number");
		expect(typeof res.lots?.fortune.sign).toBe("string");
		expect(typeof res.lots?.fortune.house).toBe("number");
	});

	test("computes fixed star matches when requested", () => {
		const res = applyExtensions(ephemeris, chart(), birth, {
			...baseOptions,
			stars: true,
		});
		expect(res.stars).toBeDefined();
		expect(Array.isArray(res.stars)).toBe(true);
		if (res.stars && res.stars.length > 0) {
			const match = res.stars[0];
			expect(match).toHaveProperty("star");
			expect(match).toHaveProperty("body");
			expect(match).toHaveProperty("orb");
			expect(match).toHaveProperty("sign");
		}
	});
});
