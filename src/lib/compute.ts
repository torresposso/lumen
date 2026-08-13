import type { Chart } from "caelus";
import { Engine } from "caelus";
import { embeddedData } from "caelus/data-embedded";
import type { NatalRequest } from "./intake";

/** Node ids to drop from the chart per `--node` selection. The engine always
 *  computes both nodes; this module owns the selection policy so the chart
 *  that leaves the seam is already final. */
const DROPPED_BY_NODE: Record<NatalRequest["options"]["node"], string[]> = {
	both: [],
	mean: ["true_node"],
	true: ["mean_node"],
};

export function computeChart(request: NatalRequest): Chart {
	const { birth, options } = request;
	const engine = new Engine(embeddedData);
	const chart = engine.chartAt(birth.jdUt, birth.lat, birth.lon, {
		houseSystem: options.houseSystem,
		zodiac: options.zodiac,
		bodies: options.bodies,
		topocentric: options.topocentric,
	});
	for (const dropped of DROPPED_BY_NODE[options.node]) {
		delete chart.bodies[dropped];
	}
	return chart;
}
