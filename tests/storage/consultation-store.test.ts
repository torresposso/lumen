import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { Hypothesis } from "../../src/core/types";
import { ConsultationStore } from "../../src/storage/consultation-store";

describe("ConsultationStore", () => {
	let tempFile: string;
	let store: ConsultationStore;

	beforeEach(() => {
		tempFile = join(
			tmpdir(),
			`lumen-test-consultations-${Math.random().toString(36).slice(2)}.json`,
		);
		store = new ConsultationStore(tempFile);
	});

	afterEach(() => {
		if (existsSync(tempFile)) {
			rmSync(tempFile, { force: true });
		}
	});

	it("opens a new session for a client", () => {
		const session = store.open(
			"silvia",
			"Exploración vocacional y ciclo nodal",
		);
		expect(session.clientId).toBe("silvia");
		expect(session.status).toBe("open");
		expect(session.motivo).toBe("Exploración vocacional y ciclo nodal");
		expect(session.hipotesis).toEqual([]);
		expect(typeof session.openedAt).toBe("string");
	});

	it("opening an already open session is an idempotent no-op", () => {
		const session1 = store.open("silvia", "Motivo inicial");
		const session2 = store.open("silvia");
		expect(session1.id).toBe(session2.id);
		expect(session2.status).toBe("open");
		expect(session2.motivo).toBe("Motivo inicial");
	});

	it("prepares hypotheses and preserves confirmed answers upon re-preparation", () => {
		store.open("silvia");
		const initialHypotheses: Hypothesis[] = [
			{
				id: "H1",
				campo: "pluton_nodo_sur",
				pregunta: "¿Patrones de repetición?",
				respuestasValidas: ["reliving", "fruition", "dual"],
			},
			{
				id: "H2",
				campo: "skipped_step_mars",
				pregunta: "¿Cómo se canaliza el deseo?",
				respuestasValidas: ["activo", "en_proceso", "integrado"],
			},
		];

		const prepared = store.prepareHypotheses("silvia", initialHypotheses);
		expect(prepared.hipotesis).toHaveLength(2);

		// Confirm H1
		store.recordHypothesis(
			"silvia",
			"H1",
			"reliving",
			"Patrón recurrente observado",
		);

		// Re-prepare with updated questions
		const updated = store.prepareHypotheses("silvia", [
			{
				id: "H1",
				campo: "pluton_nodo_sur",
				pregunta: "¿Patrones de repetición revisados?",
				respuestasValidas: ["reliving", "fruition", "dual"],
			},
			{
				id: "H3",
				campo: "nodo_norte_regente",
				pregunta: "¿Nueva dirección?",
				respuestasValidas: ["si", "no"],
			},
		]);

		const h1 = updated.hipotesis.find((h) => h.id === "H1");
		expect(h1?.respuestaRegistrada).toBe("reliving");
		expect(h1?.nota).toBe("Patrón recurrente observado");
		expect(updated.hipotesis.find((h) => h.id === "H3")).toBeDefined();
	});

	it("records hypothesis answer with validation on valid choices", () => {
		store.open("silvia");
		store.prepareHypotheses("silvia", [
			{
				id: "H1",
				campo: "pluton_nodo_sur",
				pregunta: "¿Patrones de repetición?",
				respuestasValidas: ["reliving", "fruition", "dual"],
			},
		]);

		const confirmed = store.recordHypothesis(
			"silvia",
			"H1",
			"fruition",
			"Cosecha y maestría",
		);
		expect(confirmed.respuestaRegistrada).toBe("fruition");
		expect(confirmed.nota).toBe("Cosecha y maestría");
		expect(typeof confirmed.confirmedAt).toBe("string");

		// Invalid answer throws AxiError with valid suggestions
		expect(() =>
			store.recordHypothesis("silvia", "H1", "invalid_enum"),
		).toThrow(AxiError);

		// Unknown hypothesis ID throws AxiError
		expect(() =>
			store.recordHypothesis("silvia", "UNKNOWN", "fruition"),
		).toThrow(AxiError);
	});

	it("closes an active session and is idempotent when closing again", () => {
		store.open("silvia");
		const closed = store.close("silvia", {
			sintesis: "Síntesis del viaje evolutivo",
			tarea: "Registrar sueños y actos de voluntad",
		});

		expect(closed.status).toBe("closed");
		expect(closed.sintesis).toBe("Síntesis del viaje evolutivo");
		expect(closed.tarea).toBe("Registrar sueños y actos de voluntad");
		expect(typeof closed.closedAt).toBe("string");

		// Closing again is idempotent
		const closedAgain = store.close("silvia");
		expect(closedAgain.status).toBe("closed");
	});

	it("lists sessions and handles removal", () => {
		store.open("silvia");
		store.open("marcos");

		const list = store.list();
		expect(list).toHaveLength(2);
		expect(list.map((s) => s.clientId).sort()).toEqual(["marcos", "silvia"]);

		const removed = store.remove("silvia");
		expect(removed).toBe(true);
		expect(store.get("silvia")).toBeUndefined();
	});
});
