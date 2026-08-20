import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli";
import type { ArgsSpec } from "../cli/args";
import { createSubcommandGroup } from "../cli/subcommand";
import {
	CHART_ARM_HELP,
	CHART_ARMS,
	CHART_COMMAND,
	PROFILE_LIST_HINT,
	TRANSIT_FLAGS,
} from "../cli/surface";
import {
	CHART_TRANSITS_SPEC,
	parseTransitInput,
} from "../domain/transit-input";
import { computeNatalChart } from "../engine/natal/index";
import { computeTransitChart } from "../engine/transits/index";

const chartUsage = [
	CHART_ARMS.natal,
	CHART_ARMS.transits,
	"",
	"Calculate astrological charts.",
].join("\n");

const chartNatalUsage = [
	CHART_ARMS.natal,
	"",
	"Calculates the natal chart with Porphyry houses, True Node, and JWGEA evolutionary mechanics.",
].join("\n");

const chartTransitsUsage = [
	CHART_ARMS.transits,
	"",
	"Calculates planetary transits and JWGEA evolutionary triggers over a natal chart.",
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
		transits: {
			spec: CHART_TRANSITS_SPEC,
			summary: CHART_ARM_HELP.transits,
			line: CHART_ARMS.transits,
			usage: chartTransitsUsage,
			run: (parsed, context) => {
				const { profiles, ephemeris } = context;
				const id = parsed.positionals[0] as string;
				const profile = profiles.get(id);
				if (!profile) {
					throw new AxiError(`Profile not found: ${id}`, "NOT_FOUND", [
						PROFILE_LIST_HINT,
					]);
				}

				const targetInput = parseTransitInput(parsed.flags, {
					when: TRANSIT_FLAGS.when,
					where: TRANSIT_FLAGS.where,
				});

				const transits = computeTransitChart(profile, targetInput, ephemeris);
				return { transits };
			},
		},
	},
});
