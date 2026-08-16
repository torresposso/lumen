/**
 * check-docs — paridad docs ↔ código.
 *
 * Rule "doc-first": ninguna feature se implementa contra docs viejos. Este
 * check falla si los docs del repo driftan del código real:
 *   1. SPEC §3 (superficie) ↔ registro de comandos en src/cli.ts
 *   2. árbol de DOMAIN.md / docs/agents/domain.md (src/) ↔ archivos de src/
 *
 * Durante una transición doc-first es ROJO a propósito (los docs describen el
 * target antes de que el código llegue) y vuelve a verde en el último ticket
 * del feature. Exit != 0 con la lista de divergencias.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

const problems: string[] = [];
function fail(msg: string) {
	problems.push(msg);
}

// ---------------------------------------------------------------------------
// 1. Superficie: SPEC §3 ↔ cli.ts
// ---------------------------------------------------------------------------

function firstFence(block: string): string | null {
	const m = block.match(/^```[^\n]*\n([\s\S]*?)\n```/m);
	return m ? (m[1] ?? null) : null;
}

function specSurface(): string[] {
	const md = readFileSync(join(ROOT, "SPEC.md"), "utf8");
	const header = md.indexOf("## 3.");
	const block = firstFence(header === -1 ? md : md.slice(header));
	if (!block) {
		fail("SPEC.md §3: no hay bloque fenced de comandos");
		return [];
	}
	return [...block.matchAll(/^([a-z][\w-]*)\s/gm)]
		.map((m) => m[1] ?? "")
		.filter((s) => s.length > 0);
}

function cliCommands(): string[] {
	const src = readFileSync(join(ROOT, "src", "cli.ts"), "utf8");
	const commands = src.match(/commands:\s*{([\s\S]*?)}/)?.[1] ?? "";
	return [...commands.matchAll(/^\s*([a-z][\w-]*):\s+\w+Command,/gm)]
		.map((m) => m[1] ?? "")
		.filter((s) => s.length > 0);
}

function checkSurface() {
	const docs = specSurface();
	const code = cliCommands();
	if (docs.length === 0 && code.length === 0) return;
	for (const c of code)
		if (!docs.includes(c))
			fail(
				`SPEC §3 no lista el comando '${c}' (registrado en cli.ts). Actualiza SPEC.md §3.`,
			);
	for (const d of docs)
		if (!code.includes(d))
			fail(
				`cli.ts no registra '${d}' (listado en SPEC §3). Actualiza src/cli.ts.`,
			);
}

// ---------------------------------------------------------------------------
// 2. Árbol src/ ↔ archivos reales
// ---------------------------------------------------------------------------

/** Extrae del bloque fenced del árbol los paths `dir/file.ts` (o `file.ts` en la raíz). */
function treeFiles(mdFile: string): string[] {
	const md = readFileSync(join(ROOT, mdFile), "utf8");
	const block = firstFence(md);
	if (!block) {
		fail(`${mdFile}: no hay bloque fenced del árbol src/`);
		return [];
	}
	const files: string[] = [];
	let currentDir: string | null = null;
	for (const line of block.split("\n")) {
		const depth = line.match(/^│ /) ? 1 : 0;
		const dir = line.match(/^\s*(?:├── |└── )([a-z][\w-]*)\/\s*#/);
		if (dir) {
			currentDir = dir[1] ?? null;
			continue;
		}
		const file = line.match(/([a-z][\w-]*\.ts)\b/);
		if (!file) continue;
		const fileName = file[1] ?? file[0];
		const name =
			depth === 1 && currentDir ? `${currentDir}/${fileName}` : fileName;
		files.push(name);
	}
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
	for (const doc of ["DOMAIN.md", "docs/agents/domain.md"]) {
		const expected = treeFiles(doc);
		for (const f of expected) {
			if (!actual.has(f))
				fail(
					`${doc}: el árbol lista 'src/${f}' pero no existe. Actualiza ${doc} (usa el nombre real) o crea el archivo.`,
				);
		}
		for (const f of actual) {
			if (!expected.includes(f))
				fail(`${doc}: falta 'src/${f}' en el árbol. Actualiza ${doc}.`);
		}
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
