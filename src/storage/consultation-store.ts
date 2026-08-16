import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";
import { z } from "zod";
import type {
	ConsultationSession,
	ConsultationStatus,
	Hypothesis,
} from "../core/types";

export type { ConsultationSession, ConsultationStatus, Hypothesis };

export interface ConsultationSummary {
	id: string;
	clientId: string;
	status: ConsultationStatus;
	openedAt: string;
	closedAt?: string;
	hypothesisCount: number;
	confirmedCount: number;
}

interface ConsultationsFile {
	version: 1;
	sessions: Record<string, ConsultationSession>;
}

export function defaultConsultationsDir(): string {
	return (
		process.env.LUMEN_CONSULTATIONS_DIR ??
		process.env.LUMEN_PROFILES_DIR ??
		join(homedir(), ".config", "lumen")
	);
}

export function defaultConsultationsFile(): string {
	return join(defaultConsultationsDir(), "consultations.json");
}

function emptyFile(): ConsultationsFile {
	return { version: 1, sessions: {} };
}

const hypothesisSchema = z.object({
	id: z.string(),
	campo: z.string(),
	pregunta: z.string(),
	respuestasValidas: z.array(z.string()),
	respuestaRegistrada: z.string().optional(),
	nota: z.string().optional(),
	confirmedAt: z.string().optional(),
});

const sessionSchema = z.object({
	id: z.string(),
	clientId: z.string(),
	status: z.enum(["open", "closed"]),
	openedAt: z.string(),
	closedAt: z.string().optional(),
	motivo: z.string().optional(),
	hipotesis: z.array(hypothesisSchema),
	notas: z.array(z.string()),
	sintesis: z.string().optional(),
	tarea: z.string().optional(),
});

const fileSchema = z.object({
	version: z.literal(1),
	sessions: z.record(z.string(), sessionSchema),
});

function parseFile(contents: string): ConsultationsFile {
	const parsed: unknown = JSON.parse(contents);
	const result = fileSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error("unsupported consultations file format");
	}
	return result.data as ConsultationsFile;
}

function readFile(filePath: string): ConsultationsFile {
	if (!existsSync(filePath)) return emptyFile();
	try {
		const file = parseFile(readFileSync(filePath, "utf8"));
		try {
			chmodSync(filePath, 0o600);
		} catch {
			// Read-only filesystems
		}
		return file;
	} catch (err) {
		throw new AxiError(
			`Could not read consultation store: ${err instanceof Error ? err.message : String(err)}`,
			"CONSULTATION_ERROR",
			[`Move or remove ${filePath} and run \`lumen consulta list\` again`],
		);
	}
}

function writeFile(filePath: string, data: ConsultationsFile): void {
	const dir = dirname(filePath);
	const tmp = `${filePath}.tmp`;
	try {
		mkdirSync(dir, { recursive: true, mode: 0o700 });
		writeFileSync(tmp, `${JSON.stringify(data, null, "\t")}\n`, {
			mode: 0o600,
		});
		renameSync(tmp, filePath);
	} catch (err) {
		throw new AxiError(
			`Could not write consultation store: ${err instanceof Error ? err.message : String(err)}`,
			"CONSULTATION_ERROR",
			["Check that the directory is writable"],
		);
	}
}

/**
 * Persistencia segura y atómica de expedientes clínicos y diálogo de consulta.
 * Cumple con XDG (~/.config/lumen/consultations.json), permisos 0600 y garantías de idempotencia.
 */
export class ConsultationStore {
	constructor(
		private readonly filePath: string = defaultConsultationsFile(),
		private readonly now: () => Date = () => new Date(),
	) {}

	list(): ConsultationSummary[] {
		const file = readFile(this.filePath);
		return Object.values(file.sessions)
			.map((s) => ({
				id: s.id,
				clientId: s.clientId,
				status: s.status,
				openedAt: s.openedAt,
				closedAt: s.closedAt,
				hypothesisCount: s.hipotesis.length,
				confirmedCount: s.hipotesis.filter(
					(h) => h.respuestaRegistrada !== undefined,
				).length,
			}))
			.sort((a, b) => a.clientId.localeCompare(b.clientId));
	}

	get(clientId: string): ConsultationSession | undefined {
		const file = readFile(this.filePath);
		return file.sessions[clientId];
	}

