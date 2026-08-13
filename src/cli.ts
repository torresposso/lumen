import { runAxiCli } from "axi-sdk-js";
import { chartCommand, chartUsage } from "./commands/chart";
import { setupCommand, setupUsage } from "./commands/setup";
import { VERSION } from "./version";

const topLevelHelp = [
	"Comandos:",
	"  chart   Calcula una carta natal (efemérides caelus) con hechos astrológicos",
	"  setup   Instala/actualiza la integración de sesión (hooks + plugin OpenCode)",
	"  update  Revisa/instala la última versión",
].join("\n");

export async function main(): Promise<void> {
	await runAxiCli({
		description: "Astrología evolutiva computacional desde la terminal",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		commands: {
			chart: chartCommand,
			setup: setupCommand,
		},
		getCommandHelp: (command) => {
			if (command === "chart") {
				return chartUsage;
			}
			if (command === "setup") {
				return setupUsage;
			}
			return undefined;
		},
		home: async () => ({
			help: [
				'Run `lumen chart --when "1981-01-26T00:50" --place "Magangué, Colombia"` for a natal chart',
				"Run `lumen chart --help` for chart options",
			],
		}),
	});
}
