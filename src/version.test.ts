import { describe, expect, test } from "bun:test";
import { tryFastPath } from "axi-sdk-js/fast-path";
import { VERSION } from "./version";

function run(argv: string[]): { handled: boolean; output: string } {
	let output = "";
	const handled = tryFastPath(argv, {
		version: VERSION,
		stdout: { write: (chunk) => (output += chunk) },
	});
	return { handled, output };
}

describe("fast path", () => {
	test("handles bare -v, -V, and --version", () => {
		for (const flag of ["-v", "-V", "--version"]) {
			const { handled, output } = run([flag]);
			expect(handled).toBe(true);
			expect(output.trim()).toBe(VERSION);
		}
	});

	test("falls through for everything else", () => {
		for (const argv of [[], ["--help"], ["chart"], ["chart", "--version"]]) {
			const { handled, output } = run(argv);
			expect(handled).toBe(false);
			expect(output).toBe("");
		}
	});
});
