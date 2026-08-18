import { runAxiCli } from "axi-sdk-js";
import { profileCommand } from "./commands/profile";
import {
	ADD_FLAGS,
	PROFILE_ADD_HINT,
	PROFILE_ARMS,
	PROFILE_LIST_HINT,
} from "./core/cli-surface";
import type { CliContext } from "./core/types";
import { SqliteProfileStore } from "./storage/profile-store";
import { VERSION } from "./version";

const topLevelHelp = [
	"lumen — birth profile manager (AXI CLI)",
	"",
	"Commands:",
	`  ${PROFILE_ARMS.add}    Register a birth (ISO ${ADD_FLAGS.when} + ${ADD_FLAGS.where} coordinates/place)`,
	`  ${PROFILE_ARMS.list}   List saved profiles`,
	`  ${PROFILE_ARMS.get}    Show one profile by UUID`,
	`  ${PROFILE_ARMS.delete} Remove one profile by UUID`,
].join("\n");

export async function main(): Promise<void> {
	await runAxiCli<CliContext>({
		description: "lumen — birth profile manager",
		version: VERSION,
		argv: process.argv.slice(2),
		topLevelHelp,
		resolveContext: async () => ({ profiles: new SqliteProfileStore() }),
		commands: {
			profile: profileCommand,
		},
		home: async (_args, context) => {
			const profiles = context!.profiles.list();
			return {
				profiles: profiles.length,
				help: [profiles.length === 0 ? PROFILE_ADD_HINT : PROFILE_LIST_HINT],
			};
		},
	});
}
