import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliContext } from "../../src/commands/intake";
import { journeyCommand } from "../../src/commands/journey";
import { ProfileStore } from "../../src/storage/profile-store";

describe("journeyCommand", () => {
	const setupContext = (): { context: CliContext; cleanup: () => void } => {
		const dir = mkdtempSync(join(tmpdir(), "lumen-journey-test-"));
		const profiles = new ProfileStore(join(dir, "lumen.db"));
		return {
			context: { profiles },
			cleanup: () => rmSync(dir, { recursive: true, force: true }),
		};
	};

	it("returns usage on --help", async () => {
		const { context, cleanup } = setupContext();
		try {
			const usage = await journeyCommand(["--help"], context);
			expect(typeof usage).toBe("string");
			expect(usage).toContain("lumen journey");
		} finally {
			cleanup();
		}
	});

	it("computes secondary progressions including Sol-Luna phase", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("carlos", {
				jdUt: 2444630.7430555555,
				lat: 9.24,
				lon: -74.75,
				local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
				zone: "America/Bogota",
				offsetMinutes: -300,
				dst: false,
				status: "ok",
			});

			const result = (await journeyCommand(
				["progressed", "carlos", "--at", "2026-08-13"],
				context,
			)) as Record<string, unknown>;

			expect(result.journey).toBeDefined();
			const journey = result.journey as Record<string, unknown>;
			expect(journey.kind).toBe("progressed");
			expect(journey.profile).toBe("carlos");
			expect(journey.solLunaPhase).toBeDefined();

			const progressed = result.progressed as Array<Record<string, unknown>>;
			expect(progressed.length).toBeGreaterThan(0);

			// Progressed bodies cross the chart-projection policy (ADR-0011):
			// lon/signDeg at 4 dp, like the base chart and the evo block.
			for (const row of progressed) {
				const lon = row.lon as number;
				const signDeg = row.signDeg as number;
				expect(Number(lon.toFixed(4))).toBe(lon);
				expect(Number(signDeg.toFixed(4))).toBe(signDeg);
			}
		} finally {
			cleanup();
		}
	});

	it("computes planetary stations in given window", async () => {
		const { context, cleanup } = setupContext();
		try {
			context.profiles.add("carlos", {
				jdUt: 2444630.7430555555,
				lat: 9.24,
				lon: -74.75,
				local: { year: 1981, month: 1, day: 26, hour: 0, minute: 50 },
				zone: "America/Bogota",
				offsetMinutes: -300,
				dst: false,
				status: "ok",
			});

			const result = (await journeyCommand(
				[
					"stations",
					"carlos",
					"--body",
					"mercury",
					"--from",
					"1981-03-01",
					"--to",
					"1982-03-01",
				],
				context,
			)) as Record<string, unknown>;

			expect(result.journey).toBeDefined();
			expect(result.stations).toBeDefined();
		} finally {
			cleanup();
		}
	});
});
