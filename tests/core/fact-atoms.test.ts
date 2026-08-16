import { describe, expect, it } from "bun:test";
import type { ChartBody } from "caelus";
import { generateFactAtoms } from "../../src/core/classical";

describe("fact-atoms", () => {
	it("generates deterministic fact atoms for bodies, aspects, and patterns", () => {
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
				dignities: [],
			},
			mercury: {
				lon: 20,
				sign: "Aries",
				signDeg: 20,
				house: 1,
				retrograde: true,
				speed: -0.5,
				lat: 0,
				dist: null,
				ra: 18,
				dec: 8,
				dignities: [],
			},
		};

		const aspects = [{ a: "sun", b: "mercury", aspect: "conjunction" }];
		const patterns = [
			{
				type: "stellium" as const,
				bodies: ["sun", "mercury", "venus"],
				sign: "Aries",
			},
			{
				type: "stellium_house" as const,
				bodies: ["sun", "mercury", "venus"],
				house: 1,
			},
		];

		const cusps = [{ lon: 15, sign: "Aries", signDeg: 15 }];

		const context = generateFactAtoms({
			bodies,
			aspects,
			patterns,
			cusps,
		});

		expect(context.atoms).toContain("sun_sign_aries");
		expect(context.atoms).toContain("sun_house_1");
		expect(context.atoms).toContain("mercury_retrograde");
		expect(context.atoms).toContain("aspect_sun_conjunction_mercury");
		expect(context.atoms).toContain("pattern_stellium_sign_aries");
		expect(context.atoms).toContain("pattern_stellium_house_1");
		expect(context.atoms).toContain("house_1_sign_aries");
		expect(context.atoms).toContain("house_1_ruler_mars");
	});

	it("generates dominant element and hemisphere fact atoms", () => {
		const context = generateFactAtoms({
			bodies: {},
			aspects: [],
			signature: {
				hemispheres: { eastern: 6, western: 2, northern: 5, southern: 3 },
				quadrants: { q1: 4, q2: 1, q3: 1, q4: 2 },
				elements: { fire: 5, earth: 1, air: 1, water: 1 },
				modalities: { cardinal: 4, fixed: 2, mutable: 2 },
			},
		});

		expect(context.atoms).toContain("dominant_element_fire");
		expect(context.atoms).toContain("dominant_hemisphere_eastern");
	});
});
