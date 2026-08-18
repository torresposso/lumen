import { runAxiCli } from "axi-sdk-js";
import { profileCommand } from "./commands/profile";
import { ADD_FLAGS, PROFILE_ADD_EXAMPLE } from "./core/cli-surface";
import type { CliContext } from "./core/types";
import { ProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager (AXI CLI)",
	"",
	"Commands:",
	`  profile add    Register a birth (ISO ${ADD_FLAGS.when} + ${ADD_FLAGS.where} coordinates/place)`,
	"  profile list   List saved profiles",
	"  profile get    Show one profile by UUID",
	"  profile delete Remove one profile by UUID",
].join("\n");

export async function main(): Promise<void> {
	await runAxiCli<CliContext>({
		description: "lumen — birth profile manager",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		resolveContext: async () => ({ profiles: new ProfileStore() }),
		commands: {
			profile: profileCommand,
		},
		home: async (_args, context) => {
			const profiles = context!.profiles.list();
			return {
				profiles: profiles.length,
				help: [
					profiles.length === 0
						? `Run \`${PROFILE_ADD_EXAMPLE}\``
						: "Run `lumen profile list` to see saved profiles",
				],
			};
		},
	});
}

