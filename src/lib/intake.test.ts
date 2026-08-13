import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
import type { GeocodeResult, Geocoder } from "caelus-birth/geocode";
import { resolveNatalRequest } from "./intake";

function fakeGeocoder(results: GeocodeResult[]): Geocoder {
	return {
		search: async () => results,
	};
}

const TAMPA = {
	year: "1990",
	month: "6",
	day: "10",
	hour: "14",
	minute: "30",
	lat: "27.95",
	lon: "-82.46",
};

describe("resolveNatalRequest", () => {
	describe("birth date and clock resolution", () => {
		test("resolves explicit clock flags and lat/lon to UT", async () => {
			const req = await resolveNatalRequest(TAMPA, new Set(), fakeGeocoder([]));

			expect(req.birth.zone).toBe("America/New_York");
			expect(req.birth.offsetMinutes).toBe(-240);
			expect(req.birth.dst).toBe(true);
			expect(req.birth.status).toBe("ok");
			expect(req.birth.jdUt).toBeCloseTo(2448053.2708, 4);
			expect(req.birth.local).toEqual({
				year: 1990,
				month: 6,
				day: 10,
				hour: 14,
				minute: 30,
				second: 0,
			});
		});

		test("folds seconds into Julian Day", async () => {
			const req = await resolveNatalRequest(
				{ ...TAMPA, second: "45" },
				new Set(),
				fakeGeocoder([]),
			);
			expect(req.birth.local.second).toBe(45);
			expect(req.birth.jdUt).toBeCloseTo(2448053.2708 + 45 / 86400, 4);
		});

		test("parses ISO --when date string", async () => {
			const req = await resolveNatalRequest(
				{ when: "1981-01-26T00:50", lat: "9.24", lon: "-74.75" },
				new Set(),
				fakeGeocoder([]),
			);
			expect(req.birth.local.year).toBe(1981);
			expect(req.birth.local.month).toBe(1);
			expect(req.birth.local.day).toBe(26);
			expect(req.birth.local.hour).toBe(0);
			expect(req.birth.local.minute).toBe(50);
		});

		test("parses dd/mm/yyyy --when format", async () => {
			const req = await resolveNatalRequest(
				{ when: "26/01/1981 00:50", lat: "9.24", lon: "-74.75" },
				new Set(),
				fakeGeocoder([]),
			);
			expect(req.birth.local.year).toBe(1981);
			expect(req.birth.local.month).toBe(1);
			expect(req.birth.local.day).toBe(26);
		});

		test("defaults date-only --when to midnight", async () => {
			const req = await resolveNatalRequest(
				{ when: "1981-01-26", lat: "9.24", lon: "-74.75" },
				new Set(),
				fakeGeocoder([]),
			);
			expect(req.birth.local.hour).toBe(0);
			expect(req.birth.local.minute).toBe(0);
			expect(req.birth.local.second).toBe(0);
		});

		test("rejects combining --when with individual clock flags", async () => {
			await expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						year: "1981",
						lat: "9.24",
						lon: "-74.75",
					},
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});

		test("rejects malformed --when formats", async () => {
			await expect(
				resolveNatalRequest(
					{ when: "invalid-date", lat: "9.24", lon: "-74.75" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});
	});

	describe("geocoding and location resolution", () => {
		test("geocodes --place into lat, lon, and timezone", async () => {
			const geocoder = fakeGeocoder([
				{
					name: "Magangué, Bolívar, Colombia",
					lat: 9.24,
					lon: -74.75,
					country: "Colombia",
					admin1: "Bolívar",
					timezone: "America/Bogota",
				},
			]);

			const req = await resolveNatalRequest(
				{ when: "1981-01-26T00:50", place: "Magangué" },
				new Set(),
				geocoder,
			);

			expect(req.birth.lat).toBe(9.24);
			expect(req.birth.lon).toBe(-74.75);
			expect(req.birth.zone).toBe("America/Bogota");
		});

		test("preserves explicit --zone over geocoded timezone", async () => {
			const geocoder = fakeGeocoder([
				{
					name: "Magangué, Bolívar, Colombia",
					lat: 9.24,
					lon: -74.75,
					timezone: "America/Bogota",
				},
			]);

			const req = await resolveNatalRequest(
				{ when: "1981-01-26T00:50", place: "Magangué", zone: "UTC" },
				new Set(),
				geocoder,
			);

			expect(req.birth.zone).toBe("UTC");
		});

		test("rejects combining --place with --lat/--lon", async () => {
			await expect(
				resolveNatalRequest(
					{ when: "1981-01-26T00:50", place: "Magangué", lat: "9.24" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});

		test("throws NOT_FOUND when geocoder returns no results", async () => {
			await expect(
				resolveNatalRequest(
					{ when: "1981-01-26T00:50", place: "NonExistentCity" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});
	});

	describe("chart options resolution", () => {
		test("defaults options to placidus and tropical", async () => {
			const req = await resolveNatalRequest(TAMPA, new Set(), fakeGeocoder([]));
			expect(req.options.houseSystem).toBe("placidus");
			expect(req.options.zodiac).toBe("tropical");
			expect(req.options.node).toBe("both");
			expect(req.options.bodies).toEqual([]);
			expect(req.options.topocentric).toBe(false);
		});

		test("normalizes house-system aliases and parses extra options", async () => {
			const req = await resolveNatalRequest(
				{
					...TAMPA,
					"house-system": "whole sign",
					zodiac: "sidereal:lahiri",
					bodies: " mean_lilith,true_lilith, ",
				},
				new Set(["topocentric"]),
				fakeGeocoder([]),
			);

			expect(req.options.houseSystem).toBe("whole_sign");
			expect(req.options.zodiac).toBe("sidereal:lahiri");
			expect(req.options.bodies).toEqual(["mean_lilith", "true_lilith"]);
			expect(req.options.topocentric).toBe(true);
		});

		test("rejects unknown house system", async () => {
			await expect(
				resolveNatalRequest(
					{ ...TAMPA, "house-system": "invalid_system" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});

		test("rejects malformed zodiac string", async () => {
			await expect(
				resolveNatalRequest(
					{ ...TAMPA, zodiac: "sidereal" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});

		test("accepts star-anchored ayanamsas", async () => {
			const req = await resolveNatalRequest(
				{ ...TAMPA, zodiac: "sidereal:galcent_0sag" },
				new Set(),
				fakeGeocoder([]),
			);
			expect(req.options.zodiac).toBe("sidereal:galcent_0sag");
		});

		test("rejects unknown sidereal ayanamsa with suggestions", async () => {
			try {
				await resolveNatalRequest(
					{ ...TAMPA, zodiac: "sidereal:foo" },
					new Set(),
					fakeGeocoder([]),
				);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AxiError);
				const axi = error as AxiError;
				expect(axi.code).toBe("INVALID_VALUE");
				expect(axi.suggestions[0]).toContain("lahiri");
			}
		});

		test("rejects unknown extra body with suggestions", async () => {
			try {
				await resolveNatalRequest(
					{ ...TAMPA, bodies: "not_a_body" },
					new Set(),
					fakeGeocoder([]),
				);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AxiError);
				const axi = error as AxiError;
				expect(axi.code).toBe("INVALID_VALUE");
				expect(axi.message).toContain("not_a_body");
				expect(axi.suggestions[0]).toContain("mean_lilith");
			}
		});

		test("throws MISSING_FLAG when required birth flag is missing", async () => {
			await expect(
				resolveNatalRequest(
					{ month: "6", lat: "27.95" },
					new Set(),
					fakeGeocoder([]),
				),
			).rejects.toThrow(AxiError);
		});
	});
});
