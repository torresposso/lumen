import { aspectPhase } from "../../adapters/ephemeris";
import type { AspectStress } from "../shared/aspects";
import { angularDistance, roundPrecision } from "../shared/geometry";
import type { TransitAspect } from "./types";

export interface TransitAspectDef {
	name: string;
	target: number;
	innerOrb: number;
	outerOrb: number;
	stress: AspectStress;
}

/**
 * Strict evolutionary transit aspect definitions and orbs.
 * Inner planets & luminaries: Sun through Mars (1.5°).
 * Outer planets & nodes: Jupiter through Pluto, Nodes, Lilith (2.5°).
 */
export const TRANSIT_ASPECT_DEFS: readonly TransitAspectDef[] = [
	{
		name: "conjunction",
		target: 0,
		innerOrb: 1.5,
		outerOrb: 2.5,
		stress: "stressful",
	},
	{
		name: "semisextile",
		target: 30,
		innerOrb: 1.0,
		outerOrb: 1.5,
		stress: "nonstressful",
	},
	{
		name: "semisquare",
		target: 45,
		innerOrb: 1.0,
		outerOrb: 1.5,
		stress: "stressful",
	},
	{
		name: "septile",
		target: 360 / 7,
		innerOrb: 1.0,
		outerOrb: 1.0,
		stress: "nonstressful",
	},
	{
		name: "sextile",
		target: 60,
		innerOrb: 1.5,
		outerOrb: 2.5,
		stress: "nonstressful",
	},
	{
		name: "quintile",
		target: 72,
		innerOrb: 1.0,
		outerOrb: 1.0,
		stress: "nonstressful",
	},
	{
		name: "square",
		target: 90,
		innerOrb: 1.5,
		outerOrb: 2.5,
		stress: "stressful",
	},
	{
		name: "trine",
		target: 120,
		innerOrb: 1.5,
		outerOrb: 2.5,
		stress: "nonstressful",
	},
	{
		name: "sesquiquadrate",
		target: 135,
		innerOrb: 1.0,
		outerOrb: 1.5,
		stress: "stressful",
	},
	{
		name: "biquintile",
		target: 144,
		innerOrb: 1.0,
		outerOrb: 1.0,
		stress: "nonstressful",
	},
	{
		name: "quincunx",
		target: 150,
		innerOrb: 1.0,
		outerOrb: 1.5,
		stress: "stressful",
	},
	{
		name: "opposition",
		target: 180,
		innerOrb: 1.5,
		outerOrb: 2.5,
		stress: "stressful",
	},
];

const OUTER_BODIES = new Set([
	"jupiter",
	"saturn",
	"uranus",
	"neptune",
	"pluto",
	"true_node",
	"mean_node",
	"true_lilith",
	"mean_lilith",
	"chiron",
]);

export function isOuterBody(body: string): boolean {
	return OUTER_BODIES.has(body.toLowerCase());
}

export function computeTransitAspects(
	transitingBodies: Record<string, { lon: number; speed?: number }>,
	natalPoints: Record<string, { lon: number; speed?: number }>,
): TransitAspect[] {
	const aspects: TransitAspect[] = [];

	for (const [tName, tBody] of Object.entries(transitingBodies)) {
		if (!tBody) continue;
		const isOuter = isOuterBody(tName);

		for (const [nName, nPoint] of Object.entries(natalPoints)) {
			if (!nPoint) continue;

			for (const def of TRANSIT_ASPECT_DEFS) {
				const maxOrb = isOuter ? def.outerOrb : def.innerOrb;
				const dist = angularDistance(tBody.lon, nPoint.lon);
				const orb = Math.abs(dist - def.target);

				if (orb <= maxOrb) {
					const phase =
						tBody.speed !== undefined && nPoint.speed !== undefined
							? aspectPhase(
									tBody.lon,
									tBody.speed,
									nPoint.lon,
									nPoint.speed,
									def.target,
								)
							: "applying";

					aspects.push({
						transitBody: tName,
						natalPoint: nName,
						aspect: def.name,
						orb: roundPrecision(orb, 4),
						maxOrb,
						isApplying: phase === "applying" || phase === "exact",
						stress: def.stress,
					});
				}
			}
		}
	}

	return aspects.sort(
		(a, b) => a.orb - b.orb || a.transitBody.localeCompare(b.transitBody),
	);
}
