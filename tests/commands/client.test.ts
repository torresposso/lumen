import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliContext } from "../../src/commands/client";
import { clientCommand } from "../../src/commands/client";
import { ProfileStore } from "../../src/storage/client-store";
import { ConsultationStore } from "../../src/storage/consultation-store";

describe("clientCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-client-test-"));
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
			const usage = await clientCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen client");
		} finally {
			cleanup();
		}
	});

	it("adds, lists, shows, and removes client profiles", async () => {
		const { context, cleanup } = setupContext();
		try {
			const addRes = (await clientCommand(
				[
					"add",
					"lucia",
					"--when",
					"1990-05-15T14:30",
					"--lat",
					"4.60",
					"--lon",
					"-74.08",
					"--zone",
					"America/Bogota",
				],
				context,
			)) as Record<string, unknown>;
			expect(addRes.client).toBe("lucia");
			expect(addRes.status).toBe("saved");

			const listRes = (await clientCommand(["list"], context)) as {
				clients: Array<Record<string, unknown>>;
			};
			expect(listRes.clients).toBeDefined();
			for (const client of listRes.clients) {
				expect(client.id).toBeDefined();
				expect(client.provenance).toBeDefined();
				expect(client.session).toBeDefined();
				expect(client.born).toBeUndefined();
			}

			const showRes = (await clientCommand(
				["show", "lucia"],
				context,
			)) as Record<string, unknown>;
			expect(showRes.client).toBeDefined();

			const removeRes = (await clientCommand(
				["remove", "lucia"],
				context,
			)) as Record<string, unknown>;
			expect(removeRes.status).toBe("removed");
		} finally {
			cleanup();
		}
	});
});
