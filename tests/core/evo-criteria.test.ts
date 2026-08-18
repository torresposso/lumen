import { describe, expect, it } from "bun:test";
import {
	describeEvoCriteria,
	PLUTO_ASPECTS,
} from "../../src/core/evo-criteria";

describe("core/evo-criteria", () => {
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
