import { describe, expect, test } from "bun:test";
import { main } from "../src/cli";

describe("main CLI entrypoint", () => {
	test("exports main function", () => {
		expect(typeof main).toBe("function");
	});

	test("can be invoked without crashing", async () => {
		const originalArgv = process.argv;
		const originalProfilesDir = process.env.LUMEN_PROFILES_DIR;
		process.env.LUMEN_PROFILES_DIR = "/tmp/lumen-cli-test-profiles";
		process.argv = ["node", "lumen"];
		try {
			await expect(main()).resolves.toBeUndefined();
		} finally {
			process.argv = originalArgv;
			if (originalProfilesDir === undefined) {
				delete process.env.LUMEN_PROFILES_DIR;
			} else {
				process.env.LUMEN_PROFILES_DIR = originalProfilesDir;
			}
		}
	});
});