	open(clientId: string, motivo?: string): ConsultationSession {
		const file = readFile(this.filePath);
		const existing = file.sessions[clientId];

		if (existing && existing.status === "open") {
			if (motivo !== undefined && motivo !== existing.motivo) {
				existing.motivo = motivo;
				writeFile(this.filePath, file);
			}
			return existing;
		}

		const nowIso = this.now().toISOString();
		const session: ConsultationSession = {
			id: `sess_${clientId}_${Date.now()}`,
			clientId,
			status: "open",
			openedAt: nowIso,
			motivo,
			hipotesis: existing?.hipotesis ?? [],
			notas: existing?.notas ?? [],
		};

		file.sessions[clientId] = session;
		writeFile(this.filePath, file);
		return session;
	}

	prepareHypotheses(
		clientId: string,
		hypotheses: Hypothesis[],
	): ConsultationSession {
		const file = readFile(this.filePath);
		let session = file.sessions[clientId];

		if (!session) {
			session = this.open(clientId);
		}

		const existingMap = new Map(session.hipotesis.map((h) => [h.id, h]));

		session.hipotesis = hypotheses.map((incoming) => {
			const prev = existingMap.get(incoming.id);
			if (!prev) return incoming;
			return {
				...incoming,
				respuestaRegistrada:
					prev.respuestaRegistrada ?? incoming.respuestaRegistrada,
				nota: prev.nota ?? incoming.nota,
				confirmedAt: prev.confirmedAt ?? incoming.confirmedAt,
			};
		});

		file.sessions[clientId] = session;
		writeFile(this.filePath, file);
		return session;
	}

	recordHypothesis(
		clientId: string,
		hypothesisId: string,
		respuesta: string,
		nota?: string,
	): Hypothesis {
		const file = readFile(this.filePath);
		const session = file.sessions[clientId];

		if (session?.status !== "open") {
			throw new AxiError(
				`No active open consultation session for client "${clientId}"`,
				"CONSULTATION_ERROR",
				[`Run \`lumen consulta abrir ${clientId}\` to start an active session`],
			);
		}

		const target = session.hipotesis.find((h) => h.id === hypothesisId);
		if (!target) {
			const validIds = session.hipotesis.map((h) => h.id).join(", ");
			throw new AxiError(
				`Hypothesis "${hypothesisId}" not found for client "${clientId}"`,
				"VALIDATION_ERROR",
				[
					validIds
						? `Valid hypothesis IDs: ${validIds}`
						: `Run \`lumen consulta preparar ${clientId}\` first`,
				],
			);
		}

		if (
			target.respuestasValidas.length > 0 &&
			!target.respuestasValidas.includes(respuesta)
		) {
			throw new AxiError(
				`Invalid response "${respuesta}" for hypothesis "${hypothesisId}"`,
				"VALIDATION_ERROR",
				[`Valid responses: ${target.respuestasValidas.join(" | ")}`],
			);
		}

		target.respuestaRegistrada = respuesta;
		if (nota !== undefined) {
			target.nota = nota;
		}
		target.confirmedAt = this.now().toISOString();

		file.sessions[clientId] = session;
		writeFile(this.filePath, file);
		return target;
	}

	addNote(clientId: string, nota: string): ConsultationSession {
		const file = readFile(this.filePath);
		const session = file.sessions[clientId];

		if (session?.status !== "open") {
			throw new AxiError(
				`No active consultation session for client "${clientId}"`,
				"CONSULTATION_ERROR",
				[`Run \`lumen consulta abrir ${clientId}\` to open a session`],
			);
		}

		session.notas.push(nota);
		writeFile(this.filePath, file);
		return session;
	}

	close(
		clientId: string,
		params?: { sintesis?: string; tarea?: string },
	): ConsultationSession {
		const file = readFile(this.filePath);
		const session = file.sessions[clientId];

		if (!session) {
			throw new AxiError(
				`No consultation session found for client "${clientId}"`,
				"NOT_FOUND",
				[`Run \`lumen consulta abrir ${clientId}\` first`],
			);
		}

		if (session.status === "closed") {
			if (params?.sintesis) session.sintesis = params.sintesis;
			if (params?.tarea) session.tarea = params.tarea;
			writeFile(this.filePath, file);
			return session;
		}

		session.status = "closed";
		session.closedAt = this.now().toISOString();
		if (params?.sintesis) session.sintesis = params.sintesis;
		if (params?.tarea) session.tarea = params.tarea;

		writeFile(this.filePath, file);
		return session;
	}

	remove(clientId: string): boolean {
		const file = readFile(this.filePath);
		if (file.sessions[clientId] === undefined) return false;
		delete file.sessions[clientId];
		writeFile(this.filePath, file);
		return true;
	}
}
