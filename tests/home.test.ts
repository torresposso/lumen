import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runAxiCli } from "axi-sdk-js";
import { buildCliOptions } from "../src/cli";
import {
	formatCommandsHelp,
	homeView,
	PROFILE_ADD_EXAMPLE,
	PROFILE_ADD_HINT,
	PROFILE_LIST_HINT,
} from "../src/cli/surface";
import type { NewProfile } from "../src/domain/model";
import { InMemoryProfileStore } from "../src/storage/profile-store";

let db: Database;
let store: InMemoryProfileStore;

beforeEach(() => {
	db = new Database(":memory:");
	store = new InMemoryProfileStore(db, () => new Date());
});

afterEach(() => {
	db.close();
});

function newProfile(overrides: Partial<NewProfile> = {}): NewProfile {
	const base: NewProfile = {
		name: "erik",
		birthPlace: "Tampa, USA",
		birthDateTime: "1990-06-10T14:30-04:00",
		birthLat: 27.95,
		birthLon: -82.46,
		birthJdUt: 2444068.0625,
	};
	return { ...base, ...overrides };
}

function runCli(argv: string[]): {
	out: string[];
	options: ReturnType<typeof buildCliOptions>;
} {
	const out: string[] = [];
	const options = buildCliOptions(
		{ argv, stdout: { write: (chunk) => out.push(chunk) } },
		store,
	);
	return { out, options };
}

describe("homeView — the bare-invocation shape", () => {
	test("an empty store reports 0 profiles and points the agent at add", () => {
		expect(homeView(store)).toEqual({
			profiles: 0,
			help: [PROFILE_ADD_HINT],
		});
	});

	test("a non-empty store reports the count and points the agent at list", () => {
		store.add(newProfile());
		expect(homeView(store)).toEqual({
			profiles: 1,
			help: [PROFILE_LIST_HINT],
		});
	});

	test("the add hint is built from the canonical example, not a re-typed line", () => {
		expect(PROFILE_ADD_HINT).toBe(`Run \`${PROFILE_ADD_EXAMPLE}\``);
	});
});

describe("formatCommandsHelp — the derived Commands block", () => {
	test("lists every arm line with its one-liner from the catalog", () => {
		const sampleCatalog = [
			{ line: "lumen profile add", help: "Register a birth" },
			{ line: "lumen profile list", help: "List saved profiles" },
		];
		const help = formatCommandsHelp(sampleCatalog);
		expect(help).toContain("Commands:");
		expect(help).toContain("lumen profile add");
		expect(help).toContain("lumen profile list");
	});
});

describe("buildCliOptions — the injectable composition root", () => {
	test("the home handler fails loud when context is missing", async () => {
		const { options } = runCli([]);
		try {
			await options.home([], undefined);
			expect.unreachable();
		} catch (error) {
			expect(error).toMatchObject({ code: "CONTEXT_ERROR" });
		}
	});

	test("a bare invocation renders the empty-state count and hint into stdout", async () => {
		const { out, options } = runCli([]);
		await runAxiCli(options);
		// The hint's inner quotes are TOON-escaped — assert the unquoted head.
		const text = out.join("");
		expect(text).toContain("profiles: 0");
		expect(text).toContain("Run `lumen profile add --when");
	});

	test("a stored profile surfaces in the bare invocation", async () => {
		store.add(newProfile());
		const { out, options } = runCli([]);
		await runAxiCli(options);
		expect(out.join("")).toContain(PROFILE_LIST_HINT);
	});

	test("--help renders the derived top-level Commands block", async () => {
		const { out, options } = runCli(["--help"]);
		await runAxiCli(options);
		expect(out.join("")).toContain("Commands:\n  lumen profile add");
		expect(out.join("")).toContain("lumen chart natal <uuid>");
	});

	test("command routing through the root reaches the profile store", async () => {
		const { out, options } = runCli([
			"profile",
			"add",
			"--when",
			"1990-06-10T14:30-04:00",
			"--where",
			"27.95, -82.46, Tampa, USA",
		]);
		await runAxiCli(options);
		expect(out.join("")).toContain("added");
		expect(store.list()).toHaveLength(1);
	});
});
