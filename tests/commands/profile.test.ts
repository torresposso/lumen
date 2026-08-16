import { afterEach, describe, expect, test } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { chartCommand } from "../../src/commands/chart";
import type { CliContext } from "../../src/commands/intake";
import { profileCommand } from "../../src/commands/profile";
import { soulCommand } from "../../src/commands/soul";
import { ConfigStore } from "../../src/storage/config";
import { ProfileStore } from "../../src/storage/profile-store";

const DB_FILE = "/tmp/lumen-profile-command-test.db";
const CONFIG_FILE = "/tmp/lumen-profile-command-config.json";
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
	return {
		profiles: new ProfileStore(DB_FILE),
	};
}

afterEach(() => {
	rmSync(DB_FILE, { force: true });
	rmSync(`${DB_FILE}-journal`, { force: true });
	rmSync(`${DB_FILE}-wal`, { force: true });
	rmSync(`${DB_FILE}-shm`, { force: true });
	rmSync(CONFIG_FILE, { force: true });
});

describe("profileCommand", () => {
	test("adds, lists, shows, and removes profiles idempotently", async () => {
		const ctx = context();

		const added = (await profileCommand(
			["add", "erik", ...TAMPA_ARGS],
			ctx,
		)) as {
			profile: string;
			status: string;
		};
		expect(added.profile).toBe("erik");
		expect(added.status).toBe("saved");

		const listed = (await profileCommand(["list"], ctx)) as {
			profiles: Array<{
				id: string;
				provenance: string;
			}>;
		};
		expect(listed.profiles).toEqual([{ id: "erik", provenance: "ok" }]);

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

	test("lists zero profiles with a hint", async () => {
		const listed = (await profileCommand(["list"], context())) as {
			profiles: string;
			help: string[];
		};
		expect(listed.profiles).toBe("0 profiles found");
		expect(listed.help[0]).toContain("lumen profile add");
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
		expect(addHelp).not.toContain("--evolutionary");
		expect(addHelp).not.toContain("--draconic");
	});

	test("rejects missing profile ids with validation errors", async () => {
		await expect(
			profileCommand(["show", "missing"], context()),
		).rejects.toThrow(/Unknown profile/);
		await expect(profileCommand(["add"], context())).rejects.toThrow(
			/profile add requires a profile id/,
		);
	});

	test("rejects chart option flags on add (options live in config/flags)", async () => {
		await expect(
			profileCommand(
				["add", "erik", ...TAMPA_ARGS, "--house-system", "equal"],
				context(),
			),
		).rejects.toThrow(/not stored on profiles/);
	});

	test("chart natal accepts a positioned saved profile", async () => {
		const ctx = context();
		await profileCommand(["add", "erik", ...TAMPA_ARGS], ctx);

		const reading = (await chartCommand(["natal", "erik"], ctx)) as {
			chart: { birth: { zone: string } };
		};

		expect(reading.chart.birth.zone).toBe("America/New_York");
	});

	test("soul uses the config house system when no flag is passed", async () => {
		const ctx = context();
		ctx.config = new ConfigStore(CONFIG_FILE);
		await profileCommand(
			[
				"add",
				"silvia",
				"--year",
				"1981",
				"--month",
				"1",
				"--day",
				"26",
				"--hour",
				"0",
				"--minute",
				"50",
				"--lat",
				"9.15",
				"--lon",
				"-74.75",
			],
			ctx,
		);

		writeFileSync(CONFIG_FILE, JSON.stringify({ houseSystem: "whole_sign" }));
		const fromConfig = (await soulCommand(["silvia"], ctx)) as {
			soul: { southNode: string };
		};

		rmSync(CONFIG_FILE, { force: true });
		const fromDefaults = (await soulCommand(["silvia"], ctx)) as {
			soul: { southNode: string };
		};

		expect(fromConfig.soul.southNode).toBe("Aquarius/H4");
		expect(fromDefaults.soul.southNode).toBe("Aquarius/H3");
	});
});
