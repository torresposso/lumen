import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import { NatalIntake, type NatalRequest } from "../cli/natal-intake";
import { requestFromProfile, takeProfileArg } from "../cli/profile-args";
import { AstrologicalEngine } from "../core/astrological-engine";
import { toDraconicChart } from "../core/draconic-zodiac";
import {
	computeSynastry,
	type SynastryContact,
	type SynastryOptions,
	type SynastryResult,
	toSynastryChart,
} from "../core/synastry";

const SYNASTRY_FLAGS_HELP = [
	"Flags:",
	"  --focus   evolutionary (default) | classical | all",
	"  --orb     Orbe máximo en grados, 0-180 (default 3)",
	"  --limit   Contactos mostrados por defecto (default 12)",
	"  --full    Incluye overlays de casas y campos completos",
].join("\n");

export const synastryUsage = [
	"lumen synastry self --profile <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"lumen synastry pair --a <id> --b <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"self: compara la carta natal con la draconic de la misma persona.",
	"pair: compara las cartas de dos perfiles guardados.",
	"",
	SYNASTRY_FLAGS_HELP,
].join("\n");

export const synastrySelfUsage = [
	"lumen synastry self --profile <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"Compara la carta natal con la proyección draconic de la misma persona.",
	"También acepta flags de nacimiento inline en lugar de --profile.",
	"",
	SYNASTRY_FLAGS_HELP,
].join("\n");

export const synastryPairUsage = [
	"lumen synastry pair --a <id> --b <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"Compara las cartas de dos perfiles guardados.",
	"",
	"  --a, --b   Perfiles guardados con `lumen profile add`",
	SYNASTRY_FLAGS_HELP,
].join("\n");

const VALID_FOCUS = new Set<NonNullable<SynastryOptions["focus"]>>([
	"evolutionary",
	"classical",
	"all",
]);

interface SynastryFlags {
	orb: number;
	focus: NonNullable<SynastryOptions["focus"]>;
	limit: number;
	full: boolean;
}

function parseOrb(raw: string): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0 || value > 180) {
		throw new AxiError(
			"Flag --orb expects a positive number of degrees (max 180)",
			"VALIDATION_ERROR",
			["Example: --orb 3"],
		);
	}
	return value;
}

function parseLimit(raw: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new AxiError(
			"Flag --limit expects a positive integer",
			"VALIDATION_ERROR",
			["Example: --limit 12"],
		);
	}
	return value;
}

function parseFocus(raw: string): NonNullable<SynastryOptions["focus"]> {
	if (!VALID_FOCUS.has(raw as NonNullable<SynastryOptions["focus"]>)) {
		throw new AxiError(`Invalid focus: ${raw}`, "VALIDATION_ERROR", [
			"Valid focus values: evolutionary, classical, all",
		]);
	}
	return raw as NonNullable<SynastryOptions["focus"]>;
}

function takeFlagValue(
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

function parseOptionalValue(arg: string, name: string): string | undefined {
	if (!arg.startsWith(`--${name}=`)) return undefined;
	const value = arg.slice(name.length + 3);
	if (value === "") {
		throw new AxiError(`Flag --${name} requires a value`, "VALIDATION_ERROR", [
			`Example: --${name} <value>`,
		]);
	}
	return value;
}

function extractSelfFlags(args: string[]): {
	chartArgs: string[];
	flags: SynastryFlags;
} {
	const chartArgs: string[] = [];
	let orb = 3;
	let focus: NonNullable<SynastryOptions["focus"]> = "evolutionary";
	let limit = 12;
	let full = false;
	const seen = new Set<string>();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		const inlineOrb = parseOptionalValue(arg, "orb");
		if (arg === "--orb" || inlineOrb !== undefined) {
			assertOnce(seen, "--orb");
			if (arg === "--orb") {
				const taken = takeFlagValue(args, i, "orb");
				orb = parseOrb(taken.value);
				i = taken.next;
			} else {
				orb = parseOrb(inlineOrb as string);
			}
			continue;
		}

		const inlineFocus = parseOptionalValue(arg, "focus");
		if (arg === "--focus" || inlineFocus !== undefined) {
			assertOnce(seen, "--focus");
			if (arg === "--focus") {
				const taken = takeFlagValue(args, i, "focus");
				focus = parseFocus(taken.value);
				i = taken.next;
			} else {
				focus = parseFocus(inlineFocus as string);
			}
			continue;
		}

		const inlineLimit = parseOptionalValue(arg, "limit");
		if (arg === "--limit" || inlineLimit !== undefined) {
			assertOnce(seen, "--limit");
			if (arg === "--limit") {
				const taken = takeFlagValue(args, i, "limit");
				limit = parseLimit(taken.value);
				i = taken.next;
			} else {
				limit = parseLimit(inlineLimit as string);
			}
			continue;
		}

		if (arg === "--full") {
			assertOnce(seen, "--full");
			full = true;
			continue;
		}

		chartArgs.push(arg);
	}

	return { chartArgs, flags: { orb, focus, limit, full } };
}

