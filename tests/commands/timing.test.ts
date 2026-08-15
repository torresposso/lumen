import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import type { CliContext } from "../../src/cli/context";
import { ProfileStore } from "../../src/cli/profile-store";
import { profileCommand } from "../../src/commands/profile";
import { timingCommand } from "../../src/commands/timing";

const STORE_FILE = "/tmp/lumen-timing-command-test.json";

function context(): CliContext {
	return { profiles: new ProfileStore(STORE_FILE) };
}

afterEach(() => {
	rmSync(STORE_FILE, { force: true });
	rmSync(`${STORE_FILE}.tmp`, { force: true });
});

describe("timingCommand", () => {
	test("computes secondary progressions for a saved profile", async () => {
		const ctx = context();
		await profileCommand(
			[
				"add",
				"erik",
				"--year",
				"1990",
				"--month",
				"6",
				"--day",
				"10",
				"--hour",
				"14",
				"--minute",
				"30",
				"--lat",
				"27.95",
				"--lon",
				"-82.46",
			],
			ctx,
		);

		const output = (await timingCommand(
			["progressed", "--profile", "erik", "--date", "2026-08-13"],
			ctx,
		)) as {
			progressed: Array<{ body: string; lon: number }>;
		};

		expect(output.progressed.map((row) => row.body)).toEqual([
			"moon",
			"sun",
			"pluto",
		]);
		for (const row of output.progressed) {
			expect(row.lon).toBeGreaterThanOrEqual(0);
			expect(row.lon).toBeLessThan(360);
		}
	});

	test("rejects progressed without --date", async () => {
		await expect(
			timingCommand(["progressed", "--profile", "erik"], context()),
		).rejects.toThrow(/--date is required/);
	});
});
