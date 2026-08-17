import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./intake";

export const chartUsage = [
	"lumen chart natal <profile> | lumen chart draconic <profile>",
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Carta natal (insumo base) y proyección draconic (experimento etiquetado).",
	"Con --evo: agrega la mecánica evolutiva (Plutón/PPP + eje nodal) a la natal.",
].join("\n");

// ============================================================================
// Chart engine (application layer; core stays pure)
// ============================================================================

import type { Chart } from "caelus";
import { CaelusEphemeris, type Ephemeris } from "../adapters/ephemeris-gateway";
import {
	type AspectPattern,
	type ChartSignature,
	type DeclinationAspectProjection,
	type DraconicChart,
	generateFactAtoms,
	type InterpretationContext,
	toDraconicChart,
} from "../core/classical";
import {
	computeEvolutionaryReading,
	type EvoOutput,
} from "../core/evolutionary-reading";
import { type Projection, project } from "../core/projection";
import type {
	BirthStatus,
	ChartRequestOptions,
	NatalRequest as EngineNatalRequest,
	ResolvedBirth,
} from "../core/types";

export type {
	AspectPattern,
	ChartSignature,
	DeclinationAspectProjection,
	DraconicChart,
	InterpretationContext,
};

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
 *  never leaves the seam. */
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

export class AstrologicalEngine {
	private ephemeris: Ephemeris;

	constructor(ephemeris?: Ephemeris) {
		this.ephemeris = ephemeris ?? new CaelusEphemeris();
	}

	/** Computes the raw caelus chart for a validated request. */
	chartFor(request: EngineNatalRequest): Chart {
		const { birth, options } = request;
		return this.ephemeris.chartAt(birth.jdUt, birth.lat, birth.lon, {
			houseSystem: options.houseSystem,
			zodiac: options.zodiac,
			bodies: options.bodies,
			topocentric: options.topocentric,
		});
	}

	compute(
		request: EngineNatalRequest,
		selection: ChartOutputSelection = { evo: false },
	): AstrologicalReading {
		const { options } = request;
		const rawChart: Chart = this.chartFor(request);

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
			help.push(
				`Timezone resolution provenance status: ${request.birth.status}`,
			);
		}

		const aspects = projected.aspects;
		const interpretationContext = generateFactAtoms(projected);
		const evo = selection.evo
			? computeEvolutionaryReading({
					bodies: rawChart.bodies,
					cusps: rawChart.cusps,
					ephemeris: this.ephemeris,
					birth: request.birth,
					houseSystem: request.options.houseSystem,
					topocentric: request.options.topocentric,
				})
			: undefined;
		if (selection.evo && !evo) {
			throw new AxiError(
				"Could not compute evolutionary mechanics",
				"CALCULATION_ERROR",
				[
					"The chart must contain pluto and the true node (the default natal bodies); --bodies only adds extra bodies",
				],
			);
		}
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
}

// ============================================================================
// Chart engine commands backing `lumen chart natal|draconic`
// ============================================================================

import {
	NatalIntake,
	type NatalRequest,
	requestFromProfile,
	takeProfileArg,
} from "./intake";

const FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const chartNatalUsage = [
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal base (efemérides caelus).",
	"Con --evo agrega la mecánica evolutiva completa (Plutón/PPP, eje nodal, fase,",
	"cadenas y eclipses prenatales).",
	"Usa orbes PLUTO_ASPECTS; puede diferir de chart.aspects.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal y su proyección draconic (experimento etiquetado,",
	"fuera del canon; puramente geométrico, rechaza --evo).",
].join("\n");

type ChartMode = "natal" | "draconic";

const CHART_MODES = new Set(["natal", "draconic"]);

function usageFor(mode: ChartMode): string {
	if (mode === "natal") return `${chartNatalUsage}\n\n${FLAG_REFERENCE}`;
	return `${chartDraconicUsage}\n\n${FLAG_REFERENCE}`;
}

function applyMode(request: NatalRequest, mode: ChartMode): NatalRequest {
	return {
		...request,
		options: { ...request.options, draconic: mode === "draconic" },
	};
}

async function resolveRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const first = args[0];
	if (first !== undefined && !first.startsWith("-")) {
		const rest = args.slice(1);
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine positional profile id with extra flags",
				"VALIDATION_ERROR",
				[`Use \`lumen chart natal ${first}\` or inline birth flags`],
			);
		}
		return requestFromProfile(context, first);
	}

	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth flags",
				"VALIDATION_ERROR",
				[`Use \`lumen chart natal ${name}\` or inline birth flags`],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(
		rest,
		undefined,
		"chart",
		context?.config,
	);
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen chart natal --help` for chart options",
		]);
	}
	return result.request;
}

function parseEvoFlag(args: string[]): { evo: boolean; rest: string[] } {
	let evo = false;
	const rest: string[] = [];
	for (const arg of args) {
		if (arg === "--evo") {
			evo = true;
			continue;
		}
		if (arg.startsWith("--evo=")) {
			const raw = arg.slice("--evo=".length).trim().toLowerCase();
			if (raw === "true") evo = true;
			else if (raw === "false") evo = false;
			else {
				throw new AxiError(
					"Flag --evo expects true or false",
					"VALIDATION_ERROR",
					["Example: --evo=true"],
				);
			}
			continue;
		}
		rest.push(arg);
	}
	return { evo, rest };
}

export const chartCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const first = args[0];

	if (
		first !== undefined &&
		!first.startsWith("-") &&
		!CHART_MODES.has(first)
	) {
		throw new AxiError(`Unknown chart command: ${first}`, "VALIDATION_ERROR", [
			"Run `lumen chart --help` for valid subcommands",
		]);
	}

	if (first === undefined || args.includes("--help")) {
		const mode =
			first !== undefined && CHART_MODES.has(first)
				? (first as ChartMode)
				: undefined;
		return mode === undefined ? chartUsage : usageFor(mode);
	}

	if (first.startsWith("-")) {
		throw new AxiError(
			"chart requires a subcommand: natal | draconic",
			"VALIDATION_ERROR",
			["Run `lumen chart --help` for usage"],
		);
	}

	const mode = first as ChartMode;
	const { evo, rest } = parseEvoFlag(args.slice(1));
	if (mode === "draconic" && evo) {
		throw new AxiError(
			"Chart draconic does not support --evo",
			"VALIDATION_ERROR",
			["Use `lumen chart natal --evo` for evolutionary mechanics"],
		);
	}
	const request = applyMode(await resolveRequest(rest, context), mode);
	const engine = new AstrologicalEngine();
	return engine.compute(request, { evo });
};
