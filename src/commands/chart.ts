import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli";
import type { ArgsSpec } from "../cli/args";
import { createSubcommandGroup } from "../cli/subcommand";
import {
	CHART_ARM_HELP,
	CHART_ARMS,
	CHART_COMMAND,
	PROFILE_LIST_HINT,
	PROGRESSION_FLAGS,
	TRANSIT_FLAGS,
} from "../cli/surface";
import { parseTransitInput } from "../domain/transit-input";

import { computeNatalChart } from "../engine/natal/index";
import { computeProgressedChart } from "../engine/progressions/index";
import { computeTransitChart } from "../engine/transits/index";

const chartUsage = [
	CHART_ARMS.natal,
	CHART_ARMS.transits,
	CHART_ARMS.progressions,
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

const chartProgressionsUsage = [
	CHART_ARMS.progressions,
	"",
	"Calculates secondary progressions and the 28-year Sol-Luna phase cycle over a natal chart.",
].join("\n");

const NATAL_SPEC: ArgsSpec = {
	known: new Set(),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
};

const TRANSITS_SPEC: ArgsSpec = {
	known: new Set([TRANSIT_FLAGS.when, TRANSIT_FLAGS.where]),
	required: new Set([TRANSIT_FLAGS.when]),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
	rules: {
		[TRANSIT_FLAGS.when]: { trim: true, nonEmpty: true },
		[TRANSIT_FLAGS.where]: { trim: true, nonEmpty: true },
	},
};

const PROGRESSIONS_SPEC: ArgsSpec = {
	known: new Set([PROGRESSION_FLAGS.when]),
	required: new Set([PROGRESSION_FLAGS.when]),
	positionals: 1,
	positionalName: "profile id",
	positionalHint: "Use the UUID printed by `lumen profile add`",
	rules: {
		[PROGRESSION_FLAGS.when]: { trim: true, nonEmpty: true },
	},
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
			spec: TRANSITS_SPEC,
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
		progressions: {
			spec: PROGRESSIONS_SPEC,
			summary: CHART_ARM_HELP.progressions,
			line: CHART_ARMS.progressions,
			usage: chartProgressionsUsage,
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
					when: PROGRESSION_FLAGS.when,
				});

				const progressions = computeProgressedChart(
					profile,
					targetInput,
					ephemeris,
				);
				return { progressions };
			},
		},
	},
});
