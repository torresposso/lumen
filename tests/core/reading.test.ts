import { describe, expect, test } from "bun:test";
import {
	CaelusEphemeris,
	type Ephemeris,
} from "../../src/adapters/ephemeris-gateway";
import {
	type AstrologicalReading,
	computeReading,
} from "../../src/core/reading";
import type { NatalRequest } from "../../src/core/types";

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
		bodies: [],
		topocentric: false,
		draconic: false,
	},
};

function expectReading(
	possiblyUndefined: AstrologicalReading | undefined,
): AstrologicalReading {
	if (possiblyUndefined === undefined) {
		throw new Error("expected an astrological reading");
	}
	return possiblyUndefined;
}

describe("computeReading", () => {
	const ephemeris = new CaelusEphemeris();

	test("computes an astrological reading with the embedded engine", () => {
		const reading = expectReading(computeReading(request, ephemeris));
		expect(reading.chart.bodies.sun?.sign).toBe("Gemini");
		expect(reading.chart.bodies.sun?.house).toBe(9);
		expect(reading.chart.meta.houseSystem).toBe("placidus");
	});

	test("keeps only the true node (lumen is dedicated to the true node)", () => {
		const reading = expectReading(computeReading(request, ephemeris));
		expect(reading.chart.bodies.true_node).toBeDefined();
		expect(reading.chart.bodies.mean_node).toBeUndefined();
	});

	test("computes requested extra bodies", () => {
		const reading = expectReading(
			computeReading(
				{
					...request,
					options: { ...request.options, bodies: ["mean_lilith"] },
				},
				ephemeris,
			),
		);
		expect(reading.chart.bodies.mean_lilith).toBeDefined();
	});

	test("keeps the natal chart and exposes the draconic projection as a separate section", () => {
		const draconicReading = expectReading(
			computeReading(
				{
					...request,
					options: { ...request.options, draconic: true },
				},
				ephemeris,
			),
		);

		expect(draconicReading.chart.bodies.true_node?.sign).toBe("Aquarius");

		const draconic = draconicReading.chart.draconic;
		expect(draconic).toBeDefined();
		expect(draconic?.nodeUsed).toBe("true_node");
		expect(draconic?.bodies.true_node?.lon).toBeCloseTo(0, 4);
		expect(draconic?.bodies.true_node?.sign).toBe("Aries");
		expect(draconic?.bodies.true_node?.signDeg).toBeCloseTo(0, 4);
	});

	test("computeReading accepts a custom Ephemeris seam", () => {
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

		const reading = expectReading(computeReading(request, mockEphemeris));
		expect(reading.chart.bodies.sun?.sign).toBe("Gemini");
	});

	test("returns undefined when evo is requested but the chart lacks pluto", () => {
		const mockEphemeris = {
			chartAt: () => ({
				jdUt: request.birth.jdUt,
				zodiac: "tropical",
				houseSystem: "placidus",
				houseSystemRequested: "placidus",
				unavailable: [],
				bodies: {
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

		const reading = computeReading(request, mockEphemeris, { evo: true });
		expect(reading).toBeUndefined();
	});

	test("detects aspect patterns and computes chartSignature and interpretationContext", () => {
		const reading = expectReading(computeReading(request, ephemeris));

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
