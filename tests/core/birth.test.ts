import { describe, expect, it } from "bun:test";
import {
	birthSchema,
	hasClockFlags,
	mergeBirthInput,
	parseWhen,
} from "../../src/commands/client";
import { resolveBirth } from "../../src/core/birth";
import type { Geocoder } from "../../src/core/types";

describe("core/birth", () => {
	it("parses valid ISO and dd/mm/yyyy --when formats", () => {
		expect(parseWhen("1981-01-26T00:50")).toEqual({
			year: 1981,
			month: 1,
			day: 26,
			hour: 0,
			minute: 50,
		});

		expect(parseWhen("26/01/1981 14:30")).toEqual({
			year: 1981,
			month: 1,
			day: 26,
			hour: 14,
			minute: 30,
		});

		expect(parseWhen("1995-12-05")).toEqual({
			year: 1995,
			month: 12,
			day: 5,
			hour: 0,
			minute: 0,
		});
	});

	it("detects clock flags presence accurately", () => {
		expect(hasClockFlags({ year: 1990 })).toBe(true);
		expect(hasClockFlags({ month: 5 })).toBe(true);
		expect(hasClockFlags({ lat: 10, lon: 20 })).toBe(false);
	});

	it("validates birth schema constraints", () => {
		const valid = birthSchema.safeParse({
			year: 1990,
			month: 6,
			day: 15,
			hour: 12,
			minute: 30,
			lat: 40.7128,
			lon: -74.006,
			zone: "America/New_York",
		});
		expect(valid.success).toBe(true);

		const invalidDay = birthSchema.safeParse({
			year: 2021,
			month: 2,
			day: 29, // not a leap year
			hour: 12,
			minute: 0,
			lat: 0,
			lon: 0,
		});
		expect(invalidDay.success).toBe(false);
	});

	it("merges --when flags and handles geocoder lookup", async () => {
		const fakeGeocoder: Geocoder = {
			search: async (q: string) => {
				if (q === "Bogota") {
					return [
						{
							name: "Bogota, Colombia",
							lat: 4.711,
							lon: -74.0721,
							timezone: "America/Bogota",
						},
					];
				}
				return [];
			},
		};

		const merged = await mergeBirthInput(
			{
				when: "1981-01-26T00:50",
				place: "Bogota",
			},
			fakeGeocoder,
		);

		expect(merged.year).toBe(1981);
		expect(merged.month).toBe(1);
		expect(merged.day).toBe(26);
		expect(merged.hour).toBe(0);
		expect(merged.minute).toBe(50);
		expect(merged.lat).toBe(4.711);
		expect(merged.lon).toBe(-74.0721);
		expect(merged.zone).toBe("America/Bogota");
	});

	it("resolves birth inputs to UT Julian Day and timezone provenance", () => {
		const resolved = resolveBirth({
			year: 1981,
			month: 1,
			day: 26,
			hour: 0,
			minute: 50,
			lat: 9.24,
			lon: -74.75,
			zone: "America/Bogota",
		});

		expect(resolved.local.year).toBe(1981);
		expect(resolved.zone).toBe("America/Bogota");
		expect(resolved.status).toBe("ok");
		expect(typeof resolved.jdUt).toBe("number");
		expect(resolved.offsetMinutes).toBe(-300);
	});
});
