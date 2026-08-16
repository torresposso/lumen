import { runAxiCli } from "axi-sdk-js";
import type { CliContext } from "./cli/context";
import { ProfileStore } from "./cli/profile-store";
import { chartCommand } from "./commands/chart";
import { classicalCommand } from "./commands/classical";
import { clientCommand } from "./commands/client";
import { consultaCommand } from "./commands/consulta";
import { journeyCommand } from "./commands/journey";
import { karmaCommand } from "./commands/karma";
import { profileCommand } from "./commands/profile";
import { setupCommand } from "./commands/setup";
import { soulCommand } from "./commands/soul";
import { synastryCommand } from "./commands/synastry";
import { ConsultationStore } from "./storage/consultation-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"Comandos Evolutivos (JWG):",
	"  soul       Radiografía del estado basal del Alma y Punto de Polaridad",
	"  journey    Progresiones secundarias y giros estacionales",
	"  karma      Sinastría evolutiva y acuerdos entre Almas",
	"  consulta   Expedientes clínicos, hipótesis (H1, H2) y diálogo",
	"  client     Gestión de consultantes locales (alias: profile)",
	"  classical  Proyecciones técnicas auxiliares (draconic, lots, stars)",
	"  setup      Instala/actualiza la integración de sesión",
].join("\n");

export async function main(): Promise<void> {
	const profiles = new ProfileStore();
	const consultations = new ConsultationStore();

	await runAxiCli<CliContext>({
		description: "Astrología evolutiva computacional desde la terminal",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		resolveContext: async () => ({ profiles, consultations }),
		commands: {
			soul: soulCommand,
			journey: journeyCommand,
			karma: karmaCommand,
			consulta: consultaCommand,
			client: clientCommand,
			classical: classicalCommand,
			setup: setupCommand,
			// Retrocompatibilidad
			chart: chartCommand,
			profile: profileCommand,
			synastry: synastryCommand,
			timing: journeyCommand,
		},
		home: async (_args, context) => {
			const saved = context?.profiles.list() ?? [];
			const activeConsultations = (context?.consultations.list() ?? []).filter(
				(c) => c.status === "open",
			);

			if (saved.length === 0) {
				return {
					agenda:
						activeConsultations.length > 0
							? activeConsultations
							: "0 active consultations",
					clients: "0 clients found",
					help: [
						'Run `lumen client add <id> --when "1981-01-26T00:50" --place "Magangué, Colombia"`',
						"Run `lumen soul <client>` for baseline evolutionary reading",
					],
				};
			}

			return {
				agenda:
					activeConsultations.length > 0
						? activeConsultations
						: "0 active consultations",
				clients: saved,
				help: [
					"Run `lumen soul <client>` for an evolutionary reading",
					'Run `lumen consulta abrir <client> --motivo "..."` to begin a session',
					"Run `lumen journey progressed <client> --at <YYYY-MM-DD>` for progressions",
					"Run `lumen karma pair --a <id> --b <id>` to compare two charts",
				],
			};
		},
	});
}
