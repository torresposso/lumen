import { describe, expect, test } from "bun:test";
import { main } from "../src/cli";

describe("main CLI entrypoint", () => {
	test("exports main function", () => {
		expect(typeof main).toBe("function");
	});

	test("can be invoked without crashing", async () => {
		// Mock argv for home view
		const originalArgv = process.argv;
		process.argv = ["node", "lumen"];
		try {
			await expect(main()).resolves.toBeUndefined();
		} finally {
			process.argv = originalArgv;
		}
	});
});
