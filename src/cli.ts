import { runAxiCli } from "axi-sdk-js";
import { type CliContext, profileCommand } from "./commands/profile";
import { ProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager (AXI CLI)",
	"",
	"Commands:",
	"  profile add   Register a birth (local time + offset + coordinates + city)",
	"  profile list  List saved profiles",
	"  profile get   Show one profile by UUID",
	"  profile rm    Remove one profile by UUID",
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
			const profiles = context?.profiles.list() ?? [];
			return {
				profiles: profiles.length,
				help: [
					profiles.length === 0
						? 'Run `lumen profile add --when "1981-01-26T00:50" --offset 60 --at "9.15,-74.75" --city "Magangué, Colombia"`'
						: "Run `lumen profile list` to see saved profiles",
				],
			};
		},
	});
}
