import type {
	AspectPhase,
	Chart,
	ChartBody,
	HouseSystem,
	Zodiac,
} from "caelus";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest,
	ResolvedBirth,
} from "../cli/natal-intake";
import {
	findDeclinationAspect,
	projectPoint,
	roundPrecision as round,
} from "./celestial-coordinates";

import {
	computeFixedStarMatches,
	computeHermeticLots,
	type FixedStarMatch,
	type LotsResult,
} from "./classical-extensions";
import { type DraconicChart, toDraconicChart } from "./draconic-zodiac";
import { CaelusEphemeris, type Ephemeris } from "./ephemeris-gateway";
import {
	computeEvolutionaryReading,
	type EvolutionaryResult,
} from "./evolutionary-astrology";
import {
	computePrenatalEclipses,
	type EclipseInfo,
	type EclipsesResult,
} from "./prenatal-eclipses";

export type {
	DraconicChart,
	EclipseInfo,
	EclipsesResult,
	FixedStarMatch,
	LotsResult,
};

export interface LonProjection {
	lon: number;
	sign: string;
	signDeg: number;
}

export interface AspectProjection {
	a: string;
	b: string;
	aspect: string;
	orb: number;
	phase: AspectPhase;
	strength: number;
}

export interface DeclinationAspectProjection {
	a: string;
	b: string;
	aspect: "parallel" | "contraparallel";
	orb: number;
}

export interface AspectPattern {
	type:
		| "grand_trine"
		| "t_square"
		| "grand_cross"
		| "yod"
		| "kite"
		| "stellium";
	bodies: string[];
	apex?: string;
	element?: "fire" | "earth" | "air" | "water";
	modality?: "cardinal" | "fixed" | "mutable";
}

export interface ChartSignature {
	hemispheres: {
		eastern: number;
		western: number;
		northern: number;
		southern: number;
	};
	quadrants: {
		q1: number;
		q2: number;
		q3: number;
		q4: number;
	};
	elements: {
		fire: number;
		earth: number;
		air: number;
		water: number;
	};
	modalities: {
		cardinal: number;
		fixed: number;
		mutable: number;
	};
}

export interface InterpretationContext {
	atoms: string[];
}

export interface Projection {
	meta: {
		jdUt: number;
		zodiac: Zodiac;
		houseSystem: HouseSystem;
		houseSystemRequested: HouseSystem;
		unavailable: string[];
	};
	bodies: Partial<Record<string, ChartBody>>;
	angles: {
		asc: LonProjection;
		mc: LonProjection;
		vertex: LonProjection;
		eastPoint: LonProjection;
	};
	cusps: LonProjection[];
	aspects: AspectProjection[];
	declinationAspects?: DeclinationAspectProjection[];
	patterns?: AspectPattern[];
	signature?: ChartSignature;
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicProjection;
}

export interface DraconicProjection {
	nodeUsed: "true_node" | "mean_node";
	bodies: Partial<Record<string, ChartBody>>;
	angles: {
		asc: LonProjection;
		mc: LonProjection;
		vertex: LonProjection;
		eastPoint: LonProjection;
	};
	cusps: LonProjection[];
}

export interface BirthEcho {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	lat: number;
	lon: number;
	zone: string;
	offsetMinutes: number;
	dst: boolean;
	status: BirthStatus;
	requested: ChartRequestOptions;
}

export type AstrologicalReading = {
	chart: Projection & { birth: BirthEcho };
	summary: {
		bodies: number;
		aspects: number;
		applying: number;
		separating: number;
		exact: number;
	};
	interpretationContext?: InterpretationContext;
	help?: string[];
};

/** Node ids to drop from the chart per `--node` selection. The engine always
 *  computes both nodes; this module owns the selection policy so the chart
 *  that leaves the seam is already final. */
const DROPPED_BY_NODE: Record<NatalRequest["options"]["node"], string[]> = {
	both: [],
	mean: ["true_node"],
	true: ["mean_node"],
};

function renderLon(input: number | { lon: number }): LonProjection {
	const rawLon = typeof input === "number" ? input : input.lon;
	const { lon, sign, signDeg } = projectPoint(rawLon);
	return { lon, sign, signDeg };
}

