import { describe, expect, it } from "bun:test";
import { julianDay } from "caelus";
import { CaelusEphemeris } from "../../src/adapters/ephemeris-gateway";
import { computeKarma } from "../../src/core/karma";
import type { ChartRequestOptions, NatalRequest } from "../../src/core/types";

const DEFAULT_OPTIONS: ChartRequestOptions = {
	houseSystem: "placidus",
	zodiac: "tropical",
	bodies: [],
	topocentric: false,
	draconic: false,
};

describe("core/karma", () => {
	const ephemeris = new CaelusEphemeris();

	it("computes evolutionary contacts and overlays between two charts", () => {
		const requestA: NatalRequest = {
			birth: {
				jdUt: julianDay(1981, 1, 26),
				lat: 9.24,
				lon: -74.75,
				local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
				zone: "America/Bogota",
				offsetMinutes: -300,
				dst: false,
				status: "ok",
			},
			options: DEFAULT_OPTIONS,
		};
		const requestB: NatalRequest = {
			birth: {
				jdUt: julianDay(1985, 5, 10),
				lat: 40.71,
				lon: -74.0,
				local: { year: 1985, month: 5, day: 10, hour: 0, minute: 0 },
				zone: "America/New_York",
				offsetMinutes: -240,
				dst: false,
				status: "ok",
			},
			options: DEFAULT_OPTIONS,
		};

		const result = computeKarma(
			"personA",
			requestA,
			"personB",
			requestB,
			ephemeris,
			5,
		);

		expect(result.pair.a).toBe("personA");
		expect(result.pair.b).toBe("personB");
		expect(result.overlays.length).toBeGreaterThan(0);
		expect(result.summary.totalContacts).toBe(result.contacts.length);
		expect(typeof result.summary.contactsDescription).toBe("string");
	});
});
