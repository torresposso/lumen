import { describe, expect, it } from "bun:test";
import { computeSolLunaPhase } from "../../src/core/phases";

describe("core/phases", () => {
	it("computes New Moon phase (0° - 45°)", () => {
		const phase = computeSolLunaPhase(0, 20);
		expect(phase.name).toBe("New");
		expect(phase.angle).toBe(20);
	});

	it("computes Crescent Moon phase (45° - 90°)", () => {
		const phase = computeSolLunaPhase(0, 60);
		expect(phase.name).toBe("Crescent");
		expect(phase.angle).toBe(60);
	});

	it("computes First Quarter Moon phase (90° - 135°)", () => {
		const phase = computeSolLunaPhase(0, 100);
		expect(phase.name).toBe("First Quarter");
	});

	it("computes Gibbous Moon phase (135° - 180°)", () => {
		const phase = computeSolLunaPhase(0, 150);
		expect(phase.name).toBe("Gibbous");
	});

	it("computes Full Moon phase (180° - 225°)", () => {
		const phase = computeSolLunaPhase(0, 185);
		expect(phase.name).toBe("Full");
	});

	it("computes Disseminating Moon phase (225° - 270°)", () => {
		const phase = computeSolLunaPhase(0, 240);
		expect(phase.name).toBe("Disseminating");
	});

	it("computes Last Quarter Moon phase (270° - 315°)", () => {
		const phase = computeSolLunaPhase(0, 280);
		expect(phase.name).toBe("Last Quarter");
	});

	it("computes Balsamic Moon phase (315° - 360°)", () => {
		const phase = computeSolLunaPhase(0, 330);
		expect(phase.name).toBe("Balsamic");
	});

	it("handles angular wrap-around across 0°/360° correctly", () => {
		// Sun at 350°, Moon at 20° -> direct counter-clockwise arc is 30° -> New
		const phase = computeSolLunaPhase(350, 20);
		expect(phase.name).toBe("New");
		expect(phase.angle).toBe(30);
	});
});
