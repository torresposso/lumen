import { describe, expect, test } from "bun:test";
import {
	angularDistance,
	angularDistanceDirect,
	findAspect,
	findDeclinationAspect,
	houseOf,
	isOrbWithin,
	normalizeLongitude,
	projectPoint,
	shiftLongitude,
	signOf,
} from "../../src/core/celestial-coordinates";

describe("celestial coordinates & zodiac math", () => {
	test("signOf converts degrees to zodiac sign names", () => {
		expect(signOf(0)).toBe("Aries");
		expect(signOf(15)).toBe("Aries");
		expect(signOf(29.99)).toBe("Aries");
		expect(signOf(30)).toBe("Taurus");
		expect(signOf(359.9)).toBe("Pisces");
	});

	test("signOf normalizes negative and >360 angles", () => {
		expect(signOf(-15)).toBe("Pisces");
		expect(signOf(375)).toBe("Aries");
		expect(signOf(-390)).toBe("Pisces");
	});

	test("houseOf maps longitudes to house numbers 1-12", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		expect(houseOf(cusps, 15)).toBe(1);
		expect(houseOf(cusps, 45)).toBe(2);
		expect(houseOf(cusps, 345)).toBe(12);
	});

	test("houseOf handles cusp wrap-around across 360/0 degrees", () => {
		const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
		expect(houseOf(cusps, 355)).toBe(1);
		expect(houseOf(cusps, 10)).toBe(1);
		expect(houseOf(cusps, 25)).toBe(2);
	});

	test("houseOf throws on missing or short cusp arrays", () => {
		expect(() => houseOf([], 75)).toThrow(/12 cusps/);
		expect(() => houseOf([0, 30, 60], 75)).toThrow(/12 cusps/);
	});

	test("normalizeLongitude normalizes angles within [0, 360)", () => {
		expect(normalizeLongitude(360)).toBe(0);
		expect(normalizeLongitude(-30)).toBe(330);
		expect(normalizeLongitude(725)).toBe(5);
	});

	test("shiftLongitude shifts longitude relative to a reference node", () => {
		expect(shiftLongitude(45, 15)).toBe(30);
		expect(shiftLongitude(10, 30)).toBe(340);
	});

	test("angularDistance calculates the shortest arc between two longitudes", () => {
		expect(angularDistance(10, 350)).toBe(20);
		expect(angularDistance(0, 180)).toBe(180);
		expect(angularDistance(15, 105)).toBe(90);
	});

	test("angularDistanceDirect calculates direct counterclockwise arc in [0, 360)", () => {
		expect(angularDistanceDirect(10, 350)).toBe(340);
		expect(angularDistanceDirect(350, 10)).toBe(20);
		expect(angularDistanceDirect(100, 100)).toBe(0);
		expect(angularDistanceDirect(10, 100)).toBe(90);
	});

	test("isOrbWithin evaluates orb limits accurately", () => {
		expect(isOrbWithin(10, 350, 20)).toBe(true);
		expect(isOrbWithin(10, 350, 15)).toBe(false);
	});

	test("projectPoint normalizes, rounds, finds sign, degree, and house", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		const pt = projectPoint(79.611345, cusps);
		expect(pt).toEqual({
			lon: 79.6113,
			sign: "Gemini",
			signDeg: 19.6113,
			house: 3,
		});

		// 30° edge boundary condition
		const edge = projectPoint(29.999999, cusps);
		expect(edge.sign).toBe("Taurus");
		expect(edge.signDeg).toBe(0);
	});

	test("projectPoint keeps rounded longitudes normalized at the 0°/360° edge", () => {
		const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
		expect(projectPoint(359.99999, cusps)).toEqual({
			lon: 0,
			sign: "Aries",
			signDeg: 0,
			house: 12,
		});
		expect(projectPoint(-0.000001, cusps)).toEqual({
			lon: 0,
			sign: "Aries",
			signDeg: 0,
			house: 12,
		});
	});

	test("findAspect detects aspects within orb", () => {
		const aspects = [{ name: "trine", target: 120, orb: 5 }];
		const match = findAspect(10, 131, aspects);
		expect(match).toEqual({
			aspect: "trine",
			target: 120,
			orb: 1,
		});
		expect(findAspect(10, 140, aspects)).toBeUndefined();
	});

	test("findDeclinationAspect detects parallel and contraparallel aspects", () => {
		// Parallel (both positive or both negative, same declination within orb)
		const pMatch = findDeclinationAspect(22.5, 23.1, 1.2);
		expect(pMatch).toEqual({
			aspect: "parallel",
			orb: 0.6,
		});

		// Contraparallel (one positive, one negative, opposite declination within orb)
		const cpMatch = findDeclinationAspect(18.2, -18.7, 1.2);
		expect(cpMatch).toEqual({
			aspect: "contraparallel",
			orb: 0.5,
		});

		// Out of orb
		expect(findDeclinationAspect(15.0, -18.0, 1.2)).toBeUndefined();
		expect(findDeclinationAspect(10.0, 13.0, 1.2)).toBeUndefined();
	});
});
