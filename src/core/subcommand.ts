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
