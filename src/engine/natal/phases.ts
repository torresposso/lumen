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

export interface SolLunaPhaseMeta {
	phaseNumber: number;
	phaseName: SolLunaPhaseName;
	max: number;
}

export const PHASE_METAS: readonly SolLunaPhaseMeta[] = [
	{ phaseNumber: 1, phaseName: "New", max: 45 },
	{ phaseNumber: 2, phaseName: "Crescent", max: 90 },
	{ phaseNumber: 3, phaseName: "First Quarter", max: 135 },
	{ phaseNumber: 4, phaseName: "Gibbous", max: 180 },
	{ phaseNumber: 5, phaseName: "Full", max: 225 },
	{ phaseNumber: 6, phaseName: "Disseminating", max: 270 },
	{ phaseNumber: 7, phaseName: "Last Quarter", max: 315 },
	{ phaseNumber: 8, phaseName: "Balsamic", max: 360 },
];

export const PHASES = PHASE_METAS.map((m) => ({
	name: m.phaseName,
	max: m.max,
}));

export interface SolLunaPhaseOutput {
	name: SolLunaPhaseName;
	number: number;
	angle: number;
	isWaxing: boolean;
}

export function getSolLunaPhaseDetails(
	sunLon: number,
	moonLon: number,
): SolLunaPhaseOutput {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const defaultMeta = PHASE_METAS[PHASE_METAS.length - 1] as SolLunaPhaseMeta;
	const selected = PHASE_METAS.find((p) => angle < p.max) ?? defaultMeta;
	const isWaxing = angle >= 0 && angle < 180;

	return {
		number: selected.phaseNumber,
		name: selected.phaseName,
		angle,
		isWaxing,
	};
}

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
