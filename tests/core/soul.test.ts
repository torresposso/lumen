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

	it("reports applying vs separating phase with the correct sign", () => {
		const pluto = {
			lon: 0,
			lat: 0,
			speed: 0.01,
			sign: "Aries",
			signDeg: 0,
			house: 1,
		};
		// body at 119°: just before exact trine (120°) and faster -> applying
		const applying = computeSoulReading(
			{
				pluto,
				sun: { lon: 119, speed: 1, sign: "Cancer", signDeg: 29, house: 5 },
			},
			cusps,
			10,
		);
		expect(applying?.pluto.aspects[0]?.aspect).toBe("trine");
		expect(applying?.pluto.aspects[0]?.phase).toBe("applying");

		// body at 121°: just past exact trine and faster -> separating
		const separating = computeSoulReading(
			{
				pluto,
				sun: { lon: 121, speed: 1, sign: "Cancer", signDeg: 1, house: 5 },
			},
			cusps,
			10,
		);
		expect(separating?.pluto.aspects[0]?.phase).toBe("separating");

		// body at exact and same relative speed -> exact
		const exact = computeSoulReading(
			{
				pluto,
				sun: { lon: 120, speed: 0.01, sign: "Cancer", signDeg: 0, house: 5 },
			},
			cusps,
			10,
		);
		expect(exact?.pluto.aspects[0]?.phase).toBe("exact");
	});

	it("exposes near midpoint and anti-midpoint (including wrap across 0°)", () => {
		const base = (plutoLon: number, _nodeLon: number) => ({
			pluto: {
				lon: plutoLon,
				speed: 0.01,
				sign: plutoLon < 30 ? "Aries" : "Scorpio",
				signDeg: plutoLon % 30,
				house: 1,
			},
		});
		// Pluto 230 / NN 150 -> near Libra 10, anti Aries 10
		const a = computeSoulReading(base(230, 150), cusps, 150);
		expect(a?.plutoNorthNodeMidpoint?.formatted).toContain("Libra");
		expect(a?.plutoNorthNodeAntiMidpoint?.formatted).toContain("Aries");

		// Wrap: Pluto 350 / NN 10 -> near Aries 0, anti Libra 0
		const b = computeSoulReading(base(350, 10), cusps, 10);
		expect(b?.plutoNorthNodeMidpoint?.formatted).toContain("Aries");
		expect(b?.plutoNorthNodeAntiMidpoint?.formatted).toContain("Libra");
	});
});
