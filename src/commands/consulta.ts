import type { AxiCliCommand } from "axi-sdk-js";
import { AxiError } from "axi-sdk-js";
import { CaelusEphemeris } from "../adapters/ephemeris-gateway";
import { computeNodalReading } from "../core/nodes";
import { computeSoulReading } from "../core/soul";
import type { Hypothesis, HypothesisResponseEnum } from "../core/types";
import { ConsultationStore } from "../storage/consultation-store";
import type { CliContext } from "./client";
import { requestFromProfile } from "./client";

export const consultaUsage = [
	"lumen consulta abrir <client> [--motivo <text>]",
	"lumen consulta preparar <client>",
	"lumen consulta leer <client> [--capa evidencia|arquetipo|preguntas]",
	"lumen consulta confirmar <client> --hipotesis <ID> --respuesta <enum> [--nota <text>]",
	"lumen consulta cerrar <client> [--sintesis <text>] [--tarea <text>]",
	"",
	"Gestión del ciclo de consulta clínica, hipótesis JWG y diálogo confidencial.",
].join("\n");

function store(context: CliContext | undefined): ConsultationStore {
	return context?.consultations ?? new ConsultationStore();
}

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

function buildDefaultHypotheses(
	clientId: string,
	context: CliContext | undefined,
): Hypothesis[] {
	const request = requestFromProfile(context, clientId);
	const ephemeris = new CaelusEphemeris();
	const natal = ephemeris.chartAt(
		request.birth.jdUt,
		request.birth.lat,
		request.birth.lon,
		{ houseSystem: request.options.houseSystem },
	);
	const bodies = natal.bodies;
	const cusps = natal.cusps;

	const nn = bodies.true_node ?? bodies.mean_node;
	const _soulReading = computeSoulReading(bodies, cusps, nn?.lon);
	const nodalReading = computeNodalReading(bodies, cusps);

	const hypotheses: Hypothesis[] = [
		{
			id: "H1",
			campo: "pluton_nodo_sur",
			pregunta:
				"¿El consultante describe patrones de repetición o de cosecha en esta temática?",
			respuestasValidas: ["reliving", "fruition", "dual"],
		},
	];

	if (nodalReading && nodalReading.skippedSteps.length > 0) {
		nodalReading.skippedSteps.forEach((step, idx) => {
			hypotheses.push({
				id: `H${idx + 2}`,
				campo: `skipped_step_${step.body}`,
				pregunta: `¿Cómo se canaliza la función de ${step.body} según el relato del consultante?`,
				respuestasValidas: ["activo", "en_proceso", "integrado"],
			});
		});
	} else {
		hypotheses.push({
			id: "H2",
			campo: "integracion_eje_nodal",
			pregunta:
				"¿Hacia qué polo del eje nodal se orienta actualmente la voluntad del consultante?",
			respuestasValidas: ["polo_sur", "en_transicion", "polo_norte"],
		});
	}

	return hypotheses;
}

