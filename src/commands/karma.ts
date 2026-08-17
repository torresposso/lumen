import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeKarma } from "../core/karma";
import type { CliContext } from "./intake";
import { requestFromProfile } from "./intake";

export const karmaUsage = [
	"lumen karma pair --a <id> --b <id> [--orb 3]",
	"",
	"Acuerdos y contratos evolutivos entre dos Almas (JWG).",
	"Calcula contactos cruzados inter-cartas a Plutón/Nodos y superposiciones de casas.",
].join("\n");

export const karmaPairUsage = [
	"lumen karma pair --a <id> --b <id> [--orb 3]",
	"",
	"  --a    Perfil A",
	"  --b    Perfil B",
	"  --orb  Orbe máximo en grados (default: 3°)",
].join("\n");

function takeValue(
	args: string[],
	index: number,
	name: string,
): { value: string; next: number } {
	const next = args[index + 1];
	if (next === undefined || next.startsWith("-")) {
		throw new AxiError(`Flag --${name} requires a value`, "VALIDATION_ERROR", [
			`Example: --${name} <value>`,
		]);
	}
	return { value: next, next: index + 1 };
}

function assertOnce(seen: Set<string>, flag: string): void {
	if (seen.has(flag)) {
		throw new AxiError(
			`Flag ${flag} was provided more than once`,
			"VALIDATION_ERROR",
			[`Use ${flag} exactly once`],
		);
	}
	seen.add(flag);
}

export const karmaCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return karmaUsage;

	if (sub !== "pair") {
		throw new AxiError(`Unknown karma command: ${sub}`, "VALIDATION_ERROR", [
			"Run `lumen karma --help` for valid subcommands",
		]);
	}

	if (rest.includes("--help")) return karmaPairUsage;

	let idA: string | undefined;
	let idB: string | undefined;
	let orb = 3;
	const seen = new Set<string>();

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (arg === undefined) continue;

		if (arg === "--a" || arg.startsWith("--a=")) {
			assertOnce(seen, "--a");
			idA =
				arg === "--a"
					? takeValue(rest, i, "a").value
					: arg.slice("--a=".length);
			if (arg === "--a") i++;
			continue;
		}

		if (arg === "--b" || arg.startsWith("--b=")) {
			assertOnce(seen, "--b");
			idB =
				arg === "--b"
					? takeValue(rest, i, "b").value
					: arg.slice("--b=".length);
			if (arg === "--b") i++;
			continue;
		}

		if (arg === "--orb" || arg.startsWith("--orb=")) {
			assertOnce(seen, "--orb");
			const raw =
				arg === "--orb"
					? takeValue(rest, i, "orb").value
					: arg.slice("--orb=".length);
			if (arg === "--orb") i++;
			orb = Number(raw);
			if (!Number.isFinite(orb) || orb <= 0) {
				throw new AxiError(
					"Flag --orb expects a positive number",
					"VALIDATION_ERROR",
					["Example: --orb 3"],
				);
			}
			continue;
		}

		throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
			"Run `lumen karma pair --help`",
		]);
	}

	if (idA === undefined || idB === undefined) {
		throw new AxiError(
			"Flags --a and --b are both required",
			"VALIDATION_ERROR",
			["Example: lumen karma pair --a silvia --b carlos"],
		);
	}

	const reqA = requestFromProfile(context, idA);
	const reqB = requestFromProfile(context, idB);

	const ephemeris = new CaelusEphemeris();

	const result = computeKarma(idA, reqA, idB, reqB, ephemeris, orb);

	return {
		karma: {
			pair: { a: idA, b: idB },
			summary: result.summary,
		},
		contacts:
			result.contacts.length === 0
				? `0 contacts found within orb ${orb}°`
				: result.contacts,
		nodalOverlays: result.overlays,
	};
};
