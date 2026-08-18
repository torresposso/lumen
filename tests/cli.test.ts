import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AxiError } from "axi-sdk-js";
import { type CliContext, profileCommand } from "../src/commands/profile";
import { ProfileStore } from "../src/storage/profile-store";

const DB = join(
	tmpdir(),
	`lumen-cli-test-${Math.random().toString(36).slice(2)}.db`,
);

function ctx(): CliContext {
	return { profiles: new ProfileStore(DB) };
}

function invalidCode(error: unknown): string {
	return (error as AxiError).code;
}

const ADD_ARGS = [
	"--when",
	"1990-06-10T14:30",
	"--offset",
	"-240",
	"--at",
	"27.95,-82.46",
	"--city",
	"Tampa, USA",
	"--name",
	"erik",
];

afterEach(() => {
	rmSync(DB, { force: true });
	rmSync(`${DB}-journal`, { force: true });
	rmSync(`${DB}-wal`, { force: true });
	rmSync(`${DB}-shm`, { force: true });
});

type AddResult = {
	status: string;
	id: string;
	name: string | null;
	birthplace: string;
	when: string;
	offset: number;
	lat: number;
	lon: number;
	jdUt: number;
};

async function addSuggestions(args: string[]): Promise<string[]> {
	try {
		await profileCommand(["add", ...args], ctx());
		return [];
	} catch (error) {
		return (error as AxiError).suggestions ?? [];
	}
}

describe("profileCommand", () => {
	test("add returns an auto-generated UUID and TOON-rounded values", async () => {
		const result = (await profileCommand(
			["add", ...ADD_ARGS],
			ctx(),
		)) as AddResult;

		expect(result.status).toBe("added");
		expect(result.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(result.name).toBe("erik");
		expect(result.birthplace).toBe("Tampa, USA");
		expect(result.when).toBe("1990-06-10T14:30");
		expect(result.offset).toBe(-240);
		expect(result.lat).toBe(27.95);
		expect(result.lon).toBe(-82.46);
		expect(Number.isInteger(result.jdUt * 1e6)).toBe(true);
	});

	test("add is idempotent on the birth: second add returns the existing profile", async () => {
		const first = (await profileCommand(
			["add", ...ADD_ARGS],
			ctx(),
		)) as AddResult;
		const second = (await profileCommand(
			["add", ...ADD_ARGS.slice(0, -2), "--name", "another"],
			ctx(),
		)) as AddResult;

		expect(second.status).toBe("already exists");
		expect(second.id).toBe(first.id);
		expect(second.name).toBe("erik");
	});

	test("add rejects out-of-range input with VALIDATION_ERROR", async () => {
		await expect(
			profileCommand(
				[
					"add",
					"--when",
					"1990-06-10T14:30",
					"--offset",
					"900",
					"--at",
					"27.95,-82.46",
					"--city",
					"Tampa, USA",
				],
				ctx(),
			),
		).rejects.toThrow(/Invalid birth input/);
		await expect(
			profileCommand(
				[
					"add",
					"--when",
					"1990-13-01T00:00",
					"--offset",
					"0",
					"--at",
					"0,0",
					"--city",
					"x",
				],
				ctx(),
			),
		).rejects.toThrow(/Invalid birth input/);
	});

	test("add rejects malformed flags with VALIDATION_ERROR citing the rule", async () => {
		const when = await addSuggestions([
			"--when",
			"not-a-date",
			"--offset",
			"0",
			"--at",
			"0,0",
			"--city",
			"x",
		]);
		expect(when.join(" ")).toContain("--when");

		const offset = await addSuggestions([
			"--when",
			"1990-06-10T14:30",
			"--offset",
			"abc",
			"--at",
			"0,0",
			"--city",
			"x",
		]);
		expect(offset.join(" ")).toContain("--offset");

		const at = await addSuggestions([
			"--when",
			"1990-06-10T14:30",
			"--offset",
			"0",
			"--at",
			"zz",
			"--city",
			"x",
		]);
		expect(at.join(" ")).toContain("--at");

		await expect(
			profileCommand(["add", ...ADD_ARGS, "--bogus", "1"], ctx()),
		).rejects.toThrow(/Unknown flag: --bogus/);
	});

	test("add requires --city", async () => {
		await expect(
			profileCommand(
				["add", "--when", "1990-06-10T14:30", "--offset", "0", "--at", "0,0"],
				ctx(),
			),
		).rejects.toThrow(/Missing required flag --city/);
	});

	test("list returns profiles; empty list includes a hint", async () => {
		const empty = (await profileCommand(["list"], ctx())) as {
			profiles: unknown[];
			help?: string[];
		};
		expect(empty.profiles).toEqual([]);
		expect(empty.help?.[0]).toContain("lumen profile add");

		await profileCommand(["add", ...ADD_ARGS], ctx());
		const listed = (await profileCommand(["list"], ctx())) as {
			profiles: Array<{ id: string }>;
		};
		expect(listed.profiles).toHaveLength(1);
		expect(listed.profiles[0]?.id).toBeDefined();
	});

	test("get returns a profile and NOT_FOUND for a missing uuid", async () => {
		const added = (await profileCommand(
			["add", ...ADD_ARGS],
			ctx(),
		)) as AddResult;
		const shown = (await profileCommand(["get", added.id], ctx())) as AddResult;
		expect(shown.id).toBe(added.id);

		await expect(
			profileCommand(["get", "missing"], ctx()),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	test("rm removes a profile; removing an unknown one raises NOT_FOUND", async () => {
		const added = (await profileCommand(
			["add", ...ADD_ARGS],
			ctx(),
		)) as AddResult;
		const removed = (await profileCommand(["rm", added.id], ctx())) as {
			status: string;
		};
		expect(removed.status).toBe("removed");

		await expect(profileCommand(["rm", added.id], ctx())).rejects.toMatchObject(
			{
				code: "NOT_FOUND",
			},
		);
	});

	test("a store operation without context fails loud (PROFILE_ERROR)", async () => {
		await expect(profileCommand(["list"], undefined)).rejects.toMatchObject({
			code: "PROFILE_ERROR",
		});
	});

	test("--help returns focused usage per subcommand", async () => {
		const addHelp = (await profileCommand(
			["add", "--help"],
			undefined,
		)) as string;
		const listHelp = (await profileCommand(
			["list", "--help"],
			undefined,
		)) as string;
		expect(addHelp).toContain("--city");
		expect(addHelp).not.toContain("lumen profile get");
		expect(listHelp).toContain("lumen profile list");
		expect(listHelp).not.toContain("--offset");
	});

	test("rejects unknown subcommands", async () => {
		await expect(profileCommand(["bogus"], ctx())).rejects.toThrow(
			/Unknown profile command/,
		);
	});
});

test("profile command errors carry the VALIDATION_ERROR code", async () => {
	try {
		await profileCommand(["get", "missing"], ctx());
		expect.unreachable();
	} catch (error) {
		expect(invalidCode(error)).toBe("NOT_FOUND");
	}
});
