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
	archetype: string;
	description: string;
	max: number;
}

export const PHASE_METAS: readonly SolLunaPhaseMeta[] = [
	{
		phaseNumber: 1,
		phaseName: "New",
		archetype: "Emergence & Subjective Impulse",
		description:
			"A new 28-year evolutionary cycle begins; instinctual, spontaneous action without clear objective awareness.",
		max: 45,
	},
	{
		phaseNumber: 2,
		phaseName: "Crescent",
		archetype: "Mobilization & Overcoming Resistance",
		description:
			"Emerging structures encounter the inertia of past habits; struggle to assert forward evolutionary momentum.",
		max: 90,
	},
	{
		phaseNumber: 3,
		phaseName: "First Quarter",
		archetype: "Action in Crisis & Structural Decision",
		description:
			"Crisis in action; breaking decisively with old molds and establishing active evolutionary frameworks.",
		max: 135,
	},
	{
		phaseNumber: 4,
		phaseName: "Gibbous",
		archetype: "Growth, Refinement & Dedication",
		description:
			"Personal evaluation, self-questioning, and preparation for illumination and objective revelation.",
		max: 180,
	},
	{
		phaseNumber: 5,
		phaseName: "Full",
		archetype: "Illumination & Objective Realization",
		description:
			"Conscious culmination and illumination; objective clarity on the evolutionary purpose seeded at the New phase.",
		max: 225,
	},
	{
		phaseNumber: 6,
		phaseName: "Disseminating",
		archetype: "Sharing, Demonstration & Integration",
		description:
			"Demonstrating and sharing realized wisdom with the collective; translating experience into social meaning.",
		max: 270,
	},
	{
		phaseNumber: 7,
		phaseName: "Last Quarter",
		archetype: "Crisis in Consciousness & Reorientation",
		description:
			"Crisis in consciousness; discarding obsolete belief systems and undergoing structural internal reorientation.",
		max: 315,
	},
	{
		phaseNumber: 8,
		phaseName: "Balsamic",
		archetype: "Karma Culmination, Distillation & Release",
		description:
			"Karma culmination, distillation, and release before the upcoming new 28-year evolutionary cycle.",
		max: 360,
	},
];

export const PHASES = PHASE_METAS.map((m) => ({
	name: m.phaseName,
	max: m.max,
}));

export function getSolLunaPhaseDetails(
	sunLon: number,
	moonLon: number,
): {
	phaseNumber: number;
	phaseName: SolLunaPhaseName;
	archetype: string;
	sunMoonAngle: number;
	isWaxing: boolean;
	description: string;
} {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const defaultMeta = PHASE_METAS[PHASE_METAS.length - 1] as SolLunaPhaseMeta;
	const selected = PHASE_METAS.find((p) => angle < p.max) ?? defaultMeta;
	const isWaxing = angle >= 0 && angle < 180;

	return {
		phaseNumber: selected.phaseNumber,
		phaseName: selected.phaseName,
		archetype: selected.archetype,
		sunMoonAngle: angle,
		isWaxing,
		description: selected.description,
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
