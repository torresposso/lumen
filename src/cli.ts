import { type AxiCliOptions, AxiError, runAxiCli } from "axi-sdk-js";
import { CaelusEphemeris, type Ephemeris } from "./adapters/ephemeris";
import { formatCommandsHelp, homeView } from "./cli/surface";
import { chartCommand } from "./commands/chart";
import { profileCommand } from "./commands/profile";
import type { ProfileStore } from "./domain/store";
import { SqliteProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

/** The wiring's injectable seams — the pieces the SDK reads from the process that tests stub. */
export interface CliSeams {
	argv?: string[];
	stdout?: { write: (chunk: string) => unknown };
}

/**
 * The runtime execution context the composition root resolves and every arm
 * (and the home handler) receives: the capability ports, nothing else.
 * Defined next to the wiring that provides it (collapsed here 2026-08-19:
 * the guard and the shape shared one tiny module with the root).
 */
export interface CliContext {
	profiles: ProfileStore;
	ephemeris: Ephemeris;
}

/**
 * Asserts that CLI context is present, throwing a loud CONTEXT_ERROR if the
 * composition root failed to provide it.
 */
export function requireCliContext(context: CliContext | undefined): CliContext {
	if (context === undefined) {
		throw new AxiError("No context provided", "CONTEXT_ERROR", [
			"The CLI always provides one — this is a lumen bug",
		]);
	}
	return context;
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
