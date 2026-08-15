import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import { NatalIntake, type NatalRequest } from "../cli/natal-intake";
import { requestFromProfile, takeProfileArg } from "../cli/profile-args";
import { AstrologicalEngine } from "../core/astrological-engine";

const FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const chartUsage = [
	"lumen chart (default: evolutionary) | lumen chart natal | lumen chart draconic",
	"",
	NatalIntake.usage,
].join("\n");

export const chartNatalUsage = [
	'lumen chart natal --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal base (efemérides caelus) sin lectura evolutiva.",
	"Usa `lumen chart` para la lectura evolutiva completa.",
].join("\n");

export const chartDraconicUsage = [
	'lumen chart draconic --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Calcula la carta natal y su proyección draconic con lectura evolutiva.",
].join("\n");

type ChartMode = "evolutionary" | "natal" | "draconic";

const CHART_MODES = new Set(["natal", "evolutionary", "draconic"]);

function usageFor(mode: ChartMode): string {
	if (mode === "natal") return `${chartNatalUsage}\n\n${FLAG_REFERENCE}`;
	if (mode === "draconic") return `${chartDraconicUsage}\n\n${FLAG_REFERENCE}`;
	return chartUsage;
}

function applyMode(request: NatalRequest, mode: ChartMode): NatalRequest {
	const options = { ...request.options };
	if (mode === "natal") {
		options.evolutionary = false;
	} else if (mode === "draconic") {
		options.draconic = true;
		options.evolutionary = true;
	} else {
		options.evolutionary = true;
	}
	return { ...request, options };
}

async function resolveRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth or chart flags",
				"VALIDATION_ERROR",
				["Use `lumen chart --profile <id>` or inline flags, not both"],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(rest);
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen chart --help` for chart options",
		]);
	}
	return result.request;
}

export const chartCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const first = args[0];

	if (args.includes("--help")) {
		const mode =
			first !== undefined && CHART_MODES.has(first)
				? (first as ChartMode)
				: "evolutionary";
		return usageFor(mode);
	}

	let mode: ChartMode = "evolutionary";
	let rest = args;
	if (first !== undefined && CHART_MODES.has(first)) {
		mode = first as ChartMode;
		rest = args.slice(1);
	} else if (first !== undefined && first !== "-" && first.startsWith("-")) {
		// Flags without a subcommand are the default evolutionary reading.
	} else if (first !== undefined) {
		throw new AxiError(`Unknown chart command: ${first}`, "VALIDATION_ERROR", [
			"Run `lumen chart --help` for valid subcommands",
		]);
	}

	const request = applyMode(await resolveRequest(rest, context), mode);
	const engine = new AstrologicalEngine();
	return engine.compute(request);
};
