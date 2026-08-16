import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classicalCommand } from "../../src/commands/classical";
import type { CliContext } from "../../src/commands/client";
import { ProfileStore } from "../../src/storage/client-store";
import { ConsultationStore } from "../../src/storage/consultation-store";

describe("classicalCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-classical-test-"));
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
			const usage = await classicalCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen classical");
		} finally {
			cleanup();
		}
	});

	it("computes classical chart and draconic subcommands", async () => {
		const { context, cleanup } = setupContext();
		try {
			const chartRes = (await classicalCommand(
				[
					"chart",
					"--when",
					"1981-01-26T00:50",
					"--lat",
					"9.24",
					"--lon",
					"-74.75",
					"--zone",
					"America/Bogota",
				],
				context,
			)) as { chart: { bodies: Record<string, unknown> } };
			expect(chartRes.chart.bodies).toBeDefined();

			const draconicRes = (await classicalCommand(
				[
					"draconic",
					"--when",
					"1981-01-26T00:50",
					"--lat",
					"9.24",
					"--lon",
					"-74.75",
					"--zone",
					"America/Bogota",
				],
				context,
			)) as { chart: { draconic: Record<string, unknown> } };
			expect(draconicRes.chart.draconic).toBeDefined();
		} finally {
			cleanup();
		}
	});
});
