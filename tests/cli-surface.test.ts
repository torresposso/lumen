import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	ADD_FLAGS,
	CHART_ARMS,
	CHART_COMMAND,
	emptyStateHint,
	formatCommandsHelp,
	homeView,
	PROFILE_ADD_EXAMPLE,
	PROFILE_ADD_HINT,
	PROFILE_ARMS,
	PROFILE_COMMAND,
	PROFILE_LIST_HINT,
	SYNTHESIS_FLAGS,
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

// The expected literals come from spec.md §3 — the independent source of
// truth for the CLI surface, not a re-derivation of the code under test.
describe("command surface", () => {
	test("exposes the spec §3 flag literals", () => {
		expect(ADD_FLAGS.when).toBe("--when");
		expect(ADD_FLAGS.where).toBe("--where");
		expect(ADD_FLAGS.name).toBe("--name");
		expect(SYNTHESIS_FLAGS.when).toBe("--when");
		expect(SYNTHESIS_FLAGS.where).toBe("--where");
	});

	test("exposes the command and arm tokens", () => {
		expect(PROFILE_COMMAND).toBe("lumen profile");
		expect(PROFILE_ARMS.add).toBe("lumen profile add");
		expect(PROFILE_ARMS.list).toBe("lumen profile list");
		expect(PROFILE_ARMS.get).toBe("lumen profile get");
		expect(PROFILE_ARMS.delete).toBe("lumen profile delete");
		expect(CHART_COMMAND).toBe("lumen chart");
		expect(CHART_ARMS.natal).toBe("lumen chart natal <uuid>");
		expect(CHART_ARMS.synthesis).toBe(
			'lumen chart synthesis <uuid> --when "YYYY-MM-DDTHH:MM±HH:MM" [--where "lat, lon, Place"]',
		);
	});

	test("the canonical example matches the spec §3 example verbatim", () => {
		expect(PROFILE_ADD_EXAMPLE).toBe(
			'lumen profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia"',
		);
	});

	test("the shared hints match the spec §3 surface", () => {
		expect(PROFILE_ADD_HINT).toBe(
			'Run `lumen profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia"`',
		);
		expect(PROFILE_LIST_HINT).toBe(
			"Run `lumen profile list` to see saved profiles",
		);
	});

	test("every literal is built from the tokens, not re-typed copies", () => {
		expect(PROFILE_ARMS.add).toContain(PROFILE_COMMAND);
		expect(PROFILE_ADD_EXAMPLE).toContain(PROFILE_ARMS.add);
		expect(PROFILE_ADD_EXAMPLE).toContain(ADD_FLAGS.when);
		expect(PROFILE_ADD_EXAMPLE).toContain(ADD_FLAGS.where);
		expect(PROFILE_ADD_HINT).toContain(PROFILE_ADD_EXAMPLE);
		expect(PROFILE_LIST_HINT).toContain(PROFILE_ARMS.list);
	});

	test("the empty-state rule picks the add hint for an empty store and the list hint otherwise", () => {
		expect(emptyStateHint(false)).toBe(PROFILE_ADD_HINT);
		expect(emptyStateHint(true)).toBe(PROFILE_LIST_HINT);
	});
});

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
