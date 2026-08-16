import type { Chart } from "caelus";
import {
	computeFixedStarMatches,
	computeHermeticLots,
	type FixedStarMatch,
	type LotsResult,
} from "./classical-extensions";
import { type DraconicChart, toDraconicChart } from "./draconic-zodiac";
import type { Ephemeris } from "./ephemeris-gateway";
import type { ResolvedBirth } from "./types";

export type { DraconicChart, FixedStarMatch, LotsResult };

export { computeFixedStarMatches, computeHermeticLots, toDraconicChart };

export interface ClassicalProjections {
	draconic?: DraconicChart;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
}

/**
 * High-level pure calculation facade for auxiliary classical and draconic projections.
 */
export function computeClassicalProjections(
	chart: Chart,
	birth: ResolvedBirth,
	ephemeris: Ephemeris,
	options: {
		draconic?: boolean;
		lots?: boolean;
		stars?: boolean;
		nodeMode?: "both" | "mean" | "true";
	} = {},
): ClassicalProjections {
	const result: ClassicalProjections = {};

	if (options.draconic) {
		result.draconic = toDraconicChart(chart, options.nodeMode ?? "both");
	}

	if (options.lots) {
		result.lots = computeHermeticLots(ephemeris, birth, chart.cusps);
	}

	if (options.stars) {
		result.stars = computeFixedStarMatches(
			ephemeris,
			birth,
			chart.bodies,
			chart.angles,
		);
	}

	return result;
}
