import { AxiError } from "axi-sdk-js";
import type { Chart, ChartBodies } from "caelus";
import { shiftLongitude, signOf } from "./zodiac";

/** Re-projects a natal chart onto the lunar-node zodiac by subtracting the North
 *  Node's longitude from all positions, placing the North Node at 0° Aries.
 *  Preserves aspects and angular separations. */
export function toDraconicChart<T extends Chart>(
	chart: T,
	nodeMode: "both" | "mean" | "true",
): T {
	const nodeLon =
		nodeMode === "mean"
			? chart.bodies.mean_node?.lon
			: (chart.bodies.true_node?.lon ?? chart.bodies.mean_node?.lon);

	if (nodeLon === undefined) {
		throw new AxiError(
			"Cannot compute Draconic chart: no lunar node position found in chart",
			"INVALID_VALUE",
			["Ensure true_node or mean_node is calculated"],
		);
	}

	const shift = (lon: number): number => shiftLongitude(lon, nodeLon);

	const shiftedBodies: ChartBodies = { ...chart.bodies };
	for (const [id, body] of Object.entries(shiftedBodies)) {
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

	const shiftedAngles = {
		asc: shift(chart.angles.asc),
		mc: shift(chart.angles.mc),
		vertex: shift(chart.angles.vertex),
		eastPoint: shift(chart.angles.eastPoint),
	};

	const shiftedCusps = chart.cusps.map((cusp) => shift(cusp));

	return {
		...chart,
		bodies: shiftedBodies,
		angles: shiftedAngles,
		cusps: shiftedCusps,
	};
}
