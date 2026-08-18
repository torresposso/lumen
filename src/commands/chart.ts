import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./intake";

export const chartUsage = [
	"lumen chart natal <profile> | lumen chart draconic <profile>",
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Carta natal y carta draconic (en el canon, ADR-0014): ambas publican",
	"siempre la geometría de la carta y la mecánica evolutiva (Plutón/PPP +",
	"eje nodal), cada una recalculada sobre su zodíaco.",
].join("\n");

// ============================================================================
// Chart command (application layer; core assembles the reading)
// ============================================================================

import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeReading } from "../core/reading";

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
	"Calcula la carta natal y, siempre, la mecánica evolutiva (efemérides caelus):",
	"Plutón/PPP, eje nodal, fase Sol-Luna, cadenas de dispositores y eclipses",
	"prenatales, con counts y method (ADR-0014).",
	"Usa orbes PLUTO_ASPECTS; puede diferir de chart.aspects.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Proyección draconic en el canon: la carta draconic y su bloque evolutivo",
	"recalculado sobre el zodíaco draconic (eje nodal fijo por construcción;",
	"el marco y sus constantes se declaran en method).",
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
	const rest = args.slice(1);
	const request = applyMode(await resolveRequest(rest, context), mode);
	return computeReading(request, new CaelusEphemeris());
};
