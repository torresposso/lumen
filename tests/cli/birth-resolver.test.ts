import { describe, expect, it } from "bun:test";
import {
	mergeBirthInput,
	parseWhen,
	resolveBirth,
} from "../../src/commands/intake";

describe("birth-resolver", () => {
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

	it("merges --when flags into birth inputs", async () => {
		const fakeGeocoder = {
			search: async () => [],
		};

		const merged = await mergeBirthInput(
			{
				when: "1981-01-26T00:50",
				lat: "9.24",
				lon: "-74.75",
			},
			fakeGeocoder,
		);

		expect(merged.year).toBe(1981);
		expect(merged.month).toBe(1);
		expect(merged.day).toBe(26);
		expect(merged.hour).toBe(0);
		expect(merged.minute).toBe(50);
		expect(merged.lat).toBe("9.24");
		expect(merged.lon).toBe("-74.75");
	});

	it("resolves birth inputs to UT and timezone provenance", () => {
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
	});
});
