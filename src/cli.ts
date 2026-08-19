import { type AxiCliOptions, runAxiCli } from "axi-sdk-js";
import { chartCommand } from "./commands/chart";
import { profileCommand } from "./commands/profile";
import { homeView, profileCommandsHelp } from "./core/cli-surface";
import type { CliContext, ProfileStore } from "./core/store";
import { requireCliContext } from "./core/store";
import { SqliteProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager & astrological chart engine (AXI CLI)",
	"",
	profileCommandsHelp(),
].join("\n");

/** The wiring's injectable seams — the pieces the SDK reads from the process that tests stub. */
export interface CliSeams {
	argv?: string[];
	stdout?: { write: (chunk: string) => unknown };
}

/**
 * The declarative CLI — what `lumen` is, as one AXI options object.
 */
export function buildCliOptions(
	seams: CliSeams = {},
	profiles: ProfileStore = new SqliteProfileStore(),
): AxiCliOptions<CliContext> {
	return {
		description: "lumen — birth profile manager & astrological chart engine",
		version: VERSION,
		argv: seams.argv,
		stdout: seams.stdout,
		topLevelHelp,
		resolveContext: async () => ({ profiles }),
		commands: {
			profile: profileCommand,
			chart: chartCommand,
		},
		home: (_args, context) => {
			const ctx = requireCliContext(context);
			return homeView(ctx.profiles);
		},
	};
}

export async function main(): Promise<void> {
	await runAxiCli(buildCliOptions());
}
