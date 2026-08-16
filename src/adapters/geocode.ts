import { openMeteoGeocoder } from "caelus-birth/geocode";
import type { GeocodeResult, Geocoder } from "../core/types";

export type { GeocodeResult, Geocoder };

export { openMeteoGeocoder };

/**
 * Creates an in-memory mock geocoder for tests and offline execution.
 */
export function createMockGeocoder(
	mockData: Record<string, GeocodeResult[]>,
): Geocoder {
	return {
		async search(query: string, limit = 1): Promise<GeocodeResult[]> {
			const results = mockData[query] ?? [];
			return results.slice(0, limit);
		},
	};
}
