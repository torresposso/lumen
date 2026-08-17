import type { ChartBody } from "caelus";
import { chartAt } from "./charts";
import type { Ephemeris, NatalRequest } from "./types";
import { findAspect, houseOf, normalizeLongitude, projectPoint } from "./types";

export interface OverlayPoint {
	id: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	kind: "body" | "derived";
}

export interface OverlayChart {
	id: string;
	points: OverlayPoint[];
	cusps: number[];
}

export interface ChartLike {
	bodies: Partial<Record<string, ChartBody>>;
	cusps: number[];
}

function pointFromBody(id: string, body: ChartBody): OverlayPoint {
	return {
		id,
		lon: body.lon,
		sign: body.sign,
		signDeg: body.signDeg,
		house: body.house,
		kind: "body",
	};
}

function derivedPoint(id: string, lon: number, cusps: number[]): OverlayPoint {
	const projected = projectPoint(lon, cusps);
	return {
		id,
		lon: projected.lon,
		sign: projected.sign,
		signDeg: projected.signDeg,
		house: projected.house,
		kind: "derived",
	};
}

/** Normalizes a natal chart into the frame-agnostic overlay used by karma.
 *  The shared chart computation has already applied the true-node canon, so
 *  this never falls back to the mean node. */
export function toOverlayChart(id: string, chart: ChartLike): OverlayChart {
	const points: OverlayPoint[] = [];
	const bodies = chart.bodies;
	const northNode = bodies.true_node;

	for (const [bodyId, body] of Object.entries(bodies)) {
		if (body === undefined) continue;
		if (bodyId === "true_node" || bodyId === "mean_node") continue;
		points.push(pointFromBody(bodyId, body));
	}

	if (northNode !== undefined) {
		points.push(pointFromBody("north_node", northNode));
		points.push(
			derivedPoint(
				"south_node",
				normalizeLongitude(northNode.lon + 180),
				chart.cusps,
			),
		);
	}

	if (bodies.pluto !== undefined) {
		points.push(
			derivedPoint(
				"polarity_point",
				normalizeLongitude(bodies.pluto.lon + 180),
				chart.cusps,
			),
		);
	}

	return { id, points, cusps: chart.cusps };
}

// ============================================================================
// JWG evolutionary karma
// ============================================================================

export interface KarmaContact {
	aBody: string;
	bBody: string;
	aspect: string;
	orb: number;
	signA: string;
	signB: string;
	houseA: number;
	houseB: number;
}

export interface NodalOverlay {
	node: "north_node" | "south_node";
	fromPerson: string;
	inHouseOfPerson: string;
	house: number;
	sign: string;
}

export interface KarmaResult {
	pair: {
		a: string;
		b: string;
	};
	contacts: KarmaContact[];
	overlays: NodalOverlay[];
	summary: {
		totalContacts: number;
		plutoContacts: number;
		nodalContacts: number;
		contactsDescription: string;
	};
}

const EA_KARMA_POINTS = new Set([
	"pluto",
	"north_node",
	"south_node",
	"polarity_point",
]);

const KARMA_ASPECT_DEFS = (orb: number) => [
	{ name: "conjunction", target: 0, orb },
	{ name: "opposition", target: 180, orb },
	{ name: "square", target: 90, orb },
	{ name: "trine", target: 120, orb },
	{ name: "sextile", target: 60, orb },
	{ name: "quincunx", target: 150, orb },
];

/**
 * Computes inter-chart karmic dynamics and evolutionary synastry between two validated requests.
 */
export function computeKarma(
	idA: string,
	requestA: NatalRequest,
	idB: string,
	requestB: NatalRequest,
	ephemeris: Ephemeris,
	orb = 3,
): KarmaResult {
	const chartA = chartAt(requestA, requestA.birth.jdUt, ephemeris);
	const chartB = chartAt(requestB, requestB.birth.jdUt, ephemeris);
	const overlayA = toOverlayChart(idA, chartA);
	const overlayB = toOverlayChart(idB, chartB);
	const defs = KARMA_ASPECT_DEFS(orb);

	const contacts: KarmaContact[] = [];

	for (const pA of overlayA.points) {
		for (const pB of overlayB.points) {
			const isEa = EA_KARMA_POINTS.has(pA.id) || EA_KARMA_POINTS.has(pB.id);
			if (!isEa) continue;

			const aspect = findAspect(pA.lon, pB.lon, defs);
			if (aspect && aspect.orb <= orb) {
				contacts.push({
					aBody: pA.id,
					bBody: pB.id,
					aspect: aspect.aspect,
					orb: aspect.orb,
					signA: pA.sign,
					signB: pB.sign,
					houseA: pA.house,
					houseB: pB.house,
				});
			}
		}
	}

	contacts.sort((x, y) => x.orb - y.orb);

	const overlays: NodalOverlay[] = [];

	const nnA = overlayA.points.find((p) => p.id === "north_node");
	const snA = overlayA.points.find((p) => p.id === "south_node");
	const nnB = overlayB.points.find((p) => p.id === "north_node");
	const snB = overlayB.points.find((p) => p.id === "south_node");

	if (nnA) {
		overlays.push({
			node: "north_node",
			fromPerson: idA,
			inHouseOfPerson: idB,
			house: houseOf(overlayB.cusps, nnA.lon),
			sign: nnA.sign,
		});
	}
	if (snA) {
		overlays.push({
			node: "south_node",
			fromPerson: idA,
			inHouseOfPerson: idB,
			house: houseOf(overlayB.cusps, snA.lon),
			sign: snA.sign,
		});
	}
	if (nnB) {
		overlays.push({
			node: "north_node",
			fromPerson: idB,
			inHouseOfPerson: idA,
			house: houseOf(overlayA.cusps, nnB.lon),
			sign: nnB.sign,
		});
	}
	if (snB) {
		overlays.push({
			node: "south_node",
			fromPerson: idB,
			inHouseOfPerson: idA,
			house: houseOf(overlayA.cusps, snB.lon),
			sign: snB.sign,
		});
	}

	const plutoCount = contacts.filter(
		(c) =>
			c.aBody === "pluto" ||
			c.bBody === "pluto" ||
			c.aBody === "polarity_point" ||
			c.bBody === "polarity_point",
	).length;
	const nodalCount = contacts.filter(
		(c) =>
			c.aBody === "north_node" ||
			c.bBody === "north_node" ||
			c.aBody === "south_node" ||
			c.bBody === "south_node",
	).length;

	const contactsDescription =
		contacts.length === 0
			? `0 contacts found within orb ${orb}°`
			: `${contacts.length} evolutionary contacts within orb ${orb}°`;

	return {
		pair: { a: idA, b: idB },
		contacts,
		overlays,
		summary: {
			totalContacts: contacts.length,
			plutoContacts: plutoCount,
			nodalContacts: nodalCount,
			contactsDescription,
		},
	};
}
