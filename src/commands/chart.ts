import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli";
import type { ArgsSpec } from "../cli/args";
import { createSubcommandGroup } from "../cli/subcommand";
import {
	CHART_ARM_HELP,
	CHART_ARMS,
	CHART_COMMAND,
	PROFILE_LIST_HINT,
} from "../cli/surface";
import { computeNatalChart } from "../engine/natal/index";

const chartUsage = [
	CHART_ARMS.natal,
	"",
	"Calculate astrological charts.",
].join("\n");

const chartNatalUsage = [
	CHART_ARMS.natal,
	"",
	"Calculates the natal chart with Porphyry houses, True Node, and JWGEA evolutionary mechanics.",
].join("\n");

const NATAL_SPEC: ArgsSpec = {
	known: new Set(),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
};

export const chartCommand = createSubcommandGroup<CliContext>({
	name: CHART_COMMAND,
	usage: chartUsage,
	subcommands: {
		natal: {
			spec: NATAL_SPEC,
			summary: CHART_ARM_HELP.natal,
			line: CHART_ARMS.natal,
			usage: chartNatalUsage,
			run: (parsed, context) => {
				const { profiles, ephemeris } = context;
				const id = parsed.positionals[0] as string;
				const profile = profiles.get(id);
				if (!profile) {
					throw new AxiError(`Profile not found: ${id}`, "NOT_FOUND", [
						PROFILE_LIST_HINT,
					]);
				}

				const chart = computeNatalChart(profile, ephemeris);
				return { chart };
			},
		},
	},
});
