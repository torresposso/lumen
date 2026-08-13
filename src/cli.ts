import {
	installSessionStartHooks,
	runAxiCli,
	shouldInstallHooksForNodeAxiExecPath,
} from "axi-sdk-js";
import { chartCommand, chartUsage } from "./commands/chart";
import { VERSION } from "./version";

const HOOK_POLICY = { marker: "lumen", binaryNames: ["lumen"] };

const topLevelHelp = [
	"Comandos:",
	"  chart   Calcula una carta natal (efemérides caelus) con hechos astrológicos",
	"  setup   Instala/actualiza la integración de sesión (hooks + plugin OpenCode)",
	"  update  Revisa/instala la última versión",
].join("\n");

export function resolveExecPath(): string {
	const argv1 = process.argv[1] ?? "";
	return argv1.startsWith("/$bunfs/") ? process.execPath : argv1;
}

export async function setupCommand(
	args: string[],
): Promise<Record<string, unknown>> {
	if (args[0] !== "hooks") {
		return {
			error: "Unknown setup command",
			help: ["Run `lumen setup hooks`"],
		};
	}

	const execPath = resolveExecPath();
	if (!shouldInstallHooksForNodeAxiExecPath(execPath, HOOK_POLICY)) {
		return {
			error: "Cannot install session hooks from this executable",
			help: ["Run `bun run build`, then `./dist/lumen setup hooks`"],
		};
	}

	installSessionStartHooks({ ...HOOK_POLICY, execPath });
	return { setup: "hooks installed or already up to date" };
}

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
