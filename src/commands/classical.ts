import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import { chartCommand } from "./chart";
import { synastryCommand } from "./synastry";

export const classicalUsage = [
	"lumen classical chart [...]",
	"lumen classical draconic [...]",
	"lumen classical synastry [...]",
	"",
	"Mecánica técnica y proyecciones tradicionales auxiliares (Lots, Dracónica, Estrellas).",
].join("\n");

export const classicalCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return classicalUsage;

	if (sub === "chart") {
		return chartCommand(["natal", ...rest], context);
	}
	if (sub === "draconic") {
		return chartCommand(["draconic", ...rest], context);
	}
	if (sub === "synastry") {
		return synastryCommand(rest, context);
	}

	throw new AxiError(`Unknown classical command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen classical --help` for valid subcommands",
	]);
};
