import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AxiError } from "axi-sdk-js";
import { profileCommand } from "../src/commands/profile";
import {
	ADD_FLAGS,
	PROFILE_ADD_HINT,
	PROFILE_ARMS,
	PROFILE_COMMAND,
} from "../src/core/cli-surface";
import type { CliContext } from "../src/core/context";
import { InMemoryProfileStore } from "../src/storage/profile-store";

let db: Database;

beforeEach(() => {
	db = new Database(":memory:");
});

afterEach(() => {
	db.close();
});

function ctx(): CliContext {
	return {
		profiles: new InMemoryProfileStore(db, () => new Date()),
	};
}

function invalidCode(error: unknown): string {
	return (error as AxiError).code;
}

const ADD_ARGS = [
	"--when",
	"1990-06-10T14:30-04:00",
	"--where",
	"27.95, -82.46, Tampa, USA",
	"--name",
	"erik",
];

type AddResult = {
	status: string;
	id: string;
	name: string | null;
	birthPlace: string;
	birthDateTime: string;
	birthLat: number;
	birthLon: number;
	birthJdUt: number;
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
		expect(result.birthPlace).toBe("Tampa, USA");
		expect(result.birthDateTime).toBe("1990-06-10T14:30-04:00");
		expect(result.birthLat).toBe(27.95);
		expect(result.birthLon).toBe(-82.46);
		expect(Number.isInteger(result.birthJdUt * 1e6)).toBe(true);
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
					"1990-06-10T14:30+15:00",
					"--where",
					"27.95, -82.46, Tampa, USA",
				],
				ctx(),
			),
		).rejects.toThrow(/Invalid birth input/);
		await expect(
			profileCommand(
				["add", "--when", "1990-13-01T00:00-05:00", "--where", "0, 0, x"],
				ctx(),
			),
		).rejects.toThrow(/Invalid birth input/);
	});

	test("add rejects malformed flags with VALIDATION_ERROR citing the rule", async () => {
		const when = await addSuggestions([
			"--when",
			"not-a-date",
			"--where",
			"0, 0, x",
		]);
		expect(when.join(" ")).toContain("--when");

		const offset = await addSuggestions([
			"--when",
			"1990-06-10T14:30+05:99",
			"--where",
			"0, 0, x",
		]);
		expect(offset.join(" ")).toContain("--when offset");

		const where = await addSuggestions([
			"--when",
			"1990-06-10T14:30-05:00",
			"--where",
			"zz",
		]);
		expect(where.join(" ")).toContain("--where");

		await expect(
			profileCommand(["add", ...ADD_ARGS, "--bogus", "1"], ctx()),
		).rejects.toThrow(/Unknown flag: --bogus/);
	});

	test("add requires --where", async () => {
		await expect(
			profileCommand(["add", "--when", "1990-06-10T14:30-05:00"], ctx()),
		).rejects.toThrow(/Missing required flag --where/);
	});

	test("list returns profiles; empty list includes a hint", async () => {
		const empty = (await profileCommand(["list"], ctx())) as {
			profiles: unknown[];
			help?: string[];
		};
		expect(empty.profiles).toEqual([]);
		expect(empty.help?.[0]).toBe(PROFILE_ADD_HINT);

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

	test("delete removes a profile; deleting an unknown one raises NOT_FOUND", async () => {
		const added = (await profileCommand(
			["add", ...ADD_ARGS],
			ctx(),
		)) as AddResult;
		const removed = (await profileCommand(["delete", added.id], ctx())) as {
			status: string;
		};
		expect(removed.status).toBe("deleted");

		await expect(
			profileCommand(["delete", added.id], ctx()),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
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
		expect(addHelp).toContain(ADD_FLAGS.when);
		expect(addHelp).toContain(ADD_FLAGS.where);
		expect(addHelp).not.toContain(PROFILE_ARMS.get);
		expect(listHelp).toContain(PROFILE_ARMS.list);
		expect(listHelp).not.toContain("--offset");
		expect(listHelp).not.toContain(ADD_FLAGS.where);
	});

	test("rejects unknown subcommands", async () => {
		await expect(profileCommand(["bogus"], ctx())).rejects.toThrow(
			/Unknown profile command/,
		);
	});

	test("an unknown subcommand plus --help returns the group usage, not an error", async () => {
		const help = (await profileCommand(["bogus", "--help"], ctx())) as string;
		expect(help).toContain(PROFILE_COMMAND);
		expect(help).toContain(PROFILE_ARMS.add);
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
