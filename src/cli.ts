import { type AxiCliOptions, runAxiCli } from "axi-sdk-js";
import { CaelusEphemeris, type Ephemeris } from "./adapters/ephemeris";
import { chartCommand } from "./commands/chart";
import { profileCommand } from "./commands/profile";
import { homeView, formatCommandsHelp } from "./cli/surface";
import type { CliContext } from "./cli/context";
import { requireCliContext } from "./cli/context";
import type { ProfileStore } from "./domain/store";
import { SqliteProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

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
	ephemeris: Ephemeris = new CaelusEphemeris(),
): AxiCliOptions<CliContext> {
	const catalog = [
		...profileCommand.describeArms(),
		...chartCommand.describeArms(),
	];
	const topLevelHelp = [
		"lumen — birth profile manager & astrological chart engine (AXI CLI)",
		"",
		formatCommandsHelp(catalog),
	].join("\n");

	return {
		description: "lumen — birth profile manager & astrological chart engine",
		version: VERSION,
		argv: seams.argv,
		stdout: seams.stdout,
		topLevelHelp,
		resolveContext: async () => ({ profiles, ephemeris }),
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

