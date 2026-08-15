import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import { NatalIntake } from "../cli/natal-intake";
import { ProfileStore } from "../cli/profile-store";

export const profileUsage = [
	'lumen profile add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"lumen profile list",
	"lumen profile show <id>",
	"lumen profile remove <id>",
	"",
	"Guarda datos de nacimiento localmente para reutilizarlos con chart, synastry y timing.",
].join("\n");

export const profileAddUsage = [
	'lumen profile add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Flags de nacimiento:",
	"  --when | --year --month --day --hour --minute",
	"  --place | --lat --lon [--zone]",
].join("\n");

function store(context: CliContext | undefined): ProfileStore {
	return context?.profiles ?? new ProfileStore();
}

function assertNoFlags(args: string[], command: string): void {
	if (args.some((arg) => arg.startsWith("-"))) {
		throw new AxiError(
			`Unexpected flag for \`${command}\``,
			"VALIDATION_ERROR",
			[`Run \`${command} --help\` for usage`],
		);
	}
}

export const profileCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") {
		return profileUsage;
	}
	if (rest.includes("--help")) {
		return sub === "add" ? profileAddUsage : profileUsage;
	}

	switch (sub) {
		case "add": {
			const id = rest[0];
			if (id === undefined || id.startsWith("-")) {
				throw new AxiError(
					"profile add requires a profile id",
					"VALIDATION_ERROR",
					["Run `lumen profile add <id> --when ... --place ...`"],
				);
			}
			const result = await NatalIntake.process(rest.slice(1));
			if (result.kind === "help") return profileAddUsage;
			store(context).add(id, result.request);
			return {
				profile: id,
				status: "saved",
				help: [
					`Run \`lumen chart --profile ${id}\` for an evolutionary reading`,
				],
			};
		}
		case "list": {
			assertNoFlags(rest, "lumen profile list");
			const profiles = store(context).list();
			if (profiles.length === 0) {
				return {
					profiles: "0 profiles found",
					help: ['Run `lumen profile add <id> --when "..." --place "..."`'],
				};
			}
			return { profiles };
		}
		case "show": {
			assertNoFlags(rest, "lumen profile show");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"profile show requires a profile id",
					"VALIDATION_ERROR",
					["Run `lumen profile show <id>`"],
				);
			}
			const profile = store(context).get(id);
			if (profile === undefined) {
				throw new AxiError(`Unknown profile: ${id}`, "VALIDATION_ERROR", [
					"Run `lumen profile list` to see saved profiles",
				]);
			}
			return {
				profile: {
					id: profile.id,
					birth: profile.birth,
					options: profile.options,
					updatedAt: profile.updatedAt,
				},
			};
		}
		case "remove": {
			assertNoFlags(rest, "lumen profile remove");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"profile remove requires a profile id",
					"VALIDATION_ERROR",
					["Run `lumen profile remove <id>`"],
				);
			}
			const removed = store(context).remove(id);
			return {
				profile: id,
				status: removed ? "removed" : "already absent (no-op)",
			};
		}
		default:
			throw new AxiError(
				`Unknown profile command: ${sub}`,
				"VALIDATION_ERROR",
				["Run `lumen profile --help` for valid subcommands"],
			);
	}
};
