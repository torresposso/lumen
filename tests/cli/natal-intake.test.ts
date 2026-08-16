import { describe, expect, test } from "bun:test";
import {
	birthSchema,
	birthSuggestions,
	optionsSchema,
	optionsSuggestions,
	parseWith,
	resolveNatalRequest,
	resolveNatalRequestFromArgs,
} from "../../src/commands/client";

describe("resolveNatalRequest", () => {
	describe("schema validation", () => {
		test("birthSchema parses valid birth data", () => {
			const valid = {
				year: "1990",
				month: "6",
				day: "15",
				hour: "14",
				minute: "30",
				lat: "40.7128",
				lon: "-74.0060",
			};
			const res = parseWith(birthSchema, valid, birthSuggestions);
			expect(res.year).toBe(1990);
			expect(res.month).toBe(6);
			expect(res.day).toBe(15);
			expect(res.lat).toBe(40.7128);
		});

		test("birthSchema rejects invalid latitude/longitude ranges", () => {
			expect(() =>
				parseWith(birthSchema, { lat: "100" }, birthSuggestions),
			).toThrow();
			expect(() =>
				parseWith(birthSchema, { lon: "-200" }, birthSuggestions),
			).toThrow();
		});

		test("birthSchema accepts February dates in non-leap years", () => {
			const feb = (year: string, day: string) => ({
				year,
				month: "2",
				day,
				hour: "0",
				minute: "0",
				lat: "0",
				lon: "0",
			});

			expect(
				parseWith(birthSchema, feb("2001", "2"), birthSuggestions).day,
			).toBe(2);
			expect(
				parseWith(birthSchema, feb("2001", "28"), birthSuggestions).day,
			).toBe(28);
			expect(
				parseWith(birthSchema, feb("2000", "29"), birthSuggestions).day,
			).toBe(29);
			expect(() =>
				parseWith(birthSchema, feb("2001", "29"), birthSuggestions),
			).toThrow(/invalid day 29 for month 2/);
		});

		test("optionsSchema parses house system and transforms comma-separated bodies", () => {
			const raw = {
				houseSystem: "whole_sign",
				bodies: "mean_lilith, true_lilith",
			};
			const res = parseWith(optionsSchema, raw, optionsSuggestions);
			expect(res.houseSystem).toBe("whole_sign");
			expect(res.bodies).toEqual(["mean_lilith", "true_lilith"]);
		});

		test("optionsSchema rejects unknown bodies", () => {
			expect(() =>
				parseWith(
					optionsSchema,
					{ bodies: "unknown_planet" },
					optionsSuggestions,
				),
			).toThrow(/unknown body/);
		});
	});

	describe("birth date and clock resolution", () => {
		test("resolves explicit clock flags and lat/lon to UT", async () => {
			const request = await resolveNatalRequest(
				{
					year: "1990",
					month: "6",
					day: "10",
					hour: "14",
					minute: "30",
					lat: "27.95",
					lon: "-82.46",
					zone: "America/New_York",
				},
				new Set(),
			);

			expect(request.birth.jdUt).toBeCloseTo(2448053.27083, 4);
			expect(request.birth.zone).toBe("America/New_York");
			expect(request.birth.offsetMinutes).toBe(-240);
			expect(request.birth.dst).toBe(true);
			expect(request.birth.status).toBe("ok");
		});

		test("rejects an unknown IANA timezone with a specific error", async () => {
			expect(
				resolveNatalRequest(
					{
						year: "1990",
						month: "6",
						day: "10",
						hour: "14",
						minute: "30",
						lat: "27.95",
						lon: "-82.46",
						zone: "Not/A_Timezone",
					},
					new Set(),
				),
			).rejects.toThrow(/Invalid timezone/);
		});

		test("parses ISO --when date string", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(),
			);
			expect(request.birth.local.year).toBe(1981);
			expect(request.birth.local.month).toBe(1);
			expect(request.birth.local.day).toBe(26);
			expect(request.birth.local.hour).toBe(0);
			expect(request.birth.local.minute).toBe(50);
		});

		test("parses dd/mm/yyyy --when format", async () => {
			const request = await resolveNatalRequest(
				{
					when: "26/01/1981 00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(),
			);
			expect(request.birth.local.year).toBe(1981);
			expect(request.birth.local.month).toBe(1);
			expect(request.birth.local.day).toBe(26);
		});

		test("defaults date-only --when to midnight", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(),
			);
			expect(request.birth.local.hour).toBe(0);
			expect(request.birth.local.minute).toBe(0);
		});

		test("rejects combining --when with individual clock flags", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						year: "1981",
						lat: "9.242",
						lon: "-74.755",
						zone: "America/Bogota",
					},
					new Set(),
				),
			).rejects.toThrow(/Cannot combine --when/);
		});

		test("rejects malformed --when formats", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "not-a-date",
						lat: "9.242",
						lon: "-74.755",
						zone: "America/Bogota",
					},
					new Set(),
				),
			).rejects.toThrow(/Could not parse --when/);
		});
	});

	describe("geocoding and location resolution", () => {
		const mockGeocoder = {
			search: async (query: string) => {
				if (query.includes("Magangué")) {
					return [
						{
							lat: 9.24202,
							lon: -74.75467,
							name: "Magangué",
							country: "Colombia",
							timezone: "America/Bogota",
						},
					];
				}
				return [];
			},
		};

		test("geocodes --place into lat, lon, and timezone", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					place: "Magangué, Colombia",
				},
				new Set(),
				mockGeocoder,
			);
			expect(request.birth.lat).toBe(9.24202);
			expect(request.birth.lon).toBe(-74.75467);
			expect(request.birth.zone).toBe("America/Bogota");
		});

		test("preserves explicit --zone over geocoded timezone", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					place: "Magangué, Colombia",
					zone: "UTC",
				},
				new Set(),
				mockGeocoder,
			);
			expect(request.birth.zone).toBe("UTC");
		});

		test("rejects combining --place with --lat/--lon", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						place: "Magangué, Colombia",
						lat: "9.242",
					},
					new Set(),
					mockGeocoder,
				),
			).rejects.toThrow(/Cannot combine --place with --lat/);
		});

		test("throws NOT_FOUND when geocoder returns no results", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						place: "NowhereLandXYZ",
					},
					new Set(),
					mockGeocoder,
				),
			).rejects.toThrow(/No results for place/);
		});
	});

	describe("chart options resolution", () => {
		test("defaults options to placidus and tropical", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(),
			);
			expect(request.options.houseSystem).toBe("placidus");
			expect(request.options.zodiac).toBe("tropical");
			expect(request.options.node).toBe("both");
			expect(request.options.bodies).toEqual([]);
		});

		test("normalizes house-system aliases and parses extra options", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
					"house-system": "whole_sign",
					node: "mean",
					bodies: "mean_lilith, true_lilith",
				},
				new Set(["topocentric"]),
			);
			expect(request.options.houseSystem).toBe("whole_sign");
			expect(request.options.node).toBe("mean");
			expect(request.options.bodies).toEqual(["mean_lilith", "true_lilith"]);
			expect(request.options.topocentric).toBe(true);
		});

		test("parses --draconic flag", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(["draconic"]),
			);
			expect(request.options.draconic).toBe(true);
		});

		test("parses the --evolutionary flag", async () => {
			const request = await resolveNatalRequest(
				{
					when: "1981-01-26T00:50",
					lat: "9.242",
					lon: "-74.755",
					zone: "America/Bogota",
				},
				new Set(["evolutionary"]),
			);
			expect(request.options.evolutionary).toBe(true);
		});

		test("rejects non-tropical zodiac values", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						lat: "9.242",
						lon: "-74.755",
						zone: "America/Bogota",
						zodiac: "sidereal",
					},
					new Set(),
				),
			).rejects.toThrow(/zodiac must be "tropical"/);
		});

		test("rejects unknown house system", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						lat: "9.242",
						lon: "-74.755",
						zone: "America/Bogota",
						"house-system": "not_a_system",
					},
					new Set(),
				),
			).rejects.toThrow(/not a known house system/);
		});

		test("rejects unknown extra body with suggestions", async () => {
			expect(
				resolveNatalRequest(
					{
						when: "1981-01-26T00:50",
						lat: "9.242",
						lon: "-74.755",
						zone: "America/Bogota",
						bodies: "fake_body",
					},
					new Set(),
				),
			).rejects.toThrow(/unknown body: fake_body/);
		});

		test("throws VALIDATION_ERROR when required birth flag is missing", async () => {
			expect(
				resolveNatalRequest(
					{
						year: "1990",
						month: "6",
					},
					new Set(),
				),
			).rejects.toThrow(/Missing required flag/);
		});

		test("resolveNatalRequestFromArgs parses raw argv array and returns request", async () => {
			const res = await resolveNatalRequestFromArgs([
				"--when",
				"1981-01-26T00:50",
				"--lat",
				"9.242",
				"--lon",
				"-74.755",
				"--zone",
				"America/Bogota",
			]);
			expect(res.kind).toBe("request");
			if (res.kind === "request") {
				expect(res.request.birth.local.year).toBe(1981);
			}
		});

		test("resolveNatalRequestFromArgs honors boolean flags passed with =", async () => {
			const baseArgs = [
				"--when",
				"1981-01-26T00:50",
				"--lat",
				"9.242",
				"--lon",
				"-74.755",
				"--zone",
				"America/Bogota",
			];

			const enabled = await resolveNatalRequestFromArgs([
				...baseArgs,
				"--draconic=true",
			]);
			expect(enabled.kind).toBe("request");
			if (enabled.kind === "request") {
				expect(enabled.request.options.draconic).toBe(true);
			}

			const disabled = await resolveNatalRequestFromArgs([
				...baseArgs,
				"--draconic=false",
			]);
			expect(disabled.kind).toBe("request");
			if (disabled.kind === "request") {
				expect(disabled.request.options.draconic).toBe(false);
			}
		});

		test("resolveNatalRequestFromArgs rejects invalid boolean flag values", async () => {
			await expect(
				resolveNatalRequestFromArgs(["--draconic=maybe"]),
			).rejects.toThrow(/expects true or false/);
		});

		test("resolveNatalRequestFromArgs handles --help=true", async () => {
			const res = await resolveNatalRequestFromArgs(["--help=true"]);
			expect(res.kind).toBe("help");
		});

		test("resolveNatalRequestFromArgs handles --help flag", async () => {
			const res = await resolveNatalRequestFromArgs(["--help"]);
			expect(res.kind).toBe("help");
		});
	});
});
