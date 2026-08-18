import { type AxiCliOptions, runAxiCli } from "axi-sdk-js";
import { profileCommand } from "./commands/profile";
import { homeView, profileCommandsHelp } from "./core/cli-surface";
import { type CliContext, requireProfileStore } from "./core/context";
import type { ProfileStore } from "./core/store";
import { SqliteProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager (AXI CLI)",
	"",
	profileCommandsHelp(),
].join("\n");

/** The wiring's injectable seams — the pieces the SDK reads from the process that tests stub. */
export interface CliSeams {
	argv?: string[];
	stdout?: { write: (chunk: string) => unknown };
}

/**
 * The declarative CLI — what `lumen` is, as one AXI options object: the
 * commands, the derived top-level help, the context provider (one store) and
 * the home view. `main` runs it against the process; tests run it against a
 * stubbed `argv`/`stdout` and an in-memory store — the whole agent-facing
 * surface is the test surface.
 */
export function buildCliOptions(
	seams: CliSeams = {},
	profiles: ProfileStore = new SqliteProfileStore(),
): AxiCliOptions<CliContext> {
	return {
		description: "lumen — birth profile manager",
		version: VERSION,
		argv: seams.argv,
		stdout: seams.stdout,
		topLevelHelp,
		resolveContext: async () => ({ profiles }),
		commands: {
			profile: profileCommand,
		},
		home: (_args, context) => homeView(requireProfileStore(context)),
	};
}

export async function main(): Promise<void> {
	await runAxiCli(buildCliOptions());
}
