import { AxiError } from "axi-sdk-js";

/** What a command declares about its raw arguments before any value semantics. */
export interface ArgsSpec {
	/** The flags the command accepts. Each may appear once, as `--flag=value` or `--flag value`. */
	known: ReadonlySet<string>;
	/** Flags whose value is mandatory for this command. */
	required?: ReadonlySet<string>;
	/** Exact positional-argument count the command accepts: 0 (default) or 1. */
	positionals?: 0 | 1;
	/** What the positional is called in errors, e.g. "profile id". Defaults to "argument". */
	positionalName?: string;
	/** Suggestion attached when a required positional is missing. */
	positionalHint?: string;
	/** Per-flag value normalization applied after the syntax pass. */
	rules?: Readonly<Record<string, FlagValueRule>>;
}

/** How a flag's raw string becomes its semantic value. */
export interface FlagValueRule {
	/** Trim whitespace from the value before emptiness checks and in the result. */
	trim?: boolean;
	/** An empty value after trim is a violation (`Flag --x must not be empty`). */
	nonEmpty?: boolean;
	/** An optional flag whose empty value after trim means null. */
	emptyAsNull?: boolean;
}

export interface ParsedArgs {
	flags: ReadonlyMap<string, string | null>;
	positionals: readonly string[];
	/** True when `--help` appeared — the caller should show usage, not run. */
	help: boolean;
}

/**
 * The CLI-args contract — the single seam lumen applies to a command's raw
 * argument strings before any value semantics. Owns the flag syntax (known
 * flags, `--flag=value` / `--flag value` forms, duplicates, missing values),
 * `--help` (anywhere, winning over all other checks), positional counts and
 * per-flag **value normalization** (trim, non-empty, empty-means-null),
 * accumulating every checkable violation into one `VALIDATION_ERROR` with each
 * cited rule as a suggestion — one verdict per round-trip for an agent caller.
 * Presence, syntax and value normalization live here; value *semantics* live in
 * the contract that consumes the parsed flags (e.g. the birth-input contract).
 */
export function parseArgs(
	args: string[],
	spec: ArgsSpec,
	command: string,
): ParsedArgs {
	if (args.includes("--help")) {
		return { flags: new Map(), positionals: [], help: true };
	}

	const max = spec.positionals ?? 0;
	const issues: string[] = [];
	const flags = new Map<string, string | null>();
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (!arg.startsWith("-")) {
			positionals.push(arg);
			continue;
		}
		const eq = arg.indexOf("=");
		const flag = eq === -1 ? arg : arg.slice(0, eq);
		if (flag === "--help") {
			issues.push("--help does not take a value");
			continue;
		}
		if (!spec.known.has(flag)) {
			issues.push(`Unknown flag: ${flag}`);
			continue;
		}
		let value: string;
		if (eq !== -1) {
			value = arg.slice(eq + 1);
		} else {
			const next = args[i + 1];
			if (next === undefined || next.startsWith("--")) {
				issues.push(`Flag ${flag} requires a value`);
				continue;
			}
			value = next;
			i++;
		}
		if (flags.has(flag)) {
			issues.push(`Flag ${flag} provided more than once`);
			continue;
		}
		flags.set(flag, value);
	}

	// Value normalization: turn raw strings into semantic values per flag rule.
	for (const [flag, rule] of Object.entries(spec.rules ?? {})) {
		const raw = flags.get(flag);
		if (raw === undefined || raw === null) continue;
		const value = rule.trim ? raw.trim() : raw;
		if (rule.nonEmpty && value === "") {
			issues.push(`Flag ${flag} must not be empty`);
			continue;
		}
		if (rule.emptyAsNull && value === "") {
			flags.set(flag, null);
			continue;
		}
		flags.set(flag, value);
	}

	if (positionals.length > max) {
		issues.push(`Unexpected argument: ${positionals[max] as string}`);
	}
	if (positionals.length < max) {
		issues.push(`${command} requires a ${spec.positionalName ?? "argument"}`);
	}
	for (const flag of spec.required ?? []) {
		if (!flags.has(flag)) {
			issues.push(`Missing required flag ${flag} (value) for ${command}`);
		}
	}

	if (issues.length > 0) {
		const suggestions = [...issues];
		if (positionals.length < max && spec.positionalHint !== undefined) {
			suggestions.push(spec.positionalHint);
		}
		suggestions.push(`Run \`${command} --help\` for usage`);
		throw new AxiError(
			issues.length === 1 ? (issues[0] as string) : issues.join("; "),
			"VALIDATION_ERROR",
			suggestions,
		);
	}

	return { flags, positionals, help: false };
}
