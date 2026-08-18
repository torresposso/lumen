import { chartAt } from "./charts";
import {
	DRACONIC_FRAME_DISCLOSURE,
	generateFactAtoms,
	type InterpretationContext,
	toDraconicChart,
} from "./classical";
import {
	computeEvolutionaryReading,
	type EvoOutput,
} from "./evolutionary-reading";
import { type Projection, project } from "./projection";
import type {
	BirthStatus,
	ChartRequestOptions,
	Ephemeris,
	NatalRequest,
	ResolvedBirth,
} from "./types";

// ============================================================================
// Natal reading assembly
//
// Single source of the published `AstrologicalReading` (ADR-0012). Assembles
// the complete astrological reading: asks the shared chart computation
// (ADR-0013) for the cleaned raw chart, projects the chart (chart projection
// policy, ADR-0011), always assembles the `evo` block (evolutionary reading,
// ADR-0010), fills the advisory `help`, and merges the interpretation atoms.
// Co-located with the computators and types it publishes so a field rename
// surfaces at one site; the commands layer only forwards the request. There is
// no `undefined` branch — the chart is guaranteed to carry pluto and the true
// node (chart computation invariant, ADR-0014).
// ============================================================================

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
	evo: EvoOutput;
	interpretationContext: InterpretationContext;
	help?: string[];
};

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

/**
 * Assembles the complete astrological reading. Pure: every input enters through
 * parameters (the `Ephemeris` seam is injected, never instantiated). The
 * shared chart computation (`charts.ts`, ADR-0013) applies the true-node canon
 * and enforces the invariant «pluto + the true node are always present», so the
 * projected chart and the `evo` block read the same cleaned body set. Always
 * returns the complete reading — there is no `undefined` branch (ADR-0014).
 */
export function computeReading(
	request: NatalRequest,
	ephemeris: Ephemeris,
): AstrologicalReading {
	const { options } = request;
	const rawChart = chartAt(request, request.birth.jdUt, ephemeris);

	const draconic = options.draconic ? toDraconicChart(rawChart) : undefined;

	const natalBodies = rawChart.bodies;

	const projected = project({
		chart: rawChart,
		bodies: natalBodies,
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
		help.push(`Timezone resolution provenance status: ${request.birth.status}`);
	}

	const interpretationContext = generateFactAtoms(projected);
	// Evo frame (ADR-0014): the natal window by default; over the draconic
	// zodiac when the request is draconic — bodies and cusps draconic (true
	// node at 0° Aries by construction), eclipses shifted by the same
	// North-Node subtraction, and the frame declared in `method`.
	const evo = computeEvolutionaryReading({
		bodies: draconic ? draconic.bodies : natalBodies,
		cusps: draconic ? draconic.cusps : rawChart.cusps,
		ephemeris,
		birth: request.birth,
		houseSystem: request.options.houseSystem,
		topocentric: request.options.topocentric,
		eclipseShiftLon: draconic ? rawChart.bodies.true_node?.lon : undefined,
		frameDisclosure: draconic ? DRACONIC_FRAME_DISCLOSURE : undefined,
	});
	interpretationContext.atoms.push(...evo.atoms);

	const aspects = projected.aspects;

	return {
		chart: { ...projected, birth: echoBirth(request.birth, request.options) },
		summary: {
			bodies: Object.keys(projected.bodies).length,
			aspects: aspects.length,
			applying: aspects.filter((a) => a.phase === "applying").length,
			separating: aspects.filter((a) => a.phase === "separating").length,
			exact: aspects.filter((a) => a.phase === "exact").length,
		},
		evo: evo.evo,
		interpretationContext,
		...(help.length > 0 ? { help } : {}),
	};
}