export const consultaCommand: AxiCliCommand<CliContext> = async (
	args,
	context,
) => {
	const [sub, ...rest] = args;
	if (sub === undefined || sub === "--help") return consultaUsage;

	const consultationStore = store(context);

	switch (sub) {
		case "abrir": {
			let clientId: string | undefined;
			let motivo: string | undefined;

			for (let i = 0; i < rest.length; i++) {
				const arg = rest[i];
				if (arg === undefined) continue;

				if (arg === "--motivo" || arg.startsWith("--motivo=")) {
					motivo =
						arg === "--motivo"
							? takeValue(rest, i, "motivo").value
							: arg.slice("--motivo=".length);
					if (arg === "--motivo") i++;
					continue;
				}
				if (clientId === undefined && !arg.startsWith("-")) {
					clientId = arg;
					continue;
				}
				throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
					"Run `lumen consulta abrir <client> [--motivo <text>]`",
				]);
			}

			if (!clientId) {
				throw new AxiError(
					"consulta abrir requires a client id",
					"VALIDATION_ERROR",
					['Run `lumen consulta abrir <client> --motivo "..."`'],
				);
			}

			const session = consultationStore.open(clientId, motivo);
			return {
				consulta: {
					client: session.clientId,
					session: session.status,
					openedAt: session.openedAt,
					...(session.motivo ? { motivo: session.motivo } : {}),
				},
				help: [
					`Run \`lumen consulta preparar ${clientId}\` to generate clinical hypotheses`,
					`Run \`lumen soul ${clientId}\` for baseline evolutionary reading`,
				],
			};
		}

		case "preparar": {
			const clientId = rest[0];
			if (!clientId || clientId.startsWith("-")) {
				throw new AxiError(
					"consulta preparar requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen consulta preparar <client>`"],
				);
			}

			const defaultHypotheses = buildDefaultHypotheses(clientId, context);
			const session = consultationStore.prepareHypotheses(
				clientId,
				defaultHypotheses,
			);

			return {
				consulta: {
					client: session.clientId,
					session: session.status,
				},
				hipotesis: session.hipotesis.map((h) => ({
					id: h.id,
					campo: h.campo,
					pregunta: h.pregunta,
					respuestasValidas: h.respuestasValidas.join("|"),
					...(h.respuestaRegistrada
						? { respuestaRegistrada: h.respuestaRegistrada }
						: {}),
					...(h.nota ? { nota: h.nota } : {}),
				})),
				help: [
					`Run \`lumen consulta confirmar ${clientId} --hipotesis H1 --respuesta reliving\``,
					`Run \`lumen consulta leer ${clientId} --capa preguntas\` for the full dialogue guide`,
				],
			};
		}

		case "leer": {
			let clientId: string | undefined;
			let capa = "evidencia";
			const VALID_CAPAS = new Set(["evidencia", "arquetipo", "preguntas"]);

			for (let i = 0; i < rest.length; i++) {
				const arg = rest[i];
				if (arg === undefined) continue;

				if (arg === "--capa" || arg.startsWith("--capa=")) {
					capa =
						arg === "--capa"
							? takeValue(rest, i, "capa").value
							: arg.slice("--capa=".length);
					if (arg === "--capa") i++;
					if (!VALID_CAPAS.has(capa)) {
						throw new AxiError(`Invalid layer: ${capa}`, "VALIDATION_ERROR", [
							"Valid layers: evidencia | arquetipo | preguntas",
						]);
					}
					continue;
				}
				if (clientId === undefined && !arg.startsWith("-")) {
					clientId = arg;
					continue;
				}
				throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
					"Run `lumen consulta leer <client> [--capa evidencia|arquetipo|preguntas]`",
				]);
			}

			if (!clientId) {
				throw new AxiError(
					"consulta leer requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen consulta leer <client>`"],
				);
			}

			const session = consultationStore.get(clientId);
			if (!session) {
				throw new AxiError(
					`No consultation session found for client "${clientId}"`,
					"NOT_FOUND",
					[`Run \`lumen consulta abrir ${clientId}\` first`],
				);
			}

			return {
				consulta: {
					client: session.clientId,
					status: session.status,
					capa,
					motivo: session.motivo ?? "none",
					hipotesisConfirmadas: session.hipotesis.filter(
						(h) => h.respuestaRegistrada,
					).length,
					totalHipotesis: session.hipotesis.length,
				},
				hipotesis: session.hipotesis,
				notas: session.notas,
				...(session.sintesis ? { sintesis: session.sintesis } : {}),
				...(session.tarea ? { tarea: session.tarea } : {}),
			};
		}

		case "confirmar": {
			let clientId: string | undefined;
			let hipotesisId: string | undefined;
			let respuesta: string | undefined;
			let nota: string | undefined;

			for (let i = 0; i < rest.length; i++) {
				const arg = rest[i];
				if (arg === undefined) continue;

				if (arg === "--hipotesis" || arg.startsWith("--hipotesis=")) {
					hipotesisId =
						arg === "--hipotesis"
							? takeValue(rest, i, "hipotesis").value
							: arg.slice("--hipotesis=".length);
					if (arg === "--hipotesis") i++;
					continue;
				}
				if (arg === "--respuesta" || arg.startsWith("--respuesta=")) {
					respuesta =
						arg === "--respuesta"
							? takeValue(rest, i, "respuesta").value
							: arg.slice("--respuesta=".length);
					if (arg === "--respuesta") i++;
					continue;
				}
				if (arg === "--nota" || arg.startsWith("--nota=")) {
					nota =
						arg === "--nota"
							? takeValue(rest, i, "nota").value
							: arg.slice("--nota=".length);
					if (arg === "--nota") i++;
					continue;
				}
				if (clientId === undefined && !arg.startsWith("-")) {
					clientId = arg;
					continue;
				}
				throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
					"Run `lumen consulta confirmar <client> --hipotesis <ID> --respuesta <enum> [--nota <text>]`",
				]);
			}

			if (!clientId || !hipotesisId || !respuesta) {
				throw new AxiError(
					"consulta confirmar requires client, --hipotesis, and --respuesta",
					"VALIDATION_ERROR",
					[
						"Example: lumen consulta confirmar silvia --hipotesis H1 --respuesta reliving",
					],
				);
			}

			const recorded = consultationStore.recordHypothesis(
				clientId,
				hipotesisId,
				respuesta as HypothesisResponseEnum,
				nota,
			);

			return {
				consulta: {
					client: clientId,
					hipotesis: recorded.id,
					status: "confirmed",
					respuestaRegistrada: recorded.respuestaRegistrada,
					...(recorded.nota ? { nota: recorded.nota } : {}),
				},
				help: [
					`Run \`lumen consulta leer ${clientId}\` to review confirmed hypotheses`,
					`Run \`lumen consulta cerrar ${clientId} --sintesis "..."\` when finishing`,
				],
			};
		}

		case "cerrar": {
			let clientId: string | undefined;
			let sintesis: string | undefined;
			let tarea: string | undefined;

			for (let i = 0; i < rest.length; i++) {
				const arg = rest[i];
				if (arg === undefined) continue;

				if (arg === "--sintesis" || arg.startsWith("--sintesis=")) {
					sintesis =
						arg === "--sintesis"
							? takeValue(rest, i, "sintesis").value
							: arg.slice("--sintesis=".length);
					if (arg === "--sintesis") i++;
					continue;
				}
				if (arg === "--tarea" || arg.startsWith("--tarea=")) {
					tarea =
						arg === "--tarea"
							? takeValue(rest, i, "tarea").value
							: arg.slice("--tarea=".length);
					if (arg === "--tarea") i++;
					continue;
				}
				if (clientId === undefined && !arg.startsWith("-")) {
					clientId = arg;
					continue;
				}
				throw new AxiError(`Unexpected argument: ${arg}`, "VALIDATION_ERROR", [
					"Run `lumen consulta cerrar <client> [--sintesis <text>] [--tarea <text>]`",
				]);
			}

			if (!clientId) {
				throw new AxiError(
					"consulta cerrar requires a client id",
					"VALIDATION_ERROR",
					["Run `lumen consulta cerrar <client>`"],
				);
			}

			const session = consultationStore.close(clientId, { sintesis, tarea });
			return {
				consulta: {
					client: session.clientId,
					session: session.status,
					closedAt: session.closedAt,
					...(session.sintesis ? { sintesis: session.sintesis } : {}),
					...(session.tarea ? { tarea: session.tarea } : {}),
				},
			};
		}

		default:
			throw new AxiError(
				`Unknown consulta command: ${sub}`,
				"VALIDATION_ERROR",
				["Run `lumen consulta --help` for valid subcommands"],
			);
	}
};
