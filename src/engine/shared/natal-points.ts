import type { NatalChartOutput } from "../natal/types";
import { lonFromSignDeg } from "./geometry";

export interface NatalPointReference {
	lon: number;
	speed?: number;
}

export function extractNatalPoints(
	natalChart: NatalChartOutput,
): Record<string, NatalPointReference> {
	const points: Record<string, NatalPointReference> = {};

	for (const [bodyId, body] of Object.entries(natalChart.bodies)) {
		points[bodyId] = {
			lon: lonFromSignDeg(body.sign, body.signDeg),
			speed: 0,
		};
	}

	points.asc = {
		lon: lonFromSignDeg(
			natalChart.angles.asc.sign,
			natalChart.angles.asc.signDeg,
		),
		speed: 0,
	};
	points.mc = {
		lon: lonFromSignDeg(
			natalChart.angles.mc.sign,
			natalChart.angles.mc.signDeg,
		),
		speed: 0,
	};
	points.vertex = {
		lon: lonFromSignDeg(
			natalChart.angles.vertex.sign,
			natalChart.angles.vertex.signDeg,
		),
		speed: 0,
	};
	points.eastPoint = {
		lon: lonFromSignDeg(
			natalChart.angles.eastPoint.sign,
			natalChart.angles.eastPoint.signDeg,
		),
		speed: 0,
	};

	const pluto = natalChart.bodies.pluto;
	if (pluto) {
		points.pluto = {
			lon: lonFromSignDeg(pluto.sign, pluto.signDeg),
			speed: 0,
		};
	}

	if (natalChart.evolutionary.ppp.active) {
		points.ppp = {
			lon: lonFromSignDeg(
				natalChart.evolutionary.ppp.sign,
				natalChart.evolutionary.ppp.signDeg,
			),
			speed: 0,
		};
	}

	if (natalChart.evolutionary.nodalAxis.north) {
		points.true_node = {
			lon: lonFromSignDeg(
				natalChart.evolutionary.nodalAxis.north.sign,
				natalChart.evolutionary.nodalAxis.north.signDeg,
			),
			speed: 0,
		};
	}

	if (natalChart.evolutionary.nodalAxis.south) {
		points.south_node = {
			lon: lonFromSignDeg(
				natalChart.evolutionary.nodalAxis.south.sign,
				natalChart.evolutionary.nodalAxis.south.signDeg,
			),
			speed: 0,
		};
	}

	return points;
}
