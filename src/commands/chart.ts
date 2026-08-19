import { AxiError } from "axi-sdk-js";
import type { ArgsSpec } from "../cli/args";
import { PROFILE_LIST_HINT } from "../cli/surface";
import type { CliContext } from "../cli/context";
import { createSubcommandGroup } from "../cli/subcommand";
import { computeNatalChart } from "../engine/natal";

const chartUsage = [
	"lumen chart natal <uuid>",
	"",
	"Calculate astrological charts.",
].join("\n");

const chartNatalUsage = [
	"lumen chart natal <uuid>",
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
	name: "lumen chart",
	usage: chartUsage,
	subcommands: {
		natal: {
			spec: NATAL_SPEC,
			summary: "Calculate natal chart (Porphyry / True Node / JWGEA)",
			line: "lumen chart natal <uuid>",
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
