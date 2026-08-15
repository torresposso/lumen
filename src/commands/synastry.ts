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

export const synastryUsage = [
	"lumen synastry self --profile <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"lumen synastry pair --a <id> --b <id> [--focus evolutionary|classical|all] [--orb 3] [--limit 12] [--full]",
	"",
	"self: compara la carta natal con la draconic de la misma persona.",
	"pair: compara las cartas de dos perfiles guardados.",
	"",
	"Flags:",
	"  --focus   evolutionary (default) | classical | all",
	"  --orb     Orbe máximo en grados (default 3)",
	"  --limit   Contactos mostrados por defecto (default 12)",
	"  --full    Incluye overlays de casas y campos completos",
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

function parseIntFlag(name: string, raw: string, fallback: number): number {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) {
		throw new AxiError(
			`Flag --${name} expects a positive number`,
			"VALIDATION_ERROR",
			[`Example: --${name} ${fallback}`],
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

function extractSelfFlags(args: string[]): {
	chartArgs: string[];
	flags: SynastryFlags;
} {
	const chartArgs: string[] = [];
	let orb = 3;
	let focus: NonNullable<SynastryOptions["focus"]> = "evolutionary";
	let limit = 12;
	let full = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;
		if (arg === "--orb" || arg.startsWith("--orb=")) {
			if (arg === "--orb") {
				const taken = takeFlagValue(args, i, "orb");
				orb = parseIntFlag("orb", taken.value, 3);
				i = taken.next;
			} else {
				orb = parseIntFlag("orb", arg.slice("--orb=".length), 3);
			}
			continue;
		}
		if (arg === "--focus" || arg.startsWith("--focus=")) {
			if (arg === "--focus") {
				const taken = takeFlagValue(args, i, "focus");
				focus = parseFocus(taken.value);
				i = taken.next;
			} else {
				focus = parseFocus(arg.slice("--focus=".length));
			}
			continue;
		}
		if (arg === "--limit" || arg.startsWith("--limit=")) {
			if (arg === "--limit") {
				const taken = takeFlagValue(args, i, "limit");
				limit = parseIntFlag("limit", taken.value, 12);
				i = taken.next;
			} else {
				limit = parseIntFlag("limit", arg.slice("--limit=".length), 12);
			}
			continue;
		}
		if (arg === "--full") {
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

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === undefined) continue;

		if (arg === "--a" || arg.startsWith("--a=")) {
			if (arg === "--a") {
				const taken = takeFlagValue(args, i, "a");
				a = taken.value;
				i = taken.next;
			} else {
				a = arg.slice("--a=".length);
			}
			continue;
		}
		if (arg === "--b" || arg.startsWith("--b=")) {
			if (arg === "--b") {
				const taken = takeFlagValue(args, i, "b");
				b = taken.value;
				i = taken.next;
			} else {
				b = arg.slice("--b=".length);
			}
			continue;
		}
		if (arg === "--orb" || arg.startsWith("--orb=")) {
			if (arg === "--orb") {
				const taken = takeFlagValue(args, i, "orb");
				orb = parseIntFlag("orb", taken.value, 3);
				i = taken.next;
			} else {
				orb = parseIntFlag("orb", arg.slice("--orb=".length), 3);
			}
			continue;
		}
		if (arg === "--focus" || arg.startsWith("--focus=")) {
			if (arg === "--focus") {
				const taken = takeFlagValue(args, i, "focus");
				focus = parseFocus(taken.value);
				i = taken.next;
			} else {
				focus = parseFocus(arg.slice("--focus=".length));
			}
			continue;
		}
		if (arg === "--limit" || arg.startsWith("--limit=")) {
			if (arg === "--limit") {
				const taken = takeFlagValue(args, i, "limit");
				limit = parseIntFlag("limit", taken.value, 12);
				i = taken.next;
			} else {
				limit = parseIntFlag("limit", arg.slice("--limit=".length), 12);
			}
			continue;
		}
		if (arg === "--full") {
			full = true;
			continue;
		}

		throw new AxiError(
			`Unknown flag --${arg.startsWith("--") ? arg.slice(2) : arg} for \`synastry pair\``,
			"VALIDATION_ERROR",
			[
				"Valid flags: --a, --b, --focus, --orb, --limit, --full",
				"Run `lumen synastry pair --help`",
			],
		);
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

	const result = await NatalIntake.process(rest);
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
		if (rest.includes("--help")) return synastryUsage;
		const { chartArgs, flags } = extractSelfFlags(rest);
		const request = await resolveSelfRequest(chartArgs, context);
		const engine = new AstrologicalEngine();
		const natal = engine.chartFor(request);
		const draconic = toDraconicChart(natal, request.options.node);
		const result = computeSynastry(
			toSynastryChart("natal", natal),
			toSynastryChart("draconic", draconic),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "self");
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				...rendered,
				...(flags.full ? { overlays: result.overlays } : {}),
			},
		};
	}

	if (sub === "pair") {
		if (rest.includes("--help")) return synastryUsage;
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
			toSynastryChart(a, chartA),
			toSynastryChart(b, chartB),
			{ orb: flags.orb, focus: flags.focus },
		);
		const rendered = renderContacts(result, flags, "pair");
		return {
			synastry: {
				pair: result.pair,
				summary: result.summary,
				...rendered,
				...(flags.full ? { overlays: result.overlays } : {}),
			},
		};
	}

	throw new AxiError(`Unknown synastry command: ${sub}`, "VALIDATION_ERROR", [
		"Run `lumen synastry --help` for valid subcommands",
	]);
};
