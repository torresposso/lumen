import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import type { CliContext } from "../../src/cli/context";
import { ProfileStore } from "../../src/cli/profile-store";
import { chartCommand } from "../../src/commands/chart";
import { profileCommand } from "../../src/commands/profile";

const STORE_FILE = "/tmp/lumen-profile-command-test.json";
const TAMPA_ARGS = [
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
];

function context(): CliContext {
	return { profiles: new ProfileStore(STORE_FILE) };
}

afterEach(() => {
	rmSync(STORE_FILE, { force: true });
	rmSync(`${STORE_FILE}.tmp`, { force: true });
});

describe("profileCommand", () => {
	test("adds, lists, shows, and removes profiles idempotently", async () => {
		const ctx = context();

		await profileCommand(["add", "erik", ...TAMPA_ARGS], ctx);
		const listed = (await profileCommand(["list"], ctx)) as {
			profiles: Array<{ id: string; born: string }>;
		};
		expect(listed.profiles).toEqual([{ id: "erik", born: "1990-06-10" }]);

		const shown = (await profileCommand(["show", "erik"], ctx)) as {
			profile: { id: string; birth: { zone: string } };
		};
		expect(shown.profile.id).toBe("erik");
		expect(shown.profile.birth.zone).toBe("America/New_York");

		const removed = (await profileCommand(["remove", "erik"], ctx)) as {
			status: string;
		};
		expect(removed.status).toBe("removed");

		const noop = (await profileCommand(["remove", "erik"], ctx)) as {
			status: string;
		};
		expect(noop.status).toBe("already absent (no-op)");
	});

	test("returns focused help for profile subcommands", async () => {
		const listHelp = (await profileCommand(
			["list", "--help"],
			undefined,
		)) as string;
		const addHelp = (await profileCommand(
			["add", "--help"],
			undefined,
		)) as string;
		expect(listHelp).toContain("lumen profile list");
		expect(listHelp).not.toContain("lumen profile show");
		expect(addHelp).toContain("--evolutionary");
	});

	test("rejects missing profile ids with validation errors", async () => {
		await expect(
			profileCommand(["show", "missing"], context()),
		).rejects.toThrow(/Unknown profile/);
		await expect(profileCommand(["add"], context())).rejects.toThrow(
			/profile add requires a profile id/,
		);
	});

	test("chart --profile reuses a saved profile", async () => {
		const ctx = context();
		await profileCommand(["add", "erik", ...TAMPA_ARGS], ctx);

		const reading = (await chartCommand(["--profile", "erik"], ctx)) as {
			chart: {
				birth: { zone: string };
				evolutionary: { pluto: { sign: string } };
			};
		};

		expect(reading.chart.birth.zone).toBe("America/New_York");
		expect(reading.chart.evolutionary.pluto.sign).toBeDefined();
	});
});