function projectBodies(
	source: Chart["bodies"],
): Partial<Record<string, ChartBody>> {
	const bodies: Partial<Record<string, ChartBody>> = {};
	for (const [id, body] of Object.entries(source)) {
		if (body === undefined) continue;
		bodies[id] = {
			lon: round(body.lon),
			sign: body.sign,
			signDeg: round(body.signDeg),
			house: body.house,
			retrograde: body.retrograde,
			speed: round(body.speed, 6),
			lat: round(body.lat),
			dist: body.dist === null ? null : round(body.dist),
			ra: round(body.ra),
			dec: round(body.dec),
			dignities: body.dignities,
		};
	}
	return bodies;
}

function projectAngles(angles: Chart["angles"]): Projection["angles"] {
	return {
		asc: renderLon(angles.asc),
		mc: renderLon(angles.mc),
		vertex: renderLon(angles.vertex),
		eastPoint: renderLon(angles.eastPoint),
	};
}

function projectDraconic(draconic: DraconicChart): DraconicProjection {
	return {
		nodeUsed: draconic.nodeUsed,
		bodies: projectBodies(draconic.bodies),
		angles: projectAngles(draconic.angles),
		cusps: draconic.cusps.map((c) => renderLon(c)),
	};
}

interface ProjectionInput {
	chart: Chart;
	bodies: Chart["bodies"];
	eclipses?: EclipsesResult;
	lots?: LotsResult;
	stars?: FixedStarMatch[];
	evolutionary?: EvolutionaryResult;
	draconic?: DraconicChart;
}

const SIGN_ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> = {
	Aries: "fire",
	Leo: "fire",
	Sagittarius: "fire",
	Taurus: "earth",
	Virgo: "earth",
	Capricorn: "earth",
	Gemini: "air",
	Libra: "air",
	Aquarius: "air",
	Cancer: "water",
	Scorpio: "water",
	Pisces: "water",
};

const SIGN_MODALITIES: Record<string, "cardinal" | "fixed" | "mutable"> = {
	Aries: "cardinal",
	Cancer: "cardinal",
	Libra: "cardinal",
	Capricorn: "cardinal",
	Taurus: "fixed",
	Leo: "fixed",
	Scorpio: "fixed",
	Aquarius: "fixed",
	Gemini: "mutable",
	Virgo: "mutable",
	Sagittarius: "mutable",
	Pisces: "mutable",
};

function computeChartSignature(
	bodies: Partial<Record<string, ChartBody>>,
): ChartSignature {
	const signature: ChartSignature = {
		hemispheres: { eastern: 0, western: 0, northern: 0, southern: 0 },
		quadrants: { q1: 0, q2: 0, q3: 0, q4: 0 },
		elements: { fire: 0, earth: 0, air: 0, water: 0 },
		modalities: { cardinal: 0, fixed: 0, mutable: 0 },
	};

	const CORE_BODIES = new Set([
		"sun",
		"moon",
		"mercury",
		"venus",
		"mars",
		"jupiter",
		"saturn",
		"uranus",
		"neptune",
		"pluto",
	]);

	for (const [id, body] of Object.entries(bodies)) {
		if (!body || !CORE_BODIES.has(id)) continue;

		const h = body.house;
		if ([10, 11, 12, 1, 2, 3].includes(h)) signature.hemispheres.eastern++;
		if ([4, 5, 6, 7, 8, 9].includes(h)) signature.hemispheres.western++;
		if ([7, 8, 9, 10, 11, 12].includes(h)) signature.hemispheres.southern++;
		if ([1, 2, 3, 4, 5, 6].includes(h)) signature.hemispheres.northern++;

		if ([1, 2, 3].includes(h)) signature.quadrants.q1++;
		else if ([4, 5, 6].includes(h)) signature.quadrants.q2++;
		else if ([7, 8, 9].includes(h)) signature.quadrants.q3++;
		else if ([10, 11, 12].includes(h)) signature.quadrants.q4++;

		const el = SIGN_ELEMENTS[body.sign];
		if (el) signature.elements[el]++;

		const mod = SIGN_MODALITIES[body.sign];
		if (mod) signature.modalities[mod]++;
	}

	return signature;
}

