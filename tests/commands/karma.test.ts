import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliContext } from "../../src/commands/intake";
import { karmaCommand } from "../../src/commands/karma";
import { ProfileStore } from "../../src/storage/profile-store";

describe("karmaCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-karma-test-"));
		const profiles = new ProfileStore(join(dir, "lumen.db"));
		return {
			context: { profiles },
			cleanup: () => rmSync(dir, { recursive: true, force: true }),
		};
	};

	it("returns usage on --help", async () => {
		const { context, cleanup } = setupContext();
		try {
			const usage = await karmaCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen karma pair");
		} finally {
			cleanup();
		}
	});

	it("computes evolutionary synastry between two clients", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("a", {
				jdUt: 2444630.7430555555,
				lat: 9.24,
				lon: -74.75,
				local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
				zone: "America/Bogota",
				offsetMinutes: -300,
				dst: false,
				status: "ok",
			});

			context.profiles.add("b", {
				jdUt: 2446000.5,
				lat: 40.71,
				lon: -74.0,
				local: { year: 1984, month: 10, day: 27, hour: 12, minute: 0 },
				zone: "America/New_York",
				offsetMinutes: -240,
				dst: false,
				status: "ok",
			});

			const result = (await karmaCommand(
				["pair", "--a", "a", "--b", "b", "--orb", "4"],
				context,
			)) as Record<string, unknown>;

			expect(result.karma).toBeDefined();
			expect(result.contacts).toBeDefined();
			expect(result.nodalOverlays).toBeDefined();
		} finally {
			cleanup();
		}
	});
});
