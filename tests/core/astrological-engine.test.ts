import { describe, expect, test } from "bun:test";
import type { Ephemeris } from "../../src/adapters/ephemeris-gateway";
import { AstrologicalEngine } from "../../src/commands/chart";
import type { NatalRequest } from "../../src/commands/intake";

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

	test("keeps the natal chart and exposes the draconic projection as a separate section", () => {
		const draconicReading = engine.compute({
			...request,
			options: { ...request.options, draconic: true },
		});

		expect(draconicReading.chart.bodies.true_node?.sign).toBe("Aquarius");

		const draconic = draconicReading.chart.draconic;
		expect(draconic).toBeDefined();
		expect(draconic?.nodeUsed).toBe("true_node");
		expect(draconic?.bodies.true_node?.lon).toBeCloseTo(0, 4);
		expect(draconic?.bodies.true_node?.sign).toBe("Aries");
		expect(draconic?.bodies.true_node?.signDeg).toBeCloseTo(0, 4);
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
		} as unknown as Ephemeris;

		const customEngine = new AstrologicalEngine(mockEphemeris);
		const reading = customEngine.compute(request);
		expect(reading.chart.bodies.sun?.sign).toBe("Gemini");
	});

	test("detects aspect patterns and computes chartSignature and interpretationContext", () => {
		const reading = engine.compute(request);

		expect(reading.chart.signature).toBeDefined();
		expect(reading.chart.signature?.hemispheres).toBeDefined();
		expect(reading.chart.signature?.quadrants).toBeDefined();
		expect(reading.chart.signature?.elements).toBeDefined();
		expect(reading.chart.signature?.modalities).toBeDefined();

		expect(Array.isArray(reading.chart.patterns)).toBe(true);
		expect(Array.isArray(reading.chart.declinationAspects)).toBe(true);

		expect(reading.interpretationContext).toBeDefined();
		expect(Array.isArray(reading.interpretationContext?.atoms)).toBe(true);
		expect(reading.interpretationContext?.atoms.length).toBeGreaterThan(0);
	});
});
