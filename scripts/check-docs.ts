/**
 * check-docs — docs ↔ code parity.
 *
 * "Doc-first" rule: no feature is implemented against stale docs. This check
 * fails when the lumen-v2 effort spec drifts from the real code:
 *   1. SPEC §3 (surface) ↔ command registration in src/cli.ts
 *   2. SPEC §8 (suggested src/ tree) ↔ actual files under src/
 *
 * During implementation it may be RED on purpose (the spec describes the
 * target before the code lands) and turns green when the feature is done.
 * Exit != 0 with the list of divergences.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SPEC = join(ROOT, ".scratch", "lumen-v2", "spec.md");

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
// 1. Surface: SPEC §3 ↔ cli.ts
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
// 2. src/ tree (SPEC §8) ↔ real files
// ---------------------------------------------------------------------------

function specSrcFiles(): string[] {
	const block = firstFence(specSection("## 8."));
	if (!block) return [];
	const files = [...block.matchAll(/(?:^|\s)(src\/[\w./-]+\.ts)\b/gm)]
		.map((m) => (m[1] ?? "").replace(/^src\//, ""))
		.filter((s) => s.length > 0);
	return [...new Set(files)].sort();
}

function actualFiles(): string[] {
	const out: string[] = [];
	for (const dir of readdirSync(join(ROOT, "src"))) {
		const p = join(ROOT, "src", dir);
		if (p.endsWith(".ts")) {
			out.push(dir);
		} else if (readdirSync(p).some((f) => f.endsWith(".ts"))) {
			for (const f of readdirSync(p))
				if (f.endsWith(".ts")) out.push(`${dir}/${f}`);
		}
	}
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
