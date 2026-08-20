/**
 * check-docs — docs ↔ code parity.
 *
 * "Doc-first" rule: no feature is implemented against stale docs. This check
 * fails when the specs drift from the real code:
 *   1. SPEC §3 (surface) ↔ command registration in src/cli.ts
 *   2. SPEC §3 (surface) ↔ CLI vocabulary in src/cli/surface.ts
 *   3. SPEC §8 (suggested src/ tree) ↔ actual files under src/
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SPEC_PATHS = [
	join(ROOT, ".scratch", "chart-natal", "spec.md"),
	join(ROOT, ".scratch", "chart-transits", "spec.md"),
	join(ROOT, ".scratch", "chart-progressions", "spec.md"),
	join(ROOT, ".scratch", "chart-synthesis", "spec.md"),
].filter((p) => existsSync(p));

if (SPEC_PATHS.length === 0) {
	console.warn(
		"check:docs — warning: no active specs found under .scratch/; skipping parity checks",
	);
	process.exit(0);
}

const problems: string[] = [];
function fail(msg: string) {
	problems.push(msg);
}

function firstFence(block: string): string | null {
	const m = block.match(/^```[^\n]*\n([\s\S]*?)\n```/m);
	return m ? (m[1] ?? null) : null;
}

function specSection(specFile: string, heading: string): string {
	const md = readFileSync(specFile, "utf8");
	const at = md.indexOf(heading);
	return at === -1 ? md : md.slice(at);
}

// ---------------------------------------------------------------------------
// 1. Surface: SPEC §3 ↔ cli.ts command registration
// ---------------------------------------------------------------------------

function specCommands(): string[] {
	const commands: string[] = [];
	for (const specPath of SPEC_PATHS) {
		const block = firstFence(specSection(specPath, "## 3."));
		if (block) {
			const cmds = [...block.matchAll(/^lumen\s+([a-z][\w-]*)\b/gm)]
				.map((m) => m[1] ?? "")
				.filter((s) => s.length > 0);
			commands.push(...cmds);
		}
	}
	return [...new Set(commands)];
}

function cliCommands(): string[] {
	const src = readFileSync(join(ROOT, "src", "cli.ts"), "utf8");
	const commands = src.match(/commands:\s*{([\s\S]*?)}/)?.[1] ?? "";
	return [...commands.matchAll(/^\s*([a-z][\w-]*):\s+\w+Command,/gm)]
		.map((m) => m[1] ?? "")
		.filter((s) => s.length > 0);
}

function checkSurface() {
	const docs = specCommands();
	const code = cliCommands();
	if (docs.length === 0 && code.length === 0) return;
	for (const c of code)
		if (!docs.includes(c))
			fail(
				`spec.md §3 does not list command '${c}' (registered in cli.ts). Update spec.md §3.`,
			);
	for (const d of docs)
		if (!code.includes(d))
			fail(
				`cli.ts does not register '${d}' (listed in spec.md §3). Update src/cli.ts.`,
			);
}

// ---------------------------------------------------------------------------
// 2. Surface vocabulary: SPEC §3 ↔ src/cli/surface.ts
// ---------------------------------------------------------------------------

function specCommandTokens(): string[] {
	const tokens: string[] = [];
	for (const specPath of SPEC_PATHS) {
		const block = firstFence(specSection(specPath, "## 3."));
		if (block) {
			const t = [...block.matchAll(/^lumen\s+(\S+)/gm)].map(
				(m) => `lumen ${m[1] ?? ""}`,
			);
			tokens.push(...t);
		}
	}
	return [...new Set(tokens)];
}

function specFlags(): string[] {
	const flags: string[] = [];
	for (const specPath of SPEC_PATHS) {
		const block = firstFence(specSection(specPath, "## 3."));
		if (block) {
			const f = [...block.matchAll(/--[\w-]+/g)].map((m) => m[0] ?? "");
			flags.push(...f);
		}
	}
	return [...new Set(flags)];
}

function surfaceVocabulary() {
	const src = readFileSync(join(ROOT, "src", "cli", "surface.ts"), "utf8");

	const command = src.match(/PROFILE_COMMAND\s*=\s*"([^"]+)"/)?.[1];
	if (command === undefined) {
		fail("src/cli/surface.ts does not declare PROFILE_COMMAND");
	} else if (!specCommandTokens().includes(command)) {
		fail(
			`spec.md §3 does not list command token '${command}' (declared PROFILE_COMMAND). Update spec.md §3.`,
		);
	}

	const allFlags = new Set<string>();
	for (const match of src.matchAll(
		/export const \w+_FLAGS\s*=\s*{([\s\S]*?)}/g,
	)) {
		const flagsBlock = match[1] ?? "";
		for (const m of flagsBlock.matchAll(/["'](--[\w-]+)["']/g)) {
			if (m[1]) allFlags.add(m[1]);
		}
	}

	const specFlagSet = new Set(specFlags());
	for (const f of allFlags)
		if (!specFlagSet.has(f))
			fail(
				`spec.md §3 does not list flag '${f}' (declared in surface.ts flags). Update spec.md §3.`,
			);
	for (const f of specFlagSet)
		if (!allFlags.has(f))
			fail(
				`surface.ts flags do not declare '${f}' (listed in spec.md §3). Update src/cli/surface.ts.`,
			);
}

// ---------------------------------------------------------------------------
// 3. src/ tree (SPEC §8) ↔ real files
// ---------------------------------------------------------------------------

function specSrcFiles(): string[] {
	const files: string[] = [];
	for (const specPath of SPEC_PATHS) {
		const block = firstFence(specSection(specPath, "## 8."));
		if (block) {
			const f = [...block.matchAll(/^\s*(src\/[\w./-]+\.ts)\s*$/gm)]
				.map((m) => (m[1] ?? "").replace(/^src\//, ""))
				.filter((s) => s.length > 0);
			files.push(...f);
		}
	}
	return [...new Set(files)].sort();
}

function actualFiles(): string[] {
	const out: string[] = [];
	function walk(dir: string, rel: string) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(join(dir, entry.name), entryRel);
			} else if (entry.name.endsWith(".ts")) {
				out.push(entryRel);
			}
		}
	}
	walk(join(ROOT, "src"), "");
	return out.sort();
}

function checkTree() {
	const actual = new Set(actualFiles());
	const expected = specSrcFiles();
	for (const f of expected) {
		if (!actual.has(f))
			fail(
				`spec.md §8 lists 'src/${f}' but it does not exist. Update spec.md or create the file.`,
			);
	}
	for (const f of actual) {
		if (!expected.includes(f))
			fail(`spec.md §8 does not list 'src/${f}'. Update spec.md §8.`);
	}
}

// ---------------------------------------------------------------------------

checkSurface();
surfaceVocabulary();
checkTree();

if (problems.length > 0) {
	console.error("check:docs — docs ↔ code divergence:");
	for (const p of problems) console.error(`  - ${p}`);
	console.error(
		"\nDoc-first rule: docs are updated BEFORE implementing (see AGENTS.md — Workflow → Doc-first rule).",
	);
	process.exit(1);
}
console.log("check:docs — docs ↔ code parity OK");
