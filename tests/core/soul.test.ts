import { describe, expect, it } from "bun:test";
import { computeSoulReading } from "../../src/core/soul";

describe("core/soul", () => {
	const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

	it("computes Pluto placement, PPP, and aspect balance", () => {
		const bodies = {
			pluto: {
				lon: 230, // Scorpio
				lat: 0,
				speed: 0.02,
				sign: "Scorpio",
				signDeg: 20,
				house: 8,
			},
			sun: {
				lon: 110, // Cancer - Trine Pluto (120°)
				lat: 0,
				speed: 1,
				sign: "Cancer",
				signDeg: 20,
				house: 4,
			},
			mars: {
				lon: 140, // Leo - Square Pluto (90°)
				lat: 0,
				speed: 0.5,
				sign: "Leo",
				signDeg: 20,
				house: 5,
			},
		};

		const reading = computeSoulReading(bodies, cusps, 150);
		expect(reading).toBeDefined();
		if (!reading) return;

		expect(reading.pluto.sign).toBe("Scorpio");
		expect(reading.pluto.house).toBe(8);
		expect(reading.ppp.active).toBe(true);
		expect(reading.ppp.lon).toBe(50); // 230 + 180 = 410 % 360 = 50 (Taurus)
		expect(reading.ppp.sign).toBe("Taurus");
		expect(reading.pluto.stressfulAspects).toBe(1); // Mars square
		expect(reading.pluto.nonstressfulAspects).toBe(1); // Sun trine
		expect(reading.plutoNorthNodeMidpoint).toBeDefined();
		expect(reading.dispositorChain.length).toBeGreaterThan(0);
	});

	it("deactivates PPP when Pluto is conjunct North Node", () => {
		const bodies = {
			pluto: {
				lon: 230,
				lat: 0,
				speed: 0.02,
				sign: "Scorpio",
				signDeg: 20,
				house: 8,
			},
		};

		// North Node at 232° (within 10° orb)
		const reading = computeSoulReading(bodies, cusps, 232);
		expect(reading).toBeDefined();
		if (!reading) return;

		expect(reading.ppp.active).toBe(false);
		expect(reading.ppp.description).toContain(
			"Direct integration through North Node",
		);
	});
});
