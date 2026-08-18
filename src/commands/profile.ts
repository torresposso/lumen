import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import {
	ProfileStore as DefaultProfileStore,
	type ProfileStore,
} from "../storage/profile-store";
import {
	type ChartRequestOptions,
	type CliContext,
	defaultChartOptions,
	NatalIntake,
} from "./intake";

function sameOptions(a: ChartRequestOptions, b: ChartRequestOptions): boolean {
	return (
		a.houseSystem === b.houseSystem &&
		a.zodiac === b.zodiac &&
		a.topocentric === b.topocentric &&
		a.draconic === b.draconic &&
		a.bodies.length === b.bodies.length &&
		a.bodies.every((body, i) => body === b.bodies[i])
	);
}

export const profileUsage = [
	'lumen profile add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"lumen profile list",
	"lumen profile show <id>",
	"lumen profile remove <id>",
	"",
	"Guarda y gestiona datos de nacimiento de perfiles locales.",
].join("\n");

const PROFILE_FLAG_REFERENCE = NatalIntake.usage
	.split("\n")
	.slice(2)
	.join("\n");

export const profileAddUsage = [
	'lumen profile add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Guarda o actualiza un perfil local para reutilizarlo en lecturas.",
	"",
	PROFILE_FLAG_REFERENCE,
].join("\n");

export const profileListUsage = [
	"lumen profile list",
	"",
	"Lista los perfiles guardados sin exponer fechas de nacimiento:",
	"solo id y procedencia válida.",
].join("\n");

export const profileShowUsage = [
	"lumen profile show <id>",
	"",
	"Muestra el perfil, incluyendo los datos de nacimiento.",
].join("\n");

export const profileRemoveUsage = [
	"lumen profile remove <id>",
	"",
	"Elimina un perfil local. Eliminar un perfil ausente es un no-op exitoso.",
].join("\n");

function store(context: CliContext | undefined): ProfileStore {
	return context?.profiles ?? new DefaultProfileStore();
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

	if (sub === undefined || sub === "--help") return profileUsage;
	if (rest.includes("--help")) {
		switch (sub) {
			case "add":
				return profileAddUsage;
			case "list":
				return profileListUsage;
			case "show":
				return profileShowUsage;
			case "remove":
				return profileRemoveUsage;
			default:
				return profileUsage;
		}
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
			const result = await NatalIntake.process(
				rest.slice(1),
				undefined,
				"profile add",
			);
			if (result.kind === "help") return profileAddUsage;
			if (!sameOptions(result.request.options, defaultChartOptions())) {
				throw new AxiError(
					"Chart options are not stored on profiles",
					"VALIDATION_ERROR",
					[
						"Chart options travel in config.json or per-command flags (Q7)",
						"`profile add` only stores the resolved birth",
					],
				);
			}
			store(context).add(id, result.request.birth);
			return {
				profile: id,
				status: "saved",
				help: [
					`Run \`lumen chart natal ${id}\` for your chart with its evolutionary mechanics`,
				],
			};
		}
		case "list": {
			assertNoFlags(rest, "lumen profile list");
			const profiles = store(context)
				.list()
				.map((profile) => ({
					id: profile.id,
					provenance: profile.birthStatus,
				}));
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
			return { profile };
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
