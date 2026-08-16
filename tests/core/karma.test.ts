import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { computeKarma } from "../../src/core/karma";

describe("core/karma", () => {
	const ephemeris = new CaelusEphemeris();

	it("computes evolutionary contacts and overlays between two charts", () => {
		const chartA = ephemeris.chartAt(julianDay(1981, 1, 26), 9.24, -74.75);
		const chartB = ephemeris.chartAt(julianDay(1985, 5, 10), 40.71, -74.0);

		const result = computeKarma("personA", chartA, "personB", chartB, 5);

		expect(result.pair.a).toBe("personA");
		expect(result.pair.b).toBe("personB");
		expect(result.overlays.length).toBeGreaterThan(0);
		expect(result.summary.totalContacts).toBe(result.contacts.length);
		expect(typeof result.summary.contactsDescription).toBe("string");
	});
});
