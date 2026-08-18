// ============================================================================
// Evolutionary criteria (single source)
//
// Deep module: one home for the orbs and thresholds that govern the `evo`
// block, plus the `describeEvoCriteria()` disclosure. The calculators in
// `soul.ts` and `nodes.ts` consume these tables, and `evolutionary-reading.ts`
// publishes the derived `evo.method` from here — so a criterion is decided in
// exactly one place and the disclosure cannot diverge from the calculation.
// Pure data-in/data-out: no I/O, no AxiError.
// ============================================================================

export type AspectStress = "stressful" | "nonstressful";

/** Orb (degrees) within which Pluto conjunct the North Node deactivates the PPP. */
export const PPP_DEACTIVATION_ORB = 10;

export interface StressedAspectDef {
	name: string;
	target: number;
	orb: number;
	stress: AspectStress;
}

/** Pluto-aspect table used by the `evo` block (may differ from chart.aspects). */
export const PLUTO_ASPECTS: StressedAspectDef[] = [
	{ name: "conjunction", target: 0, orb: 10, stress: "stressful" },
	{ name: "semisextile", target: 30, orb: 3, stress: "nonstressful" },
	{ name: "semisquare", target: 45, orb: 3, stress: "stressful" },
	{ name: "septile", target: 360 / 7, orb: 2, stress: "nonstressful" },
	{ name: "sextile", target: 60, orb: 6, stress: "nonstressful" },
	{ name: "quintile", target: 72, orb: 2, stress: "nonstressful" },
	{ name: "square", target: 90, orb: 8, stress: "stressful" },
	{ name: "trine", target: 120, orb: 8, stress: "nonstressful" },
	{ name: "sesquiquadrate", target: 135, orb: 3, stress: "stressful" },
	{ name: "biquintile", target: 144, orb: 2, stress: "nonstressful" },
	{ name: "quincunx", target: 150, orb: 3, stress: "stressful" },
	{ name: "opposition", target: 180, orb: 10, stress: "stressful" },
];

/** Major-only aspects applied to the Pluto Polarity Point (orb 5°). */
export const PPP_MAJOR_ASPECTS = [
	{ name: "conjunction", target: 0, orb: 5 },
	{ name: "sextile", target: 60, orb: 5 },
	{ name: "square", target: 90, orb: 5 },
	{ name: "trine", target: 120, orb: 5 },
	{ name: "opposition", target: 180, orb: 5 },
] as const;

/** Orb (degrees) within which a planet on the nodal axis counts as a Skipped Step. */
export const SKIPPED_STEPS_ORB = 5;

/**
 * Serializes the evolutionary criteria (orbs and thresholds) that core owns
 * into the factual `method` line of the `evo` block. Derived from the live
 * tables and constants — not hand-written — so the disclosure cannot diverge
 * from the calculation.
 */
export function describeEvoCriteria(): string {
	const orbGroups = new Map<number, string[]>();
	for (const def of PLUTO_ASPECTS) {
		const names = orbGroups.get(def.orb);
		if (names) names.push(def.name);
		else orbGroups.set(def.orb, [def.name]);
	}
	const plutoOrbs = [...orbGroups.entries()]
		.sort(([a], [b]) => b - a)
		.map(([orb, names]) => `${orb}° ${names.join("/")}`)
		.join(", ");

	const firstPppAspect = PPP_MAJOR_ASPECTS[0];
	if (firstPppAspect === undefined) {
		throw new Error(
			"unreachable: PPP_MAJOR_ASPECTS is a non-empty const table",
		);
	}

	return `orbs PLUTO_ASPECTS: ${plutoOrbs}; ppp: major aspects only (orb ${firstPppAspect.orb}°); skipped: squares to the nodal axis (orb ${SKIPPED_STEPS_ORB}°); ppp inactive when pluto conjunct the north node (orb ${PPP_DEACTIVATION_ORB}°)`;
}
