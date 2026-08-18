import { describe, expect, test } from "bun:test";
import {
	ADD_FLAGS,
	PROFILE_ADD_EXAMPLE,
	PROFILE_ADD_HINT,
	PROFILE_ARMS,
	PROFILE_COMMAND,
	PROFILE_LIST_HINT,
} from "../src/core/cli-surface";

// The expected literals come from spec.md §3 — the independent source of
// truth for the CLI surface, not a re-derivation of the code under test.
describe("command surface", () => {
	test("exposes the spec §3 flag literals", () => {
		expect(ADD_FLAGS.when).toBe("--when");
		expect(ADD_FLAGS.where).toBe("--where");
		expect(ADD_FLAGS.name).toBe("--name");
	});

	test("exposes the command and arm tokens", () => {
		expect(PROFILE_COMMAND).toBe("lumen profile");
		expect(PROFILE_ARMS.add).toBe("lumen profile add");
		expect(PROFILE_ARMS.list).toBe("lumen profile list");
		expect(PROFILE_ARMS.get).toBe("lumen profile get");
		expect(PROFILE_ARMS.delete).toBe("lumen profile delete");
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
});
