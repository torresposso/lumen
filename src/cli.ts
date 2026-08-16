import { runAxiCli } from "axi-sdk-js";
import { chartCommand } from "./commands/chart";
import { consultaCommand } from "./commands/consulta";
import { journeyCommand } from "./commands/journey";
import { karmaCommand } from "./commands/karma";
import { profileCommand } from "./commands/profile";
import { setupCommand } from "./commands/setup";
import { soulCommand } from "./commands/soul";
import { ConsultationStore } from "./storage/consultation-store";
import { ProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"Comandos Evolutivos (JWG):",
	"  soul       Radiografía del estado basal del Alma y Punto de Polaridad",
	"  journey    Progresiones secundarias y giros estacionales",
	"  karma      Sinastría evolutiva y acuerdos entre Almas",
	"  consulta   Expedientes clínicos, hipótesis (H1, H2) y diálogo",
	"  profile    Gestión de perfiles locales",
	"  chart      Carta: natal (insumo base) y draconic (experimento etiquetado)",
	"  setup      Instala/actualiza la integración de sesión",
].join("\n");

export async function main(): Promise<void> {
	const profiles = new ProfileStore();
	const consultations = new ConsultationStore();

	await runAxiCli<{
		profiles: ProfileStore;
		consultations: ConsultationStore;
	}>({
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
			profile: profileCommand,
			chart: chartCommand,
			setup: setupCommand,
		},
		home: async (_args, context) => {
			const profiles = (context?.profiles.list() ?? []).map((profile) => ({
				id: profile.id,
				provenance: profile.birthStatus,
				session: context?.consultations.get(profile.id)?.status ?? "none",
			}));
			const activeConsultations = (context?.consultations.list() ?? []).filter(
				(c) => c.status === "open",
			);

			return {
				agenda:
					activeConsultations.length > 0
						? activeConsultations
						: "0 active consultations",
				profiles: profiles.length > 0 ? profiles : "0 profiles found",
				help: [
					'Run `lumen profile add <id> --when "1981-01-26T00:50" --place "Magangué, Colombia"`',
					"Run `lumen soul <profile>` for an evolutionary reading",
					'Run `lumen consulta abrir <profile> --motivo "..."` to begin a session',
					"Run `lumen journey progressed <profile> --at <YYYY-MM-DD>` for progressions",
					"Run `lumen karma pair --a <id> --b <id>` to compare two charts",
				],
			};
		},
	});
}
