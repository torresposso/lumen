import { runAxiCli } from "axi-sdk-js";
import { chartCommand } from "./commands/chart";
import { journeyCommand } from "./commands/journey";
import { karmaCommand } from "./commands/karma";
import { profileCommand } from "./commands/profile";
import { setupCommand } from "./commands/setup";
import { ConfigStore } from "./storage/config";
import { ProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"Comandos Evolutivos (JWG):",
	"  journey    Progresiones secundarias y giros estacionales",
	"  karma      Sinastría evolutiva y acuerdos entre Almas",
	"  profile    Los seres de la práctica: perfiles locales de nacimiento",
	"  chart      Carta: natal (insumo base; --evo agrega mecánica) y draconic (experimento)",
	"  setup      Instala/actualiza la integración de sesión",
].join("\n");

export async function main(): Promise<void> {
	const profiles = new ProfileStore();
	const config = new ConfigStore();

	await runAxiCli<{
		profiles: ProfileStore;
		config: ConfigStore;
	}>({
		description: "Astrología evolutiva computacional desde la terminal",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		resolveContext: async () => ({ profiles, config }),
		commands: {
			journey: journeyCommand,
			karma: karmaCommand,
			profile: profileCommand,
			chart: chartCommand,
			setup: setupCommand,
		},
		home: async (_args, context) => {
			const profiles = (context?.profiles.list() ?? []).map((profile) => ({
				id: profile.id,
				provenance: profile.birthStatus,
			}));

			return {
				profiles: profiles.length > 0 ? profiles : "0 profiles found",
				help: [
					'Run `lumen profile add <id> --when "1981-01-26T00:50" --place "Magangué, Colombia"`',
					"Run `lumen chart natal <profile> --evo` for an evolutionary reading",
					"Run `lumen journey progressed <profile> --at <YYYY-MM-DD>` for progressions",
					"Run `lumen karma pair --a <id> --b <id>` to compare two charts",
				],
			};
		},
	});
}
