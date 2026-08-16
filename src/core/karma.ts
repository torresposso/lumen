import { findAspect, houseOf } from "./types";

// ============================================================================
// Synastry primitives
// ============================================================================

import type { ChartBody } from "caelus";
import {
	type AspectDef,
	normalizeLongitude,
	projectPoint,
	signOf,
} from "./types";

export interface SynastryPoint {
	id: string;
	lon: number;
	sign: string;
	signDeg: number;
	house: number;
	kind: "body" | "derived";
}

export interface SynastryChart {
	id: string;
	points: SynastryPoint[];
	cusps: number[];
}

export interface SynastryContact {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	kind: "evolutionary" | "classical";
	aSign?: string;
	bSign?: string;
	aHouse?: number;
	bHouse?: number;
}

export interface SynastryOverlay {
	body: string;
	from: string;
	to: string;
	sign: string;
	house: number;
}

export interface SynastryOptions {
	orb?: number;
	focus?: "evolutionary" | "classical" | "all";
}

export interface SynastryResult {
	pair: string;
	summary: {
		contacts: number;
		evolutionary: number;
		classical: number;
		overlays: number;
		strongest?: string;
	};
	contacts: SynastryContact[];
	overlays: SynastryOverlay[];
}

export interface ChartLike {
	bodies: Partial<Record<string, ChartBody>>;
	cusps: number[];
}

const EVOLUTIONARY_POINTS = new Set([
	"pluto",
	"north_node",
	"south_node",
	"polarity_point",
]);

function pointFromBody(id: string, body: ChartBody): SynastryPoint {
	return {
		id,
		lon: body.lon,
		sign: body.sign,
		signDeg: body.signDeg,
		house: body.house,
		kind: "body",
	};
}

function derivedPoint(id: string, lon: number, cusps: number[]): SynastryPoint {
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

/** Normalizes a natal or draconic chart into a frame-agnostic set of points. */
export function toSynastryChart(
	id: string,
	chart: ChartLike,
	nodeMode: "both" | "mean" | "true" = "both",
): SynastryChart {
	const points: SynastryPoint[] = [];
	const bodies = chart.bodies;
	const northNode =
		nodeMode === "mean"
			? (bodies.mean_node ?? bodies.true_node)
			: (bodies.true_node ?? bodies.mean_node);

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

const SYNASTRY_ASPECTS: AspectDef[] = [
	{ name: "conjunction", target: 0, orb: 3 },
	{ name: "opposition", target: 180, orb: 3 },
	{ name: "square", target: 90, orb: 3 },
	{ name: "trine", target: 120, orb: 3 },
	{ name: "sextile", target: 60, orb: 3 },
	{ name: "quincunx", target: 150, orb: 3 },
];

function aspectDefs(orb: number): AspectDef[] {
	return SYNASTRY_ASPECTS.map((aspect) => ({ ...aspect, orb }));
}

function isEvolutionary(pointId: string): boolean {
	return EVOLUTIONARY_POINTS.has(pointId);
}

function contactKind(a: SynastryPoint, b: SynastryPoint) {
	return isEvolutionary(a.id) || isEvolutionary(b.id)
		? "evolutionary"
		: "classical";
}

function contactMatchesFocus(
	kind: SynastryContact["kind"],
	focus: NonNullable<SynastryOptions["focus"]>,
): boolean {
	if (focus === "all") return true;
	return focus === kind;
}

function overlayMatchesFocus(
	pointId: string,
	focus: NonNullable<SynastryOptions["focus"]>,
): boolean {
	if (focus === "all") return true;
	return focus === (isEvolutionary(pointId) ? "evolutionary" : "classical");
}

/** Computes cross-aspect contacts and house overlays between two charts. */
export function computeSynastry(
	chartA: SynastryChart,
	chartB: SynastryChart,
	options: SynastryOptions = {},
): SynastryResult {
	const orb = options.orb ?? 3;
	const focus = options.focus ?? "evolutionary";
	const defs = aspectDefs(orb);

	const contacts: SynastryContact[] = [];
	for (const pointA of chartA.points) {
		for (const pointB of chartB.points) {
			const match = findAspect(pointA.lon, pointB.lon, defs);
			if (match === undefined) continue;
			const kind = contactKind(pointA, pointB);
			if (!contactMatchesFocus(kind, focus)) continue;
			contacts.push({
				a: `${chartA.id}.${pointA.id}`,
				b: `${chartB.id}.${pointB.id}`,
				aspect: match.aspect,
				orb: match.orb,
				kind,
				aSign: pointA.sign,
				bSign: pointB.sign,
				aHouse: pointA.house,
				bHouse: pointB.house,
			});
		}
	}
	contacts.sort(
		(a, b) => a.orb - b.orb || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
	);

	const overlays: SynastryOverlay[] = [];
	for (const [fromChart, toChart] of [
		[chartA, chartB],
		[chartB, chartA],
	] as const) {
		for (const point of fromChart.points) {
			if (!overlayMatchesFocus(point.id, focus)) continue;
			const house = houseOf(toChart.cusps, point.lon);
			overlays.push({
				body: `${fromChart.id}.${point.id}`,
				from: fromChart.id,
				to: toChart.id,
				sign: signOf(point.lon),
				house,
			});
		}
	}
	overlays.sort(
		(a, b) =>
			a.from.localeCompare(b.from) ||
			a.to.localeCompare(b.to) ||
			a.body.localeCompare(b.body),
	);

	const evolutionary = contacts.filter(
		(contact) => contact.kind === "evolutionary",
	).length;
	const classical = contacts.length - evolutionary;
	const strongest = contacts[0];

	return {
		pair: `${chartA.id} × ${chartB.id}`,
		summary: {
			contacts: contacts.length,
			evolutionary,
			classical,
			overlays: overlays.length,
			strongest: strongest
				? `${strongest.a} ${strongest.aspect} ${strongest.b} (${strongest.orb.toFixed(2)}°)`
				: undefined,
		},
		contacts,
		overlays,
	};
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
 * Computes inter-chart karmic dynamics and evolutionary synastry between two charts.
 */
export function computeKarma(
	idA: string,
	chartA: ChartLike,
	idB: string,
	chartB: ChartLike,
	orb = 3,
): KarmaResult {
	const synA = toSynastryChart(idA, chartA);
	const synB = toSynastryChart(idB, chartB);
	const defs = KARMA_ASPECT_DEFS(orb);

	const contacts: KarmaContact[] = [];

	for (const pA of synA.points) {
		for (const pB of synB.points) {
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

	const nnA = synA.points.find((p) => p.id === "north_node");
	const snA = synA.points.find((p) => p.id === "south_node");
	const nnB = synB.points.find((p) => p.id === "north_node");
	const snB = synB.points.find((p) => p.id === "south_node");

	if (nnA) {
		overlays.push({
			node: "north_node",
			fromPerson: idA,
			inHouseOfPerson: idB,
			house: houseOf(synB.cusps, nnA.lon),
			sign: nnA.sign,
		});
	}
	if (snA) {
		overlays.push({
			node: "south_node",
			fromPerson: idA,
			inHouseOfPerson: idB,
			house: houseOf(synB.cusps, snA.lon),
			sign: snA.sign,
		});
	}
	if (nnB) {
		overlays.push({
			node: "north_node",
			fromPerson: idB,
			inHouseOfPerson: idA,
			house: houseOf(synA.cusps, nnB.lon),
			sign: nnB.sign,
		});
	}
	if (snB) {
		overlays.push({
			node: "south_node",
			fromPerson: idB,
			inHouseOfPerson: idA,
			house: houseOf(synA.cusps, snB.lon),
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
