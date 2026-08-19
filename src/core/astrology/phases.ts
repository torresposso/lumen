import { angularDistanceDirect, roundPrecision } from "./soul";

export type SolLunaPhaseName =
	| "New"
	| "Crescent"
	| "First Quarter"
	| "Gibbous"
	| "Full"
	| "Disseminating"
	| "Last Quarter"
	| "Balsamic";

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

export function computeSolLunaPhase(sunLon: number, moonLon: number): string {
	const angle = roundPrecision(angularDistanceDirect(sunLon, moonLon), 4);
	const phase = PHASES.find((p) => angle < p.max) ?? PHASES[PHASES.length - 1];
	return phase ? phase.name : "Balsamic";
}
