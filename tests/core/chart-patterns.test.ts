import { describe, expect, it } from "bun:test";
import type { ChartBody } from "caelus";
import {
	computeChartSignature,
	computeDeclinationAspects,
	detectAspectPatterns,
} from "../../src/core/chart-patterns";

describe("chart-patterns", () => {
	it("computes chart signature distributions across hemispheres, quadrants, elements, and modalities", () => {
		const bodies: Partial<Record<string, ChartBody>> = {
			sun: {
				lon: 15,
				sign: "Aries",
				signDeg: 15,
				house: 1,
				retrograde: false,
				speed: 1,
				lat: 0,
				dist: null,
				ra: 14,
				dec: 6,
			},
			moon: {
				lon: 45,
				sign: "Taurus",
				signDeg: 15,
				house: 2,
				retrograde: false,
				speed: 12,
				lat: 0,
				dist: null,
				ra: 43,
				dec: 16,
			},
			mars: {
				lon: 135,
				sign: "Leo",
				signDeg: 15,
				house: 5,
				retrograde: false,
				speed: 0.5,
				lat: 0,
				dist: null,
				ra: 137,
				dec: 17,
			},
			jupiter: {
				lon: 225,
				sign: "Scorpio",
				signDeg: 15,
				house: 8,
				retrograde: false,
				speed: 0.1,
				lat: 0,
				dist: null,
				ra: 223,
				dec: -16,
			},
		};

		const sig = computeChartSignature(bodies);
		expect(sig.elements.fire).toBe(2); // sun (Aries), mars (Leo)
		expect(sig.elements.earth).toBe(1); // moon (Taurus)
		expect(sig.elements.water).toBe(1); // jupiter (Scorpio)
		expect(sig.elements.air).toBe(0);

		expect(sig.hemispheres.eastern).toBe(2); // house 1, 2
		expect(sig.hemispheres.western).toBe(2); // house 5, 8
		expect(sig.hemispheres.northern).toBe(3); // house 1, 2, 5
		expect(sig.hemispheres.southern).toBe(1); // house 8
	});

	it("detects stellium aspect patterns with 3+ bodies in the same sign", () => {
		const bodies: Partial<Record<string, ChartBody>> = {
			sun: {
				lon: 10,
				sign: "Aries",
				signDeg: 10,
				house: 1,
				retrograde: false,
				speed: 1,
				lat: 0,
				dist: null,
				ra: 9,
				dec: 4,
			},
			mercury: {
				lon: 15,
				sign: "Aries",
				signDeg: 15,
				house: 1,
				retrograde: false,
				speed: 1.2,
				lat: 0,
				dist: null,
				ra: 14,
				dec: 6,
			},
			venus: {
				lon: 20,
				sign: "Aries",
				signDeg: 20,
				house: 1,
				retrograde: false,
				speed: 1.1,
				lat: 0,
				dist: null,
				ra: 18,
				dec: 8,
			},
		};

		const patterns = detectAspectPatterns([], bodies);
		expect(
			patterns.some((p) => p.type === "stellium" && p.bodies.length === 3),
		).toBe(true);
	});

	it("detects geometric 3-body aspect patterns (grand_trine, t_square, yod)", () => {
		const bodies: Partial<Record<string, ChartBody>> = {
			sun: {
				lon: 0,
				sign: "Aries",
				signDeg: 0,
				house: 1,
				retrograde: false,
				speed: 1,
				lat: 0,
				dist: null,
				ra: 0,
				dec: 0,
			},
			moon: {
				lon: 120,
				sign: "Leo",
				signDeg: 0,
				house: 5,
				retrograde: false,
				speed: 12,
				lat: 0,
				dist: null,
				ra: 120,
				dec: 10,
			},
			mars: {
				lon: 240,
				sign: "Sagittarius",
				signDeg: 0,
				house: 9,
				retrograde: false,
				speed: 0.5,
				lat: 0,
				dist: null,
				ra: 240,
				dec: -10,
			},
		};

		const aspects = [
			{ a: "sun", b: "moon", aspect: "trine" },
			{ a: "moon", b: "mars", aspect: "trine" },
			{ a: "sun", b: "mars", aspect: "trine" },
		];

		const patterns = detectAspectPatterns(aspects, bodies);
		expect(patterns.some((p) => p.type === "grand_trine")).toBe(true);
	});

	it("computes parallel and contraparallel declination aspects", () => {
		const bodies: Partial<Record<string, ChartBody>> = {
			sun: {
				lon: 0,
				sign: "Aries",
				signDeg: 0,
				house: 1,
				retrograde: false,
				speed: 1,
				lat: 0,
				dist: null,
				ra: 0,
				dec: 15.0,
			},
			moon: {
				lon: 180,
				sign: "Libra",
				signDeg: 0,
				house: 7,
				retrograde: false,
				speed: 12,
				lat: 0,
				dist: null,
				ra: 180,
				dec: 15.2,
			},
			saturn: {
				lon: 90,
				sign: "Cancer",
				signDeg: 0,
				house: 4,
				retrograde: false,
				speed: 0.1,
				lat: 0,
				dist: null,
				ra: 90,
				dec: -15.1,
			},
		};

		const declAspects = computeDeclinationAspects(bodies);
		expect(
			declAspects.some(
				(d) =>
					d.aspect === "parallel" &&
					((d.a === "sun" && d.b === "moon") ||
						(d.a === "moon" && d.b === "sun")),
			),
		).toBe(true);
		expect(
			declAspects.some(
				(d) =>
					d.aspect === "contraparallel" &&
					((d.a === "sun" && d.b === "saturn") ||
						(d.a === "saturn" && d.b === "sun")),
			),
		).toBe(true);
	});
});
