import { describe, expect, test } from "bun:test";
import {
	birthSchema,
	birthSuggestions,
	optionsSchema,
	optionsSuggestions,
	parseWith,
} from "../../src/cli/schema";

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

		expect(parseWith(birthSchema, feb("2001", "2"), birthSuggestions).day).toBe(
			2,
		);
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