function computeDeclinationAspects(
	bodies: Partial<Record<string, ChartBody>>,
): DeclinationAspectProjection[] {
	const results: DeclinationAspectProjection[] = [];
	const entries = Object.entries(bodies).filter(
		([_, b]) => b !== undefined,
	) as [string, ChartBody][];

	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			const entryI = entries[i];
			const entryJ = entries[j];
			if (!entryI || !entryJ) continue;
			const [idA, bodyA] = entryI;
			const [idB, bodyB] = entryJ;
			if (bodyA.dec !== undefined && bodyB.dec !== undefined) {
				const match = findDeclinationAspect(bodyA.dec, bodyB.dec);
				if (match) {
					results.push({
						a: idA,
						b: idB,
						aspect: match.aspect,
						orb: match.orb,
					});
				}
			}
		}
	}
	return results;
}

function detectAspectPatterns(
	aspects: AspectProjection[],
	bodies: Partial<Record<string, ChartBody>>,
): AspectPattern[] {
	const patterns: AspectPattern[] = [];

	const aspectMap = new Map<string, string>();
	for (const asp of aspects) {
		aspectMap.set(`${asp.a}-${asp.b}`, asp.aspect);
		aspectMap.set(`${asp.b}-${asp.a}`, asp.aspect);
	}

	const hasAspect = (a: string, b: string, asp: string) =>
		aspectMap.get(`${a}-${b}`) === asp;

	const bodyKeys = Object.keys(bodies).filter((k) => bodies[k] !== undefined);

	// Detect Stelliums (3+ bodies in the same sign)
	const signGroups: Record<string, string[]> = {};
	for (const k of bodyKeys) {
		const b = bodies[k];
		if (!b) continue;
		signGroups[b.sign] = signGroups[b.sign] ?? [];
		signGroups[b.sign].push(k);
	}
	for (const [sign, members] of Object.entries(signGroups)) {
		if (members.length >= 3) {
			patterns.push({
				type: "stellium",
				bodies: members,
				element: SIGN_ELEMENTS[sign],
				modality: SIGN_MODALITIES[sign],
			});
		}
	}

	// Detect 3-body aspect patterns: Grand Trine, T-Square, Yod
	for (let i = 0; i < bodyKeys.length; i++) {
		for (let j = i + 1; j < bodyKeys.length; j++) {
			for (let k = j + 1; k < bodyKeys.length; k++) {
				const a = bodyKeys[i];
				const b = bodyKeys[j];
				const c = bodyKeys[k];
				if (!a || !b || !c) continue;

				// Grand Trine: a-b, b-c, a-c all trine
				if (
					hasAspect(a, b, "trine") &&
					hasAspect(b, c, "trine") &&
					hasAspect(a, c, "trine")
				) {
					const sign = bodies[a]?.sign;
					patterns.push({
						type: "grand_trine",
						bodies: [a, b, c],
						element: sign ? SIGN_ELEMENTS[sign] : undefined,
					});
				}

				// T-Square: opposition + 2 squares to apex
				if (
					hasAspect(a, b, "opposition") &&
					hasAspect(a, c, "square") &&
					hasAspect(b, c, "square")
				) {
					const signC = bodies[c]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [a, b, c],
						apex: c,
						modality: signC ? SIGN_MODALITIES[signC] : undefined,
					});
				} else if (
					hasAspect(a, c, "opposition") &&
					hasAspect(a, b, "square") &&
					hasAspect(c, b, "square")
				) {
					const signB = bodies[b]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [a, c, b],
						apex: b,
						modality: signB ? SIGN_MODALITIES[signB] : undefined,
					});
				} else if (
					hasAspect(b, c, "opposition") &&
					hasAspect(b, a, "square") &&
					hasAspect(c, a, "square")
				) {
					const signA = bodies[a]?.sign;
					patterns.push({
						type: "t_square",
						bodies: [b, c, a],
						apex: a,
						modality: signA ? SIGN_MODALITIES[signA] : undefined,
					});
				}

				// Yod: sextile + 2 quincunx to apex
				if (
					hasAspect(a, b, "sextile") &&
					hasAspect(a, c, "quincunx") &&
					hasAspect(b, c, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [a, b, c], apex: c });
				} else if (
					hasAspect(a, c, "sextile") &&
					hasAspect(a, b, "quincunx") &&
					hasAspect(c, b, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [a, c, b], apex: b });
				} else if (
					hasAspect(b, c, "sextile") &&
					hasAspect(b, a, "quincunx") &&
					hasAspect(c, a, "quincunx")
				) {
					patterns.push({ type: "yod", bodies: [b, c, a], apex: a });
				}
			}
		}
	}

	return patterns;
}

