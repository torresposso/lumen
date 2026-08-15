import { runAxiCli } from "axi-sdk-js";
import type { CliContext } from "./cli/context";
import { ProfileStore } from "./cli/profile-store";
import { chartCommand } from "./commands/chart";
import { profileCommand } from "./commands/profile";
import { setupCommand } from "./commands/setup";
import { synastryCommand } from "./commands/synastry";
import { timingCommand } from "./commands/timing";
import { VERSION } from "./version";

const topLevelHelp = [
	"Comandos:",
	"  chart      Lectura evolutiva (default) | natal | draconic",
	"  synastry   Comparar dos cartas: self | pair",
	"  profile    Guardar y listar datos de nacimiento locales",
	"  timing     Progresiones y estaciones",
	"  setup      Instala/actualiza la integración de sesión",
].join("\n");

export async function main(): Promise<void> {
	const profiles = new ProfileStore();

	await runAxiCli<CliContext>({
		description: "Astrología evolutiva computacional desde la terminal",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		resolveContext: async () => ({ profiles }),
		commands: {
			chart: chartCommand,
			synastry: synastryCommand,
			profile: profileCommand,
			timing: timingCommand,
			setup: setupCommand,
		},
		home: async (_args, context) => {
			const saved = context?.profiles.list() ?? [];
			if (saved.length === 0) {
				return {
					profiles: "0 profiles found",
					help: [
						'Run `lumen profile add <id> --when "1981-01-26T00:50" --place "Magangué, Colombia"`',
						'Run `lumen chart --when "1981-01-26T00:50" --place "Magangué, Colombia"` for an evolutionary reading',
					],
				};
			}
			return {
				profiles: saved,
				help: [
					"Run `lumen chart --profile <id>` for an evolutionary reading",
					"Run `lumen synastry pair --a <id> --b <id>` to compare two charts",
				],
			};
		},
	});
}
