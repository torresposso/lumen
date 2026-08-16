import { describe, expect, it } from "bun:test";
import {
	createMockGeocoder,
	openMeteoGeocoder,
} from "../../src/adapters/geocode";

describe("adapters/geocode", () => {
	it("exposes openMeteoGeocoder with a search method", () => {
		expect(typeof openMeteoGeocoder.search).toBe("function");
	});

	it("creates a mock geocoder that returns preconfigured results", async () => {
		const mock = createMockGeocoder({
			"Tampa, FL": [
				{
					name: "Tampa, FL",
					lat: 27.9506,
					lon: -82.4572,
					timezone: "America/New_York",
				},
			],
		});

		const results = await mock.search("Tampa, FL");
		expect(results).toHaveLength(1);
		expect(results[0]?.name).toBe("Tampa, FL");
		expect(results[0]?.lat).toBe(27.9506);
		expect(results[0]?.lon).toBe(-82.4572);
		expect(results[0]?.timezone).toBe("America/New_York");

		const emptyResults = await mock.search("Unknown Location");
		expect(emptyResults).toEqual([]);
	});

	it("respects limit in mock geocoder", async () => {
		const mock = createMockGeocoder({
			multi: [
				{ name: "Spot 1", lat: 1, lon: 1 },
				{ name: "Spot 2", lat: 2, lon: 2 },
			],
		});

		const single = await mock.search("multi", 1);
		expect(single).toHaveLength(1);
		expect(single[0]?.name).toBe("Spot 1");
	});
});
