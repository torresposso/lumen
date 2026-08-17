import { chartAt } from "./charts";
import {
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
// the complete natal reading: asks the shared chart computation (ADR-0013) for
// the cleaned raw chart, projects the chart (chart projection policy,
// ADR-0011), optionally assembles the `evo` block (evolutionary reading,
// ADR-0010), fills the advisory `help`, and merges the interpretation atoms.
// Co-located with the computators and types it publishes so a field rename
// surfaces at one site; the commands layer only forwards the request and
// translates the `undefined` (missing-input) branch into an `AxiError` at the
// CLI seam.
// ============================================================================

export interface ChartOutputSelection {
	evo: boolean;
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
	evo?: EvoOutput;
	interpretationContext?: InterpretationContext;
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
 * Assembles the complete natal reading. Pure: every input enters through
 * parameters (the `Ephemeris` seam is injected, never instantiated). The
 * shared chart computation (`charts.ts`, ADR-0013) applies the true-node canon,
 * so the projected chart and the `evo` block read the same cleaned body set.
 * Returns `undefined` only when `selection.evo` is set and the chart lacks
 * pluto or the true node; the CLI seam translates that into an `AxiError`.
 */
export function computeReading(
	request: NatalRequest,
	ephemeris: Ephemeris,
	selection: ChartOutputSelection = { evo: false },
): AstrologicalReading | undefined {
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

	const aspects = projected.aspects;
	const interpretationContext = generateFactAtoms(projected);
	const evo = selection.evo
		? computeEvolutionaryReading({
				bodies: natalBodies,
				cusps: rawChart.cusps,
				ephemeris,
				birth: request.birth,
				houseSystem: request.options.houseSystem,
				topocentric: request.options.topocentric,
			})
		: undefined;
	if (selection.evo && !evo) return undefined;
	if (evo) interpretationContext.atoms.push(...evo.atoms);

	return {
		chart: { ...projected, birth: echoBirth(request.birth, request.options) },
		summary: {
			bodies: Object.keys(projected.bodies).length,
			aspects: aspects.length,
			applying: aspects.filter((a) => a.phase === "applying").length,
			separating: aspects.filter((a) => a.phase === "separating").length,
			exact: aspects.filter((a) => a.phase === "exact").length,
		},
		...(evo ? { evo: evo.evo } : {}),
		interpretationContext,
		...(help.length > 0 ? { help } : {}),
	};
}