function generateFactAtoms(chart: Projection): InterpretationContext {
	const atoms: string[] = [];

	// Bodies
	for (const [id, body] of Object.entries(chart.bodies)) {
		if (!body) continue;
		atoms.push(`${id}_sign_${body.sign.toLowerCase()}`);
		atoms.push(`${id}_house_${body.house}`);
		if (body.retrograde) {
			atoms.push(`${id}_retrograde`);
		}
	}

	// Aspects
	for (const asp of chart.aspects) {
		atoms.push(`aspect_${asp.a}_${asp.aspect}_${asp.b}`);
	}

	// Declination aspects
	if (chart.declinationAspects) {
		for (const dec of chart.declinationAspects) {
			atoms.push(`declination_${dec.aspect}_${dec.a}_${dec.b}`);
		}
	}

	// Patterns
	if (chart.patterns) {
		for (const p of chart.patterns) {
			atoms.push(`pattern_${p.type}${p.apex ? `_apex_${p.apex}` : ""}`);
		}
	}

	// Evolutionary
	if (chart.evolutionary) {
		const evo = chart.evolutionary;
		if (evo.pluto) {
			atoms.push(`pluto_sign_${evo.pluto.sign.toLowerCase()}`);
			atoms.push(`pluto_house_${evo.pluto.house}`);
			if (evo.pluto.nodalConjunction) {
				atoms.push(`pluto_conjunct_${evo.pluto.nodalConjunction}`);
			}
		}
		if (evo.polarityPoint) {
			atoms.push(
				`pluto_polarity_point_${evo.polarityPoint.sign.toLowerCase()}_house_${evo.polarityPoint.house}`,
			);
			if (evo.polarityPoint.isOperative) {
				atoms.push("pluto_polarity_point_operative");
			}
		}
		if (evo.nodes.northNode) {
			atoms.push(`north_node_sign_${evo.nodes.northNode.sign.toLowerCase()}`);
			atoms.push(`north_node_house_${evo.nodes.northNode.house}`);
		}
		if (evo.nodes.southNode) {
			atoms.push(`south_node_sign_${evo.nodes.southNode.sign.toLowerCase()}`);
			atoms.push(`south_node_house_${evo.nodes.southNode.house}`);
		}
		if (evo.nodes.motionStatus) {
			atoms.push(`node_motion_${evo.nodes.motionStatus}`);
		}
		for (const step of evo.skippedSteps) {
			atoms.push(
				`skipped_step_${step.body}_squares_${step.target}${step.resolutionNode ? `_resolves_${step.resolutionNode}` : ""}`,
			);
		}
		if (evo.solLunaPhase) {
			atoms.push(
				`sol_luna_phase_${evo.solLunaPhase.name.toLowerCase().replace(/\s+/g, "_")}`,
			);
		}
	}

	// Signature Dominants
	if (chart.signature) {
		const { elements, modalities, quadrants, hemispheres } = chart.signature;
		const sortedEl = Object.entries(elements).sort((a, b) => b[1] - a[1]);
		if (sortedEl[0] && sortedEl[0][1] > 0)
			atoms.push(`dominant_element_${sortedEl[0][0]}`);

		const sortedMod = Object.entries(modalities).sort((a, b) => b[1] - a[1]);
		if (sortedMod[0] && sortedMod[0][1] > 0)
			atoms.push(`dominant_modality_${sortedMod[0][0]}`);

		const sortedQuad = Object.entries(quadrants).sort((a, b) => b[1] - a[1]);
		if (sortedQuad[0] && sortedQuad[0][1] > 0)
			atoms.push(`dominant_quadrant_${sortedQuad[0][0]}`);

		if (hemispheres.eastern > hemispheres.western)
			atoms.push("dominant_hemisphere_eastern");
		else if (hemispheres.western > hemispheres.eastern)
			atoms.push("dominant_hemisphere_western");

		if (hemispheres.northern > hemispheres.southern)
			atoms.push("dominant_hemisphere_northern");
		else if (hemispheres.southern > hemispheres.northern)
			atoms.push("dominant_hemisphere_southern");
	}

	return { atoms };
}

