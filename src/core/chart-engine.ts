import type { Chart } from "caelus";
import type { NatalRequest } from "../cli/intake";
import { toDraconicChart } from "./draconic";
import { CaelusEphemeris, type Ephemeris } from "./ephemeris";
import {
	computeEvolutionaryReading,
	type EvolutionaryResult,
} from "./evolutionary";
import {
	applyExtensions,
	type EclipseInfo,
	type EclipsesResult,
	type FixedStarMatch,
	type LotsResult,
} from "./extensions";

export type { EclipseInfo, EclipsesResult, FixedStarMatch, LotsResult };

export interface LumenChart extends Chart {
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
}

/** Node ids to drop from the chart per `--node` selection. The engine always
 *  computes both nodes; this module owns the selection policy so the chart
 *  that leaves the seam is already final. */
const DROPPED_BY_NODE: Record<NatalRequest["options"]["node"], string[]> = {
	both: [],
	mean: ["true_node"],
	true: ["mean_node"],
};

/** Facade module for astrological feature analysis (Draconic shifts,
 *  Hermetic Lots, prenatal eclipses, fixed stars, and evolutionary readings). */
export class AstrologicalAnalysis {
	static analyze(
		chart: LumenChart,
		request: NatalRequest,
		ephemeris: Ephemeris,
	): LumenChart {
		const { birth, options } = request;
		let result = applyExtensions(ephemeris, chart, birth, options);

		if (options.draconic) {
			result = toDraconicChart(result, options.node);
		}

		if (options.evolutionary) {
			result.evolutionary = computeEvolutionaryReading(result);
		}

		for (const dropped of DROPPED_BY_NODE[options.node]) {
			delete result.bodies[dropped];
		}

		return result;
	}
}

export class AstrologicalEngine {
	private ephemeris: Ephemeris;

	constructor(ephemeris?: Ephemeris) {
		this.ephemeris = ephemeris ?? new CaelusEphemeris();
	}

	compute(request: NatalRequest): LumenChart {
		const { birth, options } = request;
		const rawChart: LumenChart = this.ephemeris.chartAt(
			birth.jdUt,
			birth.lat,
			birth.lon,
			{
				houseSystem: options.houseSystem,
				zodiac: options.zodiac,
				bodies: options.bodies,
				topocentric: options.topocentric,
			},
		);

		return AstrologicalAnalysis.analyze(rawChart, request, this.ephemeris);
	}
}

/** Backward-compatible helper wrapping the default AstrologicalEngine instance. */
export function computeChart(request: NatalRequest): LumenChart {
	const defaultEngine = new AstrologicalEngine();
	return defaultEngine.compute(request);
}
