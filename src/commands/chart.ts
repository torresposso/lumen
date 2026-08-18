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
	return computeReading(request, new CaelusEphemeris());
};
