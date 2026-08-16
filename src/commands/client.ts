import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../cli/context";
import { NatalIntake } from "../cli/natal-intake";
import { ProfileStore } from "../cli/profile-store";

export const clientUsage = [
	'lumen client add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"lumen client list",
	"lumen client show <id>",
	"lumen client remove <id>",
	"",
	"Guarda y gestiona datos de nacimiento de consultantes/perfiles locales.",
].join("\n");

const CLIENT_FLAG_REFERENCE = NatalIntake.usage.split("\n").slice(2).join("\n");

export const clientAddUsage = [
	'lumen client add <id> --when 1981-01-26T00:50 --place "Magangué, Colombia"',
	"",
	"Guarda o actualiza un cliente local para reutilizarlo en lecturas.",
	"",
	CLIENT_FLAG_REFERENCE,
].join("\n");

export const clientListUsage = [
	"lumen client list",
	"",
	"Lista los clientes guardados (solo id y fecha de nacimiento).",
].join("\n");

export const clientShowUsage = [
	"lumen client show <id>",
	"",
	"Muestra el perfil del consultante, incluyendo datos de nacimiento y opciones.",
].join("\n");

export const clientRemoveUsage = [
	"lumen client remove <id>",
	"",
	"Elimina un cliente local. Eliminar un cliente ausente es un no-op exitoso.",
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

export const clientCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;

	if (sub === undefined || sub === "--help") {
		return clientUsage;
	}
	if (rest.includes("--help")) {
		switch (sub) {
			case "add":
				return clientAddUsage;
			case "list":
				return clientListUsage;
			case "show":
				return clientShowUsage;
			case "remove":
				return clientRemoveUsage;
			default:
				return clientUsage;
		}
	}

	switch (sub) {
		case "add": {
			const id = rest[0];
			if (id === undefined || id.startsWith("-")) {
				throw new AxiError(
					"client add requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client add <id> --when ... --place ...`"],
				);
			}
			const result = await NatalIntake.process(
				rest.slice(1),
				undefined,
				"client add",
			);
			if (result.kind === "help") return clientAddUsage;
			store(context).add(id, result.request);
			return {
				client: id,
				status: "saved",
				help: [
					`Run \`lumen soul ${id}\` for baseline evolutionary reading`,
					`Run \`lumen consulta abrir ${id}\` to start consultation`,
				],
			};
		}
		case "list": {
			assertNoFlags(rest, "lumen client list");
			const profiles = store(context).list();
			if (profiles.length === 0) {
				return {
					clients: "0 clients found",
					help: ['Run `lumen client add <id> --when "..." --place "..."`'],
				};
			}
			return { clients: profiles };
		}
		case "show": {
			assertNoFlags(rest, "lumen client show");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"client show requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client show <id>`"],
				);
			}
			const profile = store(context).get(id);
			if (profile === undefined) {
				throw new AxiError(`Unknown client: ${id}`, "VALIDATION_ERROR", [
					"Run `lumen client list` to see saved clients",
				]);
			}
			return {
				client: {
					id: profile.id,
					birth: profile.birth,
					options: profile.options,
					updatedAt: profile.updatedAt,
				},
			};
		}
		case "remove": {
			assertNoFlags(rest, "lumen client remove");
			const id = rest[0];
			if (id === undefined) {
				throw new AxiError(
					"client remove requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen client remove <id>`"],
				);
			}
			const removed = store(context).remove(id);
			return {
				client: id,
				status: removed ? "removed" : "already absent (no-op)",
			};
		}
		default:
			throw new AxiError(`Unknown client command: ${sub}`, "VALIDATION_ERROR", [
				"Run `lumen client --help` for valid subcommands",
			]);
	}
};