function project(input: ProjectionInput): Projection {
	const {
		chart,
		bodies: rawBodies,
		eclipses,
		lots,
		stars,
		evolutionary,
		draconic,
	} = input;
	const bodies = projectBodies(rawBodies);

	const aspects = chart.aspects.map((a) => ({
		a: a.a,
		b: a.b,
		aspect: a.aspect,
		orb: round(a.orb),
		phase: a.phase,
		strength: round(a.strength, 3),
	}));

	const declinationAspects = computeDeclinationAspects(rawBodies);
	const signature = computeChartSignature(rawBodies);
	const patterns = detectAspectPatterns(aspects, rawBodies);

	return {
		meta: {
			jdUt: round(chart.jdUt),
			zodiac: chart.zodiac,
			houseSystem: chart.houseSystem,
			houseSystemRequested: chart.houseSystemRequested,
			unavailable: chart.unavailable,
		},
		bodies,
		angles: projectAngles(chart.angles),
		cusps: chart.cusps.map((c) => renderLon(c)),
		aspects,
		declinationAspects,
		patterns,
		signature,
		...(eclipses ? { eclipses } : {}),
		...(lots ? { lots } : {}),
		...(stars ? { stars } : {}),
		...(evolutionary ? { evolutionary } : {}),
		...(draconic ? { draconic: projectDraconic(draconic) } : {}),
	};
}

function echoBirth(
	birth: ResolvedBirth,
	options: ChartRequestOptions,
): BirthEcho {
	return {
		year: birth.local.year,
		month: birth.local.month,
		day: birth.local.day,
		hour: birth.local.hour,
		minute: birth.local.minute,
		lat: birth.lat,
		lon: birth.lon,
		zone: birth.zone,
		offsetMinutes: birth.offsetMinutes,
		dst: birth.dst,
		status: birth.status,
		requested: { ...options },
	};
}

export class AstrologicalEngine {
	private ephemeris: Ephemeris;

	constructor(ephemeris?: Ephemeris) {
		this.ephemeris = ephemeris ?? new CaelusEphemeris();
	}

	compute(request: NatalRequest): AstrologicalReading {
		const { birth, options } = request;
		const rawChart: Chart = this.ephemeris.chartAt(
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

		const evolutionary = options.evolutionary
			? computeEvolutionaryReading(rawChart)
			: undefined;

		const draconic = options.draconic
			? toDraconicChart(rawChart, options.node)
			: undefined;

		const eclipses = options.eclipses
			? computePrenatalEclipses(
					this.ephemeris,
					birth,
					rawChart.cusps,
					options.houseSystem,
				)
			: undefined;

		const lots = options.lots
			? computeHermeticLots(this.ephemeris, birth, rawChart.cusps)
			: undefined;

		const stars = options.stars
			? computeFixedStarMatches(this.ephemeris, birth, rawChart.bodies)
			: undefined;

		const natalBodies = { ...rawChart.bodies };
		for (const dropped of DROPPED_BY_NODE[options.node]) {
			delete natalBodies[dropped];
		}

		const projected = project({
			chart: rawChart,
			bodies: natalBodies,
			eclipses,
			lots,
			stars,
			evolutionary,
			draconic,
		});

		const help: string[] = [];
		if (rawChart.houseSystem !== rawChart.houseSystemRequested) {
			help.push(
				`House system "${rawChart.houseSystemRequested}" fell back to "${rawChart.houseSystem}" (undefined above the polar circle)`,
			);
		}
		if (rawChart.unavailable.length > 0) {
			help.push(
				`Bodies omitted (outside fitted ephemeris range): ${rawChart.unavailable.join(", ")}`,
			);
		}
		if (request.birth.status !== "ok") {
			help.push(
				`Timezone resolution provenance status: ${request.birth.status}`,
			);
		}

		const aspects = projected.aspects;
		const interpretationContext = generateFactAtoms(projected);

		return {
			chart: { ...projected, birth: echoBirth(request.birth, request.options) },
			summary: {
				bodies: Object.keys(projected.bodies).length,
				aspects: aspects.length,
				applying: aspects.filter((a) => a.phase === "applying").length,
				separating: aspects.filter((a) => a.phase === "separating").length,
				exact: aspects.filter((a) => a.phase === "exact").length,
			},
			interpretationContext,
			...(help.length > 0 ? { help } : {}),
		};
	}
}
