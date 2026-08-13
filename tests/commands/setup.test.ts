import { describe, expect, test } from "bun:test";
import { resolveExecPath, setupCommand } from "../../src/commands/setup";

function withArgv1<T>(value: string, fn: () => T): T {
	const originalArgv = process.argv;
	try {
		process.argv = [originalArgv[0] ?? "", value];
		return fn();
	} finally {
		process.argv = originalArgv;
	}
}

describe("resolveExecPath", () => {
	test("returns process.execPath when argv[1] is inside bunfs virtual filesystem", () => {
		withArgv1("/$bunfs/root/lumen", () => {
			expect(resolveExecPath()).toBe(process.execPath);
		});
	});

	test("returns argv[1] path for standard script execution", () => {
		withArgv1("/home/user/lumen/bin/lumen.ts", () => {
			expect(resolveExecPath()).toBe("/home/user/lumen/bin/lumen.ts");
		});
	});
});

describe("setupCommand", () => {
	test("returns error and help for non-'hooks' subcommand", async () => {
		const res = await setupCommand(["invalid"]);
		expect(res).toEqual({
			error: "Unknown setup command",
			help: ["Run `lumen setup hooks`"],
		});
	});

	test("returns error and help when run from unbuilt source script", async () => {
		const res = await setupCommand(["hooks"]);
		expect(res).toHaveProperty("error");
	});
});
