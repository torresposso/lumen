import type { NatalChartOutput } from "../natal/types";

export interface NatalPointReference {
	lon: number;
	speed?: number;
}

export function extractNatalPoints(
	natalChart: NatalChartOutput,
): Record<string, NatalPointReference> {
	const points: Record<string, NatalPointReference> = {};

	for (const [bodyId, body] of Object.entries(natalChart.bodies)) {
		points[bodyId] = { lon: body.lon, speed: body.speed };
	}

	points.asc = { lon: natalChart.angles.asc.lon, speed: 0 };
	points.mc = { lon: natalChart.angles.mc.lon, speed: 0 };
	points.vertex = { lon: natalChart.angles.vertex.lon, speed: 0 };
	points.eastPoint = { lon: natalChart.angles.eastPoint.lon, speed: 0 };
	points.pluto = {
		lon: natalChart.pluto.lon,
		speed: natalChart.bodies.pluto?.speed ?? 0,
	};

	if (natalChart.ppp.active) {
		points.ppp = { lon: natalChart.ppp.lon, speed: 0 };
	}

	if (natalChart.nodalAxis.north) {
		points.true_node = { lon: natalChart.nodalAxis.north.lon, speed: 0 };
	}

	if (natalChart.nodalAxis.south) {
		points.south_node = { lon: natalChart.nodalAxis.south.lon, speed: 0 };
	}

	return points;
}
