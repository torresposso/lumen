import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { chartCommand } from "../../src/commands/chart";
import type { CliContext } from "../../src/commands/intake";
import { profileCommand } from "../../src/commands/profile";
import { ConsultationStore } from "../../src/storage/consultation-store";
import { ProfileStore } from "../../src/storage/profile-store";

const DB_FILE = "/tmp/lumen-profile-command-test.db";
const CONSULTATIONS_FILE = "/tmp/lumen-profile-command-consultations-test.json";
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
		consultations: new ConsultationStore(CONSULTATIONS_FILE),
	};
}

afterEach(() => {
	rmSync(DB_FILE, { force: true });
	rmSync(`${DB_FILE}-journal`, { force: true });
	rmSync(`${DB_FILE}-wal`, { force: true });
	rmSync(`${DB_FILE}-shm`, { force: true });
	rmSync(CONSULTATIONS_FILE, { force: true });
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
				session: string;
			}>;
		};
		expect(listed.profiles).toEqual([
			{ id: "erik", provenance: "ok", session: "none" },
		]);

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
				["add", "erik", ...TAMPA_ARGS, "--node", "mean"],
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
});
