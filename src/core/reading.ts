import type { Chart } from "caelus";
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
// the complete natal reading: computes the raw chart through the `Ephemeris`
// seam, applies the true-node canon once, projects the chart (chart projection
// policy, ADR-0011), optionally assembles the `evo` block (evolutionary
// reading, ADR-0010), fills the advisory `help`, and merges the interpretation
// atoms. Co-located with the computators and types it publishes so a field
// rename surfaces at one site; the commands layer only forwards the request and
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

/** Node ids to drop from the chart. The engine always computes both nodes;
 *  lumen is dedicated to the true node (North Node canon), so the mean node
 *  never leaves the reading. The canon is applied exactly once here: the same
 *  cleaned body set feeds `project()` and `computeEvolutionaryReading()`. */
const DROPPED_NODE: readonly string[] = ["mean_node"];

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

/** Computes the raw caelus chart for a validated request. */
function chartFor(ephemeris: Ephemeris, request: NatalRequest): Chart {
	const { birth, options } = request;
	return ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, {
		houseSystem: options.houseSystem,
		zodiac: options.zodiac,
		bodies: options.bodies,
		topocentric: options.topocentric,
	});
}

/**
 * Assembles the complete natal reading. Pure: every input enters through
 * parameters (the `Ephemeris` seam is injected, never instantiated). The
 * `mean_node` true-node canon is applied once and both the projected chart and
 * the `evo` block read the same cleaned body set — the `true_node ??
 * mean_node` fallback in `nodes.ts` is therefore unreachable on this path
 * (karma and journey still reach it with charts they own). Returns `undefined`
 * only when `selection.evo` is set and the chart lacks pluto or the true node;
 * the CLI seam translates that into an `AxiError`.
 */
export function computeReading(
	request: NatalRequest,
	ephemeris: Ephemeris,
	selection: ChartOutputSelection = { evo: false },
): AstrologicalReading | undefined {
	const { options } = request;
	const rawChart: Chart = chartFor(ephemeris, request);

	const draconic = options.draconic ? toDraconicChart(rawChart) : undefined;

	const natalBodies = { ...rawChart.bodies };
	for (const dropped of DROPPED_NODE) {
		delete natalBodies[dropped];
	}

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
