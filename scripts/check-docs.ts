/**
 * check-docs — paridad docs ↔ código.
 *
 * Regla "doc-first": ninguna feature se implementa contra docs viejos. Este
 * check falla si la spec del esfuerzo lumen-v2 driftan del código real:
 *   1. SPEC §3 (superficie) ↔ registro de comandos en src/cli.ts
 *   2. SPEC §8 (árbol src/ sugerido) ↔ archivos reales de src/
 *
 * Durante la implementación puede estar ROJO a propósito (la spec describe el
 * target antes de que el código llegue) y vuelve a verde al terminar.
 * Exit != 0 con la lista de divergencias.
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
// 1. Superficie: SPEC §3 ↔ cli.ts
// ---------------------------------------------------------------------------

function specCommands(): string[] {
	const block = firstFence(specSection("## 3."));
	if (!block) {
		fail("spec.md §3: no hay bloque fenced de comandos");
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
				`spec.md §3 no lista el comando '${c}' (registrado en cli.ts). Actualiza spec.md §3.`,
			);
	for (const d of docs)
		if (!code.includes(d))
			fail(
				`cli.ts no registra '${d}' (listado en spec.md §3). Actualiza src/cli.ts.`,
			);
}

// ---------------------------------------------------------------------------
// 2. Árbol src/ (SPEC §8) ↔ archivos reales
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
				`spec.md §8 lista 'src/${f}' pero no existe. Actualiza spec.md o crea el archivo.`,
			);
	}
	for (const f of actual) {
		if (!expected.includes(f))
			fail(`spec.md §8 no lista 'src/${f}'. Actualiza spec.md §8.`);
	}
}

// ---------------------------------------------------------------------------

checkSurface();
checkTree();

if (problems.length > 0) {
	console.error("check:docs — divergencia docs ↔ código:");
	for (const p of problems) console.error(`  - ${p}`);
	console.error(
		"\nRegla doc-first: los docs se actualizan ANTES de implementar (mira docs/agents/issue-tracker.md).",
	);
	process.exit(1);
}
console.log("check:docs — paridad docs ↔ código OK");
