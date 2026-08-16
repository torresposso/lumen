import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { AxiError } from "axi-sdk-js";
import type { CliContext } from "../../src/commands/intake";
import { journeyCommand } from "../../src/commands/journey";
import { profileCommand } from "../../src/commands/profile";
import { ProfileStore } from "../../src/storage/profile-store";

const STORE_FILE = "/tmp/lumen-timing-command-test.db";

function context(): CliContext {
	return {
		profiles: new ProfileStore(STORE_FILE),
	};
}

afterEach(() => {
	rmSync(STORE_FILE, { force: true });
	rmSync(`${STORE_FILE}-journal`, { force: true });
	rmSync(`${STORE_FILE}-wal`, { force: true });
	rmSync(`${STORE_FILE}-shm`, { force: true });
});

describe("journeyCommand (progressed/stations coverage)", () => {
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

		const output = (await journeyCommand(
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
			journeyCommand(["progressed", "--profile", "erik"], context()),
		).rejects.toThrow(/Target date is required via --at or --date/);
	});

	test("includes house placements in progressed output", async () => {
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

		const output = (await journeyCommand(
			["progressed", "--profile", "erik", "--date", "2026-08-13"],
			ctx,
		)) as {
			progressed: Array<{ body: string; house: number }>;
		};

		for (const row of output.progressed) {
			expect(row.house).toBeGreaterThanOrEqual(1);
			expect(row.house).toBeLessThanOrEqual(12);
		}
	});

	test("relates progressed bodies to natal Pluto and the nodal axis", async () => {
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

		const output = (await journeyCommand(
			["progressed", "--profile", "erik", "--date", "2026-08-13"],
			ctx,
		)) as {
			progressed: Array<{
				body: string;
				evolutionaryContacts: Array<{
					target: string;
					aspect: string;
					orb: number;
				}>;
			}>;
		};

		const moon = output.progressed.find((row) => row.body === "moon");
		expect(moon?.evolutionaryContacts.length).toBeGreaterThan(0);
		expect(
			moon?.evolutionaryContacts.every((contact) => contact.orb <= 3),
		).toBe(true);
	});

	test("computes stations and reveals limit truncation", async () => {
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

		const output = (await journeyCommand(
			[
				"stations",
				"--profile",
				"erik",
				"--body",
				"mercury",
				"--years",
				"1",
				"--limit",
				"2",
			],
			ctx,
		)) as {
			stations: Array<{ jdUt: number; direction: "retrograde" | "direct" }>;
			help: string[];
		};

		expect(output.stations).toHaveLength(2);
		expect(output.help[0]).toContain("--limit 52");
	});

	test("rejects impossible calendar dates with validation errors", async () => {
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

		for (const date of ["2026-02-30", "2026-13-01", "2026-00-10"]) {
			try {
				await journeyCommand(
					["progressed", "--profile", "erik", "--date", date],
					ctx,
				);
				expect.unreachable();
			} catch (error) {
				expect(error).toBeInstanceOf(AxiError);
				expect((error as AxiError).code).toBe("VALIDATION_ERROR");
			}
		}
	});

	test("rejects progressions on or before the birth date", async () => {
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

		await expect(
			journeyCommand(
				["progressed", "--profile", "erik", "--date", "1990-06-10"],
				ctx,
			),
		).rejects.toThrow(/--date must be after the birth date/);
	});

	test("rejects unknown bodies before touching the ephemeris", async () => {
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

		try {
			await journeyCommand(
				[
					"progressed",
					"--profile",
					"erik",
					"--date",
					"2026-08-13",
					"--bodies",
					"banana",
				],
				ctx,
			);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}

		try {
			await journeyCommand(
				["stations", "--profile", "erik", "--body", "banana"],
				ctx,
			);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(AxiError);
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test("bounds station windows and requires bodies", async () => {
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

		await expect(
			journeyCommand(
				["stations", "--profile", "erik", "--body", "moon", "--years", "101"],
				ctx,
			),
		).rejects.toThrow(/no greater than 100/);

		await expect(
			journeyCommand(
				[
					"progressed",
					"--profile",
					"erik",
					"--date",
					"2026-08-13",
					"--bodies",
					"",
				],
				ctx,
			),
		).rejects.toThrow(/requires at least one body/);
	});
});