function parsePairFlags(args: string[]): {
	a: string | undefined;
	b: string | undefined;
	flags: SynastryFlags;
} {
	let a: string | undefined;
	let b: string | undefined;
	let orb = 3;
	let focus: NonNullable<SynastryOptions["focus"]> = "evolutionary";
	let limit = 12;
	let full = false;
	const seen = new Set<string>();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		const inlineA = parseOptionalValue(arg, "a");
		if (arg === "--a" || inlineA !== undefined) {
			assertOnce(seen, "--a");
			a =
				arg === "--a" ? takeFlagValue(args, i, "a").value : (inlineA as string);
			if (arg === "--a") i++;
			continue;
		}

		const inlineB = parseOptionalValue(arg, "b");
		if (arg === "--b" || inlineB !== undefined) {
			assertOnce(seen, "--b");
			b =
				arg === "--b" ? takeFlagValue(args, i, "b").value : (inlineB as string);
			if (arg === "--b") i++;
			continue;
		}

		const inlineOrb = parseOptionalValue(arg, "orb");
		if (arg === "--orb" || inlineOrb !== undefined) {
			assertOnce(seen, "--orb");
			orb =
				arg === "--orb"
					? parseOrb(takeFlagValue(args, i, "orb").value)
					: parseOrb(inlineOrb as string);
			if (arg === "--orb") i++;
			continue;
		}

		const inlineFocus = parseOptionalValue(arg, "focus");
		if (arg === "--focus" || inlineFocus !== undefined) {
			assertOnce(seen, "--focus");
			focus =
				arg === "--focus"
					? parseFocus(takeFlagValue(args, i, "focus").value)
					: parseFocus(inlineFocus as string);
			if (arg === "--focus") i++;
			continue;
		}

		const inlineLimit = parseOptionalValue(arg, "limit");
		if (arg === "--limit" || inlineLimit !== undefined) {
			assertOnce(seen, "--limit");
			limit =
				arg === "--limit"
					? parseLimit(takeFlagValue(args, i, "limit").value)
					: parseLimit(inlineLimit as string);
			if (arg === "--limit") i++;
			continue;
		}

		if (arg === "--full") {
			assertOnce(seen, "--full");
			full = true;
			continue;
		}

		if (arg.startsWith("-")) {
			throw new AxiError(
				`Unknown flag --${arg.startsWith("--") ? arg.slice(2) : arg.slice(1)} for \`synastry pair\``,
				"VALIDATION_ERROR",
				[
					"Valid flags: --a, --b, --focus, --orb, --limit, --full",
					"Run `lumen synastry pair --help`",
				],
			);
		}
		throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
			"Run `lumen synastry pair --help`",
		]);
	}

	return { a, b, flags: { orb, focus, limit, full } };
}

type ProjectedContact =
	| SynastryContact
	| {
			a: string;
			b: string;
			aspect: string;
			orb: number;
	  };

