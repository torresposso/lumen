import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { describeEvoCriteria, toDraconicChart } from "../../src/core/classical";
import { PLUTO_ASPECTS } from "../../src/core/soul";
import type { ResolvedBirth } from "../../src/core/types";

describe("core/classical", () => {
	const ephemeris = new CaelusEphemeris();
	const birth: ResolvedBirth = {
		jdUt: julianDay(1981, 1, 26),
		lat: 9.24,
		lon: -74.75,
		local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
		zone: "America/Bogota",
		offsetMinutes: -300,
		dst: false,
		status: "ok",
	};

	it("projects the chart onto the draconic zodiac (0° Aries North Node)", () => {
		const chart = ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon);
		const draconic = toDraconicChart(chart);

		expect(draconic.nodeUsed).toBe("true_node");
		expect(draconic.bodies.true_node?.lon).toBeCloseTo(0, 4);
		expect(draconic.bodies.true_node?.sign).toBe("Aries");
		expect(draconic.bodies.sun?.sign).toBeDefined();
	});
});

describe("core/describeEvoCriteria", () => {
	it("serializes PLUTO_ASPECTS grouped by orb in descending order", () => {
		const s = describeEvoCriteria();
		expect(s).toContain("orbs PLUTO_ASPECTS:");
		expect(s).toContain("10° conjunction/opposition");
		expect(s).toContain("8° square/trine");
		expect(s).toContain("6° sextile");
		expect(s).toContain("3° semisextile/semisquare/sesquiquadrate/quincunx");
		expect(s).toContain("2° septile/quintile/biquintile");
		// descending: the 10° group comes before the 2° group.
		expect(s.indexOf("10°")).toBeLessThan(s.indexOf("2° septile"));
	});

	it("derives from the live tables: every PLUTO_ASPECTS orb appears", () => {
		const s = describeEvoCriteria();
		for (const def of PLUTO_ASPECTS) {
			expect(s).toContain(`${def.orb}°`);
		}
	});

	it("names the remaining criteria from the core constants", () => {
		const s = describeEvoCriteria();
		expect(s).toContain("ppp: major aspects only (orb 5°)");
		expect(s).toContain("skipped: squares to the nodal axis (orb 5°)");
		expect(s).toContain(
			"ppp inactive when pluto conjunct the north node (orb 10°)",
		);
	});

	it("is deterministic", () => {
		expect(describeEvoCriteria()).toBe(describeEvoCriteria());
	});
});
