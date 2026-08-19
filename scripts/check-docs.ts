/**
 * check-docs — docs ↔ code parity.
 *
 * "Doc-first" rule: no feature is implemented against stale docs. This check
 * fails when the lumen-v2 effort spec drifts from the real code:
 *   1. SPEC §3 (surface) ↔ command registration in src/cli.ts
 *   2. SPEC §3 (surface) ↔ CLI vocabulary in src/cli/surface.ts (PROFILE_COMMAND
 *      and the ADD_FLAGS literals must be the ones the spec §3 block cites)
 *   3. SPEC §8 (suggested src/ tree) ↔ actual files under src/
 *
 * During implementation it may be RED on purpose (the spec describes the
 * target before the code lands) and turns green when the feature is done.
 * Exit != 0 with the list of divergences. A missing effort spec directory is
 * only a warning — the parity gate needs a spec to check against.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SPEC = join(ROOT, ".scratch", "chart-natal", "spec.md");

if (!existsSync(SPEC)) {
	console.warn(
		"check:docs — warning: no spec at .scratch/chart-natal/spec.md; skipping parity checks",
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

function specSection(heading: string): string {
	const md = readFileSync(SPEC, "utf8");
	const at = md.indexOf(heading);
	return at === -1 ? md : md.slice(at);
}

// ---------------------------------------------------------------------------
// 1. Surface: SPEC §3 ↔ cli.ts command registration
// ---------------------------------------------------------------------------

function specCommands(): string[] {
	const block = firstFence(specSection("## 3."));
	if (!block) {
		fail("spec.md §3: no fenced command block");
		return [];
	}
	const commands = [...block.matchAll(/^lumen\s+([a-z][\w-]*)\b/gm)]
		.map((m) => m[1] ?? "")
		.filter((s) => s.length > 0);
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

/** Root command tokens named in the spec §3 block, e.g. "lumen profile". */
function specCommandTokens(): string[] {
	const block = firstFence(specSection("## 3."));
	if (!block) return [];
	return [
		...new Set(
			[...block.matchAll(/^lumen\s+(\S+)/gm)].map((m) => `lumen ${m[1] ?? ""}`),
		),
	];
}

/** Flag literals named in the spec §3 block, e.g. "--when". */
function specFlags(): string[] {
	const block = firstFence(specSection("## 3."));
	if (!block) return [];
	return [...new Set([...block.matchAll(/--[\w-]+/g)].map((m) => m[0] ?? ""))];
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

	const flagsBlock = src.match(/ADD_FLAGS\s*=\s*{([\s\S]*?)}/)?.[1];
	if (flagsBlock === undefined) {
		fail("src/cli/surface.ts does not declare ADD_FLAGS");
		return;
	}
	const flags = [...flagsBlock.matchAll(/["'](--[\w-]+)["']/g)]
		.map((m) => m[1] ?? "")
		.filter((s) => s.length > 0);
	const specFlagSet = new Set(specFlags());
	for (const f of flags)
		if (!specFlagSet.has(f))
			fail(
				`spec.md §3 does not list flag '${f}' (declared in ADD_FLAGS). Update spec.md §3.`,
			);
	for (const f of specFlagSet)
		if (!flags.includes(f))
			fail(
				`surface.ts ADD_FLAGS does not declare '${f}' (listed in spec.md §3). Update src/cli/surface.ts.`,
			);
}

// ---------------------------------------------------------------------------
// 3. src/ tree (SPEC §8) ↔ real files
// ---------------------------------------------------------------------------

function specSrcFiles(): string[] {
	const block = firstFence(specSection("## 8."));
	if (!block) return [];
	// Full-line anchor: a src path is one whole entry in the §8 fence, so a
	// greedy inline regex cannot conflate two paths sharing a prefix or let a
	// nested path bleed across lines.
	const files = [...block.matchAll(/^\s*(src\/[\w./-]+\.ts)\s*$/gm)]
		.map((m) => (m[1] ?? "").replace(/^src\//, ""))
		.filter((s) => s.length > 0);
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
