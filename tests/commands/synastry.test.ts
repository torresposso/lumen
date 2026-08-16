import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { synastryCommand } from "../../src/commands/classical";
import type { CliContext } from "../../src/commands/client";
import { profileCommand } from "../../src/commands/client";
import { ProfileStore } from "../../src/storage/client-store";
import { ConsultationStore } from "../../src/storage/consultation-store";

const STORE_FILE = "/tmp/lumen-synastry-command-test.json";

function context(): CliContext {
	return {
		profiles: new ProfileStore(STORE_FILE),
		consultations: new ConsultationStore(
			"/tmp/lumen-synastry-command-consultations-test.json",
		),
	};
}

afterEach(() => {
	rmSync(STORE_FILE, { force: true });
	rmSync(`${STORE_FILE}.tmp`, { force: true });
	rmSync("/tmp/lumen-synastry-command-consultations-test.json", {
		force: true,
	});
});

describe("synastryCommand", () => {
	test("compares a natal chart with its draconic projection", async () => {
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

		const output = (await synastryCommand(
			["self", "--profile", "erik"],
			ctx,
		)) as {
			synastry: {
				pair: string;
				summary: { contacts: number; evolutionary: number };
				contacts: Array<{ a: string; b: string; aspect: string; orb: number }>;
			};
		};

		expect(output.synastry.pair).toBe("natal × draconic");
		expect(output.synastry.summary.contacts).toBeGreaterThan(0);
		expect(Array.isArray(output.synastry.contacts)).toBe(true);
	});

	test("compares two saved profiles", async () => {
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
		await profileCommand(
			[
				"add",
				"kary",
				"--year",
				"1987",
				"--month",
				"3",
				"--day",
				"14",
				"--hour",
				"6",
				"--minute",
				"10",
				"--lat",
				"4.711",
				"--lon",
				"-74.072",
			],
			ctx,
		);

		const output = (await synastryCommand(
			["pair", "--a", "erik", "--b", "kary"],
			ctx,
		)) as {
			synastry: { pair: string; summary: { contacts: number } };
		};

		expect(output.synastry.pair).toBe("erik × kary");
		expect(output.synastry.summary.contacts).toBeGreaterThan(0);
	});

	test("rejects pair without both profiles", async () => {
		await expect(
			synastryCommand(["pair", "--a", "erik"], context()),
		).rejects.toThrow(/--b/);
	});

	test("rejects unknown focus values", async () => {
		await expect(
			synastryCommand(["self", "--focus", "romantico"], context()),
		).rejects.toThrow(/Invalid focus/);
	});

	test("returns focused help for self and pair", async () => {
		const selfHelp = await synastryCommand(["self", "--help"], undefined);
		const pairHelp = await synastryCommand(["pair", "--help"], undefined);
		expect(typeof selfHelp).toBe("string");
		expect((selfHelp as string).startsWith("lumen synastry self")).toBe(true);
		expect((pairHelp as string).startsWith("lumen synastry pair")).toBe(true);
	});

	test("rejects duplicate synastry flags", async () => {
		await expect(
			synastryCommand(["self", "--orb", "3", "--orb", "4"], context()),
		).rejects.toThrow(/--orb was provided more than once/);
		await expect(
			synastryCommand(
				["pair", "--a", "erik", "--a", "kary", "--b", "erik"],
				context(),
			),
		).rejects.toThrow(/--a was provided more than once/);
	});
});
