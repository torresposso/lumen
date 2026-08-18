import { describe, expect, test } from "bun:test";
import { ADD_FLAGS, PROFILE_ADD_EXAMPLE } from "../src/core/cli-surface";

// The expected literals come from spec.md §3 — the independent source of
// truth for the CLI surface, not a re-derivation of the code under test.
describe("add surface", () => {
	test("exposes the spec §3 flag literals", () => {
		expect(ADD_FLAGS.when).toBe("--when");
		expect(ADD_FLAGS.where).toBe("--where");
		expect(ADD_FLAGS.name).toBe("--name");
	});

	test("the canonical example matches the spec §3 example verbatim", () => {
		expect(PROFILE_ADD_EXAMPLE).toBe(
			'lumen profile add --when "1981-01-26T00:50-05:00" --where "9.15, -74.75, Magangué, Colombia"',
		);
	});

	test("the example is built from the tokens, not re-typed copies", () => {
		expect(PROFILE_ADD_EXAMPLE).toContain(ADD_FLAGS.when);
		expect(PROFILE_ADD_EXAMPLE).toContain(ADD_FLAGS.where);
	});
});
