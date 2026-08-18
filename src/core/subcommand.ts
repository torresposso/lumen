import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { type ArgsSpec, type ParsedArgs, parseArgs } from "./args";

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
	/** The arm's behaviour, given the parsed arguments and the CLI context. */
	run: (
		parsed: ParsedArgs,
		context: TContext | undefined,
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

/**
 * The subcommand runner — the single seam a command applies to a subcommand's
 * raw arguments. Parses them against the arm's spec via the args contract;
 * `--help` returns the arm's usage without running it; otherwise the arm's
 * `run` receives the parsed arguments and the CLI context. Parse violations
 * propagate as one `VALIDATION_ERROR` citing each rule — the args contract's
 * own contract, preserved unchanged.
 */
export async function runSubcommand<TContext>(
	context: TContext | undefined,
	args: string[],
	command: string,
	sub: Subcommand<TContext>,
): Promise<Renderable> {
	const parsed = parseArgs(args, sub.spec, command);
	if (parsed.help) return sub.usage;
	return await sub.run(parsed, context);
}

/**
 * Creates an AxiCliCommand from a declarative table of subcommands.
 * Owns the routing, top-level `--help`, and unknown-subcommand validation error.
 */
export function createSubcommandGroup<TContext>(
	group: SubcommandGroupSpec<TContext>,
): AxiCliCommand<TContext> {
	return async (args, context) => {
		const [subName, ...rest] = args;

		if (subName === undefined || subName === "--help") {
			return group.usage;
		}

		const arm = group.subcommands[subName];
		if (arm === undefined) {
			const commandWord = group.name.replace(/^lumen\s+/, "");
			throw new AxiError(
				`Unknown ${commandWord} command: ${subName}`,
				"VALIDATION_ERROR",
				[`Run \`${group.name} --help\` for usage`],
			);
		}

		return runSubcommand(context, rest, `${group.name} ${subName}`, arm);
	};
}
