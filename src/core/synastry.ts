import type { ChartBody } from "caelus";
import {
	type AspectDef,
	findAspect,
	houseOf,
	normalizeLongitude,
	projectPoint,
	signOf,
} from "./celestial-coordinates";

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

const OVERLAY_POINTS = [
	"pluto",
	"north_node",
	"south_node",
	"polarity_point",
] as const;

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

/** Normalizes a natal or draconic chart into a frame-agnostic set of points
 *  ready for cross-chart comparison. */
export function toSynastryChart(id: string, chart: ChartLike): SynastryChart {
	const points: SynastryPoint[] = [];
	const bodies = chart.bodies;
	const northNode = bodies.true_node ?? bodies.mean_node;

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

/** Computes cross-aspect contacts and house overlays between two charts.
 *  The default focus is evolutionary: contacts involving Pluto, the nodes,
 *  the derived South Node, or the Pluto Polarity Point. */
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
			if (
				!OVERLAY_POINTS.includes(point.id as (typeof OVERLAY_POINTS)[number])
			) {
				continue;
			}
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
