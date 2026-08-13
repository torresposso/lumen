import { describe, expect, test } from "bun:test";
import type { NatalRequest } from "../../src/cli/intake";
import { AstrologicalEngine } from "../../src/core/chart-engine";

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
		bodies: [],
		topocentric: false,
		draconic: false,
		eclipses: false,
		lots: false,
		stars: false,
		evolutionary: false,
	},
};

describe("AstrologicalEngine", () => {
	const engine = new AstrologicalEngine();

	test("computes an astrological reading with the embedded engine", () => {
		const reading = engine.compute(request);
		expect(reading.chart.bodies.sun?.sign).toBe("Gemini");
		expect(reading.chart.bodies.sun?.house).toBe(9);
		expect(reading.chart.meta.houseSystem).toBe("placidus");
	});

	test("keeps both nodes when node is both", () => {
		const reading = engine.compute(request);
		expect(reading.chart.bodies.mean_node).toBeDefined();
		expect(reading.chart.bodies.true_node).toBeDefined();
	});

	test("drops the true node when node is mean", () => {
		const reading = engine.compute({
			...request,
			options: { ...request.options, node: "mean" },
		});
		expect(reading.chart.bodies.mean_node).toBeDefined();
		expect(reading.chart.bodies.true_node).toBeUndefined();
	});

	test("drops the mean node when node is true", () => {
		const reading = engine.compute({
			...request,
			options: { ...request.options, node: "true" },
		});
		expect(reading.chart.bodies.true_node).toBeDefined();
		expect(reading.chart.bodies.mean_node).toBeUndefined();
	});

	test("computes requested extra bodies", () => {
		const reading = engine.compute({
			...request,
			options: { ...request.options, bodies: ["mean_lilith"] },
		});
		expect(reading.chart.bodies.mean_lilith).toBeDefined();
	});

	test("computes a draconic chart by shifting longitudes to align North Node to 0 Aries", () => {
		const draconicReading = engine.compute({
			...request,
			options: { ...request.options, draconic: true },
		});
		expect(draconicReading.chart.bodies.true_node?.lon).toBeCloseTo(0, 4);
		expect(draconicReading.chart.bodies.true_node?.sign).toBe("Aries");
		expect(draconicReading.chart.bodies.true_node?.signDeg).toBeCloseTo(0, 4);
	});

	test("computes evolutionary features (--eclipses, --lots, --stars)", () => {
		const reading = engine.compute({
			...request,
			options: { ...request.options, eclipses: true, lots: true, stars: true },
		});
		expect(reading.chart.eclipses?.solar).toBeDefined();
		expect(reading.chart.eclipses?.lunar).toBeDefined();
		expect(reading.chart.lots?.spirit).toBeDefined();
		expect(reading.chart.lots?.fortune).toBeDefined();
		expect(Array.isArray(reading.chart.stars)).toBe(true);
	});

	test("computes evolutionary module (--evolutionary)", () => {
		const reading = engine.compute({
			...request,
			options: { ...request.options, evolutionary: true },
		});
		const evo = reading.chart.evolutionary;
		expect(evo).toBeDefined();
		expect(evo?.pluto?.sign).toBeDefined();
		expect(evo?.polarityPoint?.sign).toBe("Taurus");
		expect(evo?.nodes.northNode).toBeDefined();
		expect(evo?.nodes.southNode).toBeDefined();
		expect(Array.isArray(evo?.skippedSteps)).toBe(true);
	});

	test("AstrologicalEngine accepts a custom Ephemeris seam", () => {
		const mockEphemeris = {
			chartAt: () => ({
				jdUt: request.birth.jdUt,
				zodiac: "tropical",
				houseSystem: "placidus",
				houseSystemRequested: "placidus",
				unavailable: [],
				bodies: {
					sun: {
						lon: 79.5,
						sign: "Gemini",
						signDeg: 19.5,
						house: 9,
						retrograde: false,
						speed: 0.95,
						lat: 0,
						dist: 1,
						ra: 78,
						dec: 23,
						dignities: [],
					},
					true_node: {
						lon: 280,
						sign: "Capricorn",
						signDeg: 10,
						house: 4,
						retrograde: true,
						speed: -0.05,
						lat: 0,
						dist: null,
						ra: 280,
						dec: -23,
						dignities: [],
					},
				},
				angles: { asc: 180, mc: 90, vertex: 200, eastPoint: 175 },
				cusps: [180, 210, 240, 270, 300, 330, 0, 30, 60, 90, 120, 150],
				aspects: [],
			}),
			solarEclipses: () => [],
			lunarEclipses: () => [],
			lots: () => ({
				day: true,
				fortune: 234,
				spirit: 123,
				eros: 0,
				necessity: 0,
				courage: 0,
				victory: 0,
				nemesis: 0,
			}),
			starLongitude: () => 0,
			fixedStars: () => ({}),
		};

		const customEngine = new AstrologicalEngine(mockEphemeris);
		const reading = customEngine.compute(request);
		expect(reading.chart.bodies.sun?.sign).toBe("Gemini");
	});

	test("extension features flow through the Ephemeris seam (no concrete Engine)", () => {
		const mockEphemeris = {
			chartAt: () => ({
				jdUt: request.birth.jdUt,
				zodiac: "tropical",
				houseSystem: "placidus",
				houseSystemRequested: "placidus",
				unavailable: [],
				bodies: {
					sun: {
						lon: 79.5,
						sign: "Gemini",
						signDeg: 19.5,
						house: 9,
						retrograde: false,
						speed: 0.95,
						lat: 0,
						dist: 1,
						ra: 78,
						dec: 23,
						dignities: [],
					},
				},
				angles: { asc: 180, mc: 90, vertex: 200, eastPoint: 175 },
				cusps: [180, 210, 240, 270, 300, 330, 0, 30, 60, 90, 120, 150],
				aspects: [],
			}),
			solarEclipses: () => [
				{ tMax: request.birth.jdUt, type: "total", gamma: 0, begin: 0, end: 1 },
			],
			lunarEclipses: () => [],
			lots: () => ({
				day: true,
				fortune: 234,
				spirit: 123,
				eros: 0,
				necessity: 0,
				courage: 0,
				victory: 0,
				nemesis: 0,
			}),
			starLongitude: () => 0,
			fixedStars: () => ({}),
		};

		const customEngine = new AstrologicalEngine(mockEphemeris);
		const reading = customEngine.compute({
			...request,
			options: { ...request.options, eclipses: true, lots: true, stars: true },
		});

		expect(reading.chart.eclipses?.solar).toBeDefined();
		expect(reading.chart.eclipses?.solar?.lon).toBe(79.5);
		expect(reading.chart.lots?.spirit.lon).toBe(123);
		expect(reading.chart.lots?.fortune.lon).toBe(234);
		expect(reading.chart.stars).toEqual([]);
	});
});

