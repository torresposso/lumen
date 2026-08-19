import { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../core/args";
import { computeNatalChart } from "../core/chart";
import { CHART_ARMS, PROFILE_LIST_HINT } from "../core/cli-surface";
import type { CliContext } from "../core/store";
import { createSubcommandGroup } from "../core/subcommand";

const chartUsage = [
	`${CHART_ARMS.natal} <uuid>`,
	"",
	"Calculate astrological charts.",
].join("\n");

const chartNatalUsage = [
	`${CHART_ARMS.natal} <uuid>`,
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
	name: "chart",
	usage: chartUsage,
	subcommands: {
		natal: {
			spec: NATAL_SPEC,
			usage: chartNatalUsage,
			run: (parsed, context) => {
				const { profiles } = context;
				const id = parsed.positionals[0] as string;
				const profile = profiles.get(id);
				if (!profile) {
					throw new AxiError(`Profile not found: ${id}`, "NOT_FOUND", [
						PROFILE_LIST_HINT,
					]);
				}

				const chart = computeNatalChart(profile);
				return { chart };
			},
		},
	},
});
