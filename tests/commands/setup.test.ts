import { describe, expect, test } from "bun:test";
import { AxiError } from "axi-sdk-js";
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
	test("rejects unknown setup subcommands with a validation error", async () => {
		await expect(setupCommand(["invalid"])).rejects.toBeInstanceOf(AxiError);
		try {
			await setupCommand(["invalid"]);
			expect.unreachable();
		} catch (error) {
			expect((error as AxiError).code).toBe("VALIDATION_ERROR");
		}
	});

	test("returns usage for setup --help", async () => {
		const usage = await setupCommand(["--help"]);
		expect(typeof usage).toBe("string");
		expect(usage).toContain("lumen setup hooks");
	});

	test("rejects hook installation from an unbuilt source script", async () => {
		await expect(setupCommand(["hooks"])).rejects.toBeInstanceOf(AxiError);
	});
});
