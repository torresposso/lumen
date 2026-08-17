import type { Chart } from "caelus";
import type { Ephemeris, NatalRequest } from "./types";

// ============================================================================
// Chart computation (ADR-0013)
//
// Deep module: one small interface (`chartAt`) hides the chart options policy,
// the true-node canon, and the call to the `Ephemeris` seam. Every core
// consumer that needs a raw chart — reading, journey, karma — crosses this
// module, so a canon or option decision is made in exactly one place.
// Pure data-in/data-out: no I/O, no AxiError.
// ============================================================================

const DROPPED_NODE = "mean_node";

/**
 * Computes a raw chart for a validated request at a Julian Day (UT), applying
 * the request's full chart options and the true-node canon.
 *
 * The returned chart never carries `mean_node`; if `true_node` is absent, the
 * nodal axis is simply absent from the cleaned body map (no fallback).
 */
export function chartAt(
	request: NatalRequest,
	jdUt: number,
	ephemeris: Ephemeris,
): Chart {
	const { birth, options } = request;
	const raw = ephemeris.chartAt(jdUt, birth.lat, birth.lon, {
		houseSystem: options.houseSystem,
		zodiac: options.zodiac,
		bodies: options.bodies,
		topocentric: options.topocentric,
	});
	const bodies = Object.fromEntries(
		Object.entries(raw.bodies).filter(([id]) => id !== DROPPED_NODE),
	) as Chart["bodies"];
	return { ...raw, bodies };
}