function renderContacts(
	result: SynastryResult,
	flags: SynastryFlags,
	command: "self" | "pair",
): { contacts: ProjectedContact[] | string; help?: string[] } {
	if (result.contacts.length === 0) {
		return {
			contacts: `0 contacts found within orb ${flags.orb}`,
		};
	}

	const limited = result.contacts.slice(0, flags.limit);
	const projected = limited.map((contact) =>
		flags.full
			? contact
			: {
					a: contact.a,
					b: contact.b,
					aspect: contact.aspect,
					orb: contact.orb,
				},
	);

	const help: string[] = [];
	const base =
		command === "self"
			? "lumen synastry self --profile <id>"
			: "lumen synastry pair --a <id> --b <id>";
	if (result.contacts.length > flags.limit) {
		help.push(
			`Run \`${base} ${flags.full ? "" : "--full "}--limit ${result.contacts.length}\` for all ${result.contacts.length} contacts`,
		);
	}
	if (!flags.full) {
		help.push(`Run \`${base} --full\` for overlays and full contact fields`);
	}

	return { contacts: projected, ...(help.length > 0 ? { help } : {}) };
}

async function resolveSelfRequest(
	args: string[],
	context: CliContext | undefined,
): Promise<NatalRequest> {
	const { name, rest } = takeProfileArg(args);
	if (name !== undefined) {
		if (rest.length > 0) {
			throw new AxiError(
				"Cannot combine --profile with inline birth or chart flags",
				"VALIDATION_ERROR",
				["Use `lumen synastry self --profile <id>` or inline flags, not both"],
			);
		}
		return requestFromProfile(context, name);
	}

	const result = await NatalIntake.process(rest, undefined, "synastry self");
	if (result.kind === "help") {
		throw new AxiError("Missing required birth flags", "VALIDATION_ERROR", [
			"Run `lumen synastry self --help`",
		]);
	}
	return result.request;
}

export const synastryCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") {
		return synastryUsage;
	}

	if (sub === "self") {
		if (rest.includes("--help")) return synastrySelfUsage;
		const { chartArgs, flags } = extractSelfFlags(rest);
		const request = await resolveSelfRequest(chartArgs, context);
		const engine = new AstrologicalEngine();
		const natal = engine.chartFor(request);
		const draconic = toDraconicChart(natal, request.options.node);
		const result = computeSynastry(
			toSynastryChart("natal", natal, request.options.node),
			toSynastryChart("draconic", draconic, request.options.node),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "self");
		const help = [
			"lumen synastry self (natal vs draconic) is an experimental extension and is not part of Jeffrey Wolf Green synastry doctrine.",
			...(rendered.help ?? []),
		];
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				contacts: rendered.contacts,
				...(flags.full ? { overlays: result.overlays } : {}),
				help,
			},
		};
	}

	if (sub === "pair") {
		if (rest.includes("--help")) return synastryPairUsage;
		const { a, b, flags } = parsePairFlags(rest);
		if (a === undefined || b === undefined) {
			throw new AxiError(
				"synastry pair requires --a and --b",
				"VALIDATION_ERROR",
				["Run `lumen synastry pair --a <id> --b <id>`"],
			);
		}
		const requestA = requestFromProfile(context, a);
		const requestB = requestFromProfile(context, b);
		const engine = new AstrologicalEngine();
		const chartA = engine.chartFor(requestA);
		const chartB = engine.chartFor(requestB);
		const result = computeSynastry(
			toSynastryChart(a, chartA, requestA.options.node),
			toSynastryChart(b, chartB, requestB.options.node),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "pair");
		const help = [
			"Jeffrey Wolf Green synastry reads Pluto-to-Pluto, Pluto-to-node, nodal ruler and house overlay evidence; the evolutionary condition of each person is required for a definitive reading.",
			...(rendered.help ?? []),
		];
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				contacts: rendered.contacts,
				...(flags.full ? { overlays: result.overlays } : {}),
				help,
			},
		};
	}

	throw new AxiError(`Unknown synastry command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen synastry --help` for valid subcommands",
	]);
};
