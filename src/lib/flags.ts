import { AxiError } from "axi-sdk-js";

export interface ParsedArgs {
	values: Record<string, string>;
	flags: Set<string>;
	positionals: string[];
}

export interface FlagSpec {
	value: readonly string[];
	boolean: readonly string[];
}

/** Structurally: anything exposing a zod object schema's `.shape` key map. */
interface SchemaShape {
	shape: Record<string, unknown>;
}

function toFlagName(key: string): string {
	return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Derive a {@link FlagSpec} from zod schema keys plus explicit extras. The
 *  schemas are the single source of truth for the flag vocabulary; this keeps
 *  the CLI spec in sync with validation without a second hand-maintained list. */
export function deriveFlagSpec(
	schemas: SchemaShape[],
	extras: FlagSpec,
): FlagSpec {
	const value = new Set<string>(extras.value);
	for (const schema of schemas) {
		for (const key of Object.keys(schema.shape)) {
			value.add(toFlagName(key));
		}
	}
	return {
		value: [...value],
		boolean: [...extras.boolean],
	};
}

export function parseFlags(args: string[]): ParsedArgs {
	const values: Record<string, string> = {};
	const flags = new Set<string>();
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg.startsWith("--")) {
			const eq = arg.indexOf("=");
			if (eq !== -1) {
				values[arg.slice(2, eq)] = arg.slice(eq + 1);
				continue;
			}
			const name = arg.slice(2);
			const next = args[i + 1];
			if (next !== undefined && !next.startsWith("--")) {
				values[name] = next;
				i++;
			} else {
				flags.add(name);
			}
		} else if (arg.startsWith("-") && arg.length > 1) {
			flags.add(arg.slice(1));
		} else {
			positionals.push(arg);
		}
	}

	return { values, flags, positionals };
}

export function assertKnownFlags(
	parsed: ParsedArgs,
	spec: FlagSpec,
	command: string,
): void {
	const valid = [...spec.value, ...spec.boolean, "help"];

	for (const name of [...parsed.flags, ...Object.keys(parsed.values)]) {
		if (!valid.includes(name)) {
			throw new AxiError(
				`Unknown flag --${name} for \`${command}\``,
				"VALIDATION_ERROR",
				[`Valid flags for \`${command}\`: --${valid.join(", --")}`],
			);
		}
	}

	if (parsed.positionals.length > 0) {
		throw new AxiError(
			`Unexpected argument: ${parsed.positionals.join(" ")}`,
			"VALIDATION_ERROR",
			[`Usage: lumen ${command} [flags]`],
		);
	}
}
