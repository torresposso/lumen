import { AxiError } from "axi-sdk-js";
import type { CliContext } from "./context";
import type { NatalRequest } from "./natal-intake";

export interface ProfileSelection {
	name?: string;
	rest: string[];
}

/** Removes a single `--profile`/`--profile=<id>` option from args and returns
 *  the selected profile name plus the remaining flags. */
export function takeProfileArg(args: string[]): ProfileSelection {
	let name: string | undefined;
	const rest: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--profile") {
			if (name !== undefined) {
				throw new AxiError(
					"Flag --profile was provided more than once",
					"VALIDATION_ERROR",
					["Use --profile exactly once"],
				);
			}
			const next = args[i + 1];
			if (next === undefined || next.startsWith("-")) {
				throw new AxiError(
					"Flag --profile requires a value",
					"VALIDATION_ERROR",
					["Example: --profile erik"],
				);
			}
			name = next;
			i++;
			continue;
		}
		if (arg.startsWith("--profile=")) {
			if (name !== undefined) {
				throw new AxiError(
					"Flag --profile was provided more than once",
					"VALIDATION_ERROR",
					["Use --profile exactly once"],
				);
			}
			name = arg.slice("--profile=".length);
			if (name === "") {
				throw new AxiError(
					"Flag --profile requires a value",
					"VALIDATION_ERROR",
					["Example: --profile erik"],
				);
			}
			continue;
		}
		rest.push(arg);
	}

	return { name, rest };
}

export function requestFromProfile(
	context: CliContext | undefined,
	name: string,
): NatalRequest {
	const profile = context?.profiles.get(name);
	if (profile === undefined) {
		throw new AxiError(`Unknown profile: ${name}`, "VALIDATION_ERROR", [
			"Run `lumen profile list` to see saved profiles",
			`Run \`lumen profile add ${name} --when ... --place ...\``,
		]);
	}
	return {
		birth: profile.birth,
		options: { ...profile.options },
	};
}
