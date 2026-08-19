import { describe, expect, test } from "bun:test";
import { computeSolLunaPhase } from "../../../src/core/astrology/geometry";

describe("Sol-Luna phase calculation", () => {
	test("correctly calculates archetypal 8 phases", () => {
		expect(computeSolLunaPhase(0, 10)).toBe("New");
		expect(computeSolLunaPhase(0, 60)).toBe("Crescent");
		expect(computeSolLunaPhase(0, 100)).toBe("First Quarter");
		expect(computeSolLunaPhase(0, 150)).toBe("Gibbous");
		expect(computeSolLunaPhase(0, 190)).toBe("Full");
		expect(computeSolLunaPhase(0, 240)).toBe("Disseminating");
		expect(computeSolLunaPhase(0, 290)).toBe("Last Quarter");
		expect(computeSolLunaPhase(0, 340)).toBe("Balsamic");
	});
});
