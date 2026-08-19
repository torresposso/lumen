import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, type ParsedArgs, parseArgs, wantsHelp } from "./args";

/** What the runner may return: the same shapes an AXI command may render (string or structured output). */
export type Renderable = string | Record<string, unknown>;

/**
 * A subcommand arm of a command module — what differs per arm. The runner
 * (`runSubcommand`) owns the choreography every arm would otherwise re-type:
 * parsing the raw arguments against the arm's spec, mapping `--help` to the
 * usage text, and dispatching to `run`.
 */
export interface Subcommand<TContext> {
	/** The args-contract spec for this arm's raw arguments. */
	spec: ArgsSpec;
	/** The usage text returned when this arm receives `--help`. */
	usage: string;
	/** The arm's behaviour, given the parsed arguments and guaranteed CLI context. */
	run: (
		parsed: ParsedArgs,
		context: TContext,
	) => Renderable | Promise<Renderable>;
}

/** Configuration for a group of subcommands under a command prefix. */
export interface SubcommandGroupSpec<TContext> {
	/** Full command prefix, e.g. "lumen profile". */
	name: string;
	/** The usage text returned when the group is called without subcommands or with `--help`. */
	usage: string;
	/** The registered subcommand arms. */
	subcommands: Readonly<Record<string, Subcommand<TContext>>>;
}

import { requireCliContext } from "./store";

/**
 * The subcommand runner — the single seam a command applies to a subcommand's
 * raw arguments. Parses them against the arm's spec via the args contract;
 * `--help` returns the arm's usage without running it; otherwise validates
 * context and dispatches to the arm's `run`.
 */
export async function runSubcommand<TContext>(
	context: TContext | undefined,
	args: string[],
	command: string,
	sub: Subcommand<TContext>,
): Promise<Renderable> {
	const parsed = parseArgs(args, sub.spec, command);
	if (parsed.help) return sub.usage;
	if (context === undefined) {
		requireCliContext(undefined);
	}
	return await sub.run(parsed, context as TContext);
}

/**
 * Creates an AxiCliCommand from a declarative table of subcommands.
 * Owns the routing: the first token picks the arm; an absent arm or a group
 * requested via `--help` returns the group usage; an unknown arm raises a
 * `VALIDATION_ERROR`. The help *rule* is never re-implemented here — the
 * dispatcher consults the args contract's `wantsHelp` over the full arg list
 * before rejecting an unknown arm, so `--help` wins at the group seam exactly
 * as it does inside an arm (ADR-0007: the surface token is the single home of
 * the vocabulary the messages interpolate).
 */
export function createSubcommandGroup<TContext>(
	group: SubcommandGroupSpec<TContext>,
): AxiCliCommand<TContext> {
	return async (args, context) => {
		const [subName, ...rest] = args;

		if (subName === undefined) {
			return group.usage;
		}

		const arm = group.subcommands[subName];
		if (arm !== undefined) {
			return runSubcommand(context, rest, `${group.name} ${subName}`, arm);
		}

		// Unknown subcommand — unless help was requested. The help-wins rule
		// belongs to the args contract: an agent that guesses the arm name
		// wrong and appends `--help` lands on usage, not on a dead-end error.
		if (wantsHelp(args)) {
			return group.usage;
		}

		const commandWord = group.name.split(" ").at(-1) ?? group.name;
		throw new AxiError(
			`Unknown ${commandWord} command: ${subName}`,
			"VALIDATION_ERROR",
			[`Run \`${group.name} --help\` for usage`],
		);
	};
}
