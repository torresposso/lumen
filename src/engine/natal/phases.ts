import { angularDistanceDirect, roundPrecision } from "../shared/geometry";

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

export const PHASES: readonly { name: SolLunaPhaseName; max: number }[] = [
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
 * Computes the 8-phase archetypal Sol-Luna relationship (Dane Rudhyar / JWGEA canon)
 * based on direct zodiacal separation from Sun to Moon.
 */
export function computeSolLunaPhase(
	sunLon: number,
	moonLon: number,
): SolLunaPhaseName {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];
	return phase ? phase.name : "Balsamic";
}
