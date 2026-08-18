import { runAxiCli } from "axi-sdk-js";
import {
	type CliContext,
	PROFILE_ADD_HINT,
	profileCommand,
	requireProfileStore,
} from "./commands/profile";
import { ProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager (AXI CLI)",
	"",
	"Commands:",
	"  profile add    Register a birth (ISO birthdatetime + coordinates + birthplace)",
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
			const profiles = requireProfileStore(context).list();
			return {
				profiles: profiles.length,
				help: [
					profiles.length === 0
						? PROFILE_ADD_HINT
						: "Run `lumen profile list` to see saved profiles",
				],
			};
		},
	});
}
