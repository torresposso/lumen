import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliContext } from "../../src/commands/client";
import { consultaCommand } from "../../src/commands/consulta";
import { ProfileStore } from "../../src/storage/client-store";
import { ConsultationStore } from "../../src/storage/consultation-store";

describe("consultaCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-consulta-test-"));
		const profiles = new ProfileStore(join(dir, "profiles.json"));
		const consultations = new ConsultationStore(
			join(dir, "consultations.json"),
		);
		return {
			context: { profiles, consultations },
			cleanup: () => rmSync(dir, { recursive: true, force: true }),
		};
	};

	it("returns usage on --help", async () => {
		const { context, cleanup } = setupContext();
		try {
			const usage = await consultaCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen consulta");
		} finally {
			cleanup();
		}
	});

	it("rejects invalid leer layers with VALIDATION_ERROR", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("silvia", {
				birth: {
					jdUt: 2444630.7430555555,
					lat: 9.24,
					lon: -74.75,
					local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
					zone: "America/Bogota",
					offsetMinutes: -300,
					dst: false,
					status: "ok",
				},
				options: {
					houseSystem: "placidus",
					zodiac: "tropical",
					node: "true",
					bodies: [],
					topocentric: false,
					draconic: false,
					eclipses: false,
					lots: false,
					stars: false,
					evolutionary: true,
				},
			});
			await consultaCommand(["abrir", "silvia"], context);
			await expect(
				consultaCommand(["leer", "silvia", "--capa", "basura"], context),
			).rejects.toThrow(/Invalid layer: basura/);
		} finally {
			cleanup();
		}
	});

	it("runs the full clinical consultation lifecycle (abrir -> preparar -> leer -> confirmar -> cerrar)", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("silvia", {
				birth: {
					jdUt: 2444630.7430555555,
					lat: 9.24,
					lon: -74.75,
					local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
					zone: "America/Bogota",
					offsetMinutes: -300,
					dst: false,
					status: "ok",
				},
				options: {
					houseSystem: "placidus",
					zodiac: "tropical",
					node: "true",
					bodies: [],
					topocentric: false,
					draconic: false,
					eclipses: false,
					lots: false,
					stars: false,
					evolutionary: true,
				},
			});

			// 1. Abrir
			const opened = (await consultaCommand(
				["abrir", "silvia", "--motivo", "Reorientación vocacional"],
				context,
			)) as Record<string, unknown>;
			expect(opened.consulta).toBeDefined();

			// 2. Preparar
			const prep = (await consultaCommand(
				["preparar", "silvia"],
				context,
			)) as Record<string, unknown>;
			expect(prep.hipotesis).toBeDefined();

			// 3. Confirmar H1
			const confirmed = (await consultaCommand(
				[
					"confirmar",
					"silvia",
					"--hipotesis",
					"H1",
					"--respuesta",
					"reliving",
					"--nota",
					"Refiere patrones de subordinación previa",
				],
				context,
			)) as Record<string, unknown>;
			expect(confirmed.consulta).toBeDefined();

			// 4. Leer
			const read = (await consultaCommand(
				["leer", "silvia"],
				context,
			)) as Record<string, unknown>;
			expect(read.consulta).toBeDefined();
			expect(read.hipotesis).toBeDefined();

			// 5. Cerrar
			const closed = (await consultaCommand(
				[
					"cerrar",
					"silvia",
					"--sintesis",
					"Integración Plutón-SN lograda",
					"--tarea",
					"Diario de límites",
				],
				context,
			)) as Record<string, unknown>;
			expect(closed.consulta).toBeDefined();
		} finally {
			cleanup();
		}
	});
});
