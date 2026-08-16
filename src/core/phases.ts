import { angularDistanceDirect, roundPrecision } from "./celestial-coordinates";
import type { SolLunaPhaseName } from "./types";

export type { SolLunaPhaseName };

export interface SolLunaPhaseResult {
	name: SolLunaPhaseName;
	angle: number;
}

const PHASES: readonly { name: SolLunaPhaseName; max: number }[] = [
	{ name: "New", max: 45 },
	{ name: "Crescent", max: 90 },
	{ name: "First Quarter", max: 135 },
	{ name: "Gibbous", max: 180 },
	{ name: "Full", max: 225 },
	{ name: "Disseminating", max: 270 },
	{ name: "Last Quarter", max: 315 },
	{ name: "Balsamic", max: 360 },
];

/**
 * Computes the 8 archetypal Jeffrey Wolf Green evolutionary Sol-Luna phases
 * from the direct counter-clockwise arc (Moon longitude - Sun longitude).
 */
export function computeSolLunaPhase(
	sunLon: number,
	moonLon: number,
): SolLunaPhaseResult {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon));
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];

	return {
		name: phase ? phase.name : "Balsamic",
		angle,
	};
}
