import { AxiError } from "axi-sdk-js";
import type { Chart, ChartBodies } from "caelus";
import { shiftLongitude, signOf } from "./zodiac";

export interface DraconicChart {
	nodeUsed: "true_node" | "mean_node";
	bodies: Chart["bodies"];
	angles: Chart["angles"];
	cusps: number[];
}

/** Re-projects a natal chart onto the lunar-node zodiac by subtracting the North
 *  Node's longitude from all positions, placing the North Node at 0° Aries.
 *  Returns a complete DraconicChart entity with node provenance and unrequested nodes pruned. */
export function toDraconicChart(
	chart: Chart,
	nodeMode: "both" | "mean" | "true",
): DraconicChart {
	const nodeUsed: DraconicChart["nodeUsed"] =
		nodeMode === "mean" || chart.bodies.true_node === undefined
			? "mean_node"
			: "true_node";

	const nodeBody = chart.bodies[nodeUsed];
	if (nodeBody === undefined) {
		throw new AxiError(
			"Cannot compute Draconic chart: no lunar node position found in chart",
			"INVALID_VALUE",
			["Ensure true_node or mean_node is calculated"],
		);
	}

	const nodeLon = nodeBody.lon;
	const shift = (lon: number): number => shiftLongitude(lon, nodeLon);

	const shiftedBodies: ChartBodies = {};
	for (const [id, body] of Object.entries(chart.bodies)) {
		if (body !== undefined) {
			const lon = shift(body.lon);
			shiftedBodies[id] = {
				...body,
				lon,
				sign: signOf(lon),
				signDeg: lon % 30,
			};
		}
	}

	if (nodeMode === "mean") {
		delete shiftedBodies.true_node;
	} else if (nodeMode === "true") {
		delete shiftedBodies.mean_node;
	}

	const shiftedAngles = {
		asc: shift(chart.angles.asc),
		mc: shift(chart.angles.mc),
		vertex: shift(chart.angles.vertex),
		eastPoint: shift(chart.angles.eastPoint),
	};

	const shiftedCusps = chart.cusps.map((cusp) => shift(cusp));

	return {
		nodeUsed,
		bodies: shiftedBodies,
		angles: shiftedAngles,
		cusps: shiftedCusps,
	};
}
