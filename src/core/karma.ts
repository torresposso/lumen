import { findAspect, houseOf } from "./celestial-coordinates";
import { type ChartLike, toSynastryChart } from "./synastry";

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

	// Sort contacts by orb
	contacts.sort((x, y) => x.orb - y.orb);

	// Nodal overlays
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
