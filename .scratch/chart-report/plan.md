# Plan — `report` atómico por módulo (Markdown para NotebookLM)

> Estado: **planificación cerrada, sin implementar**. Cuando se retome, este
> doc se convierte en `spec.md` (doc-first) y se añade la parity de
> `scripts/check-docs.ts`.

## Why / contexto

- El flag `--interpret` (effort `chart-synthesis`) produce **vistas JSON
  re-proyectadas**, no un documento. El usuario quiere un **Markdown** para
  subir a **NotebookLM** (Google) y generar podcasts / videos / documentos a
  partir de los cálculos que ya hace Lumen.
- Hallazgo de auditoría: los extractores `*Interpretation` son
  **re-proyecciones puras** de datos ya calculados en `chart` (no hay datos
  nuevos, no hay prosa). El nombre es engañoso; de ahí la necesidad de un
  renderizador Markdown real, separado.

## Decisiones cerradas

| # | Tema | Decisión |
|---|------|----------|
| 1 | Disparador | flag `--report` en `chart natal` / `chart transits` / `chart progressions` (atómico por módulo). **NO** un `lumen report` top-level, **NO** repurpose de `--interpret`. |
| 2 | Alcance v1 | los 3 módulos atómicos: natal ("data"), transits, progressions. El **general/combinado** (incl. `synthesis`) queda para después, fuera de scope. |
| 3 | Estilo | Markdown **estructurado y factual**, language-neutral, **sin prosa hardcoded**. NotebookLM agrega la narrativa. |
| 4 | Salida | **siempre archivo**. Default `reports/<nombre>.<módulo>.md` en cwd. `--output <ruta>` lo overridea. `reports/` se añade a `.gitignore`. |
| 5 | Nombre de archivo | usa `profile.name` (nombre de la persona). Sanitizar; nulo/vacío → fallback `<uuid>.<módulo>.md`; colisión → sufijo corto de uuid. |

## Superficie CLI

```
lumen chart natal <uuid> --report [--output ruta.md]
lumen chart transits <uuid> --when "<iso>" [--where "lat,lon,Place"] --report [--output ruta.md]
lumen chart progressions <uuid> --when "<iso>" --report [--output ruta.md]
```

- `<uuid>` positional sigue siendo el lookup del perfil (único y robusto);
  el **nombre del archivo** usa `profile.name`.
- `--report` tiene prioridad sobre `--interpret` para el formato de salida
  (el doc Markdown ya incluye una sección de raíz kármica).
- Perfil no encontrado → `AxiError NOT_FOUND` (consistente con `chart`).

## Contenido del Markdown (estructurado y factual) por módulo

### Natal (`NatalChartOutput`)
Perfil · metadatos (casa system Porphyry, zodiac Tropical, método) ·
cuerpos/planetas (tabla: signo, casa, grado, retrógrado) · ángulos (ASC, MC,
Vertex, East Point) · cúspides (tabla signo/grado por casa) · aspectos (tabla) ·
**raíz kármica** (Plutón+PPP, eje nodal, skipped steps, dispositores, eclipses
prenatales, lotes del alma) · patrones · firma · house rulers · conteos.

### Transits (`TransitChartOutput`)
Target (datetime/jd/coords) · eco natal · cuerpos transiting (tabla) · ángulos/
cúspides locales · aspectos-a-natal (tabla) · evolutionaryTriggers · out-of-bounds
· método.

### Progressions (`ProgressedChartOutput`)
Target (edad / año progresado jd) · eco natal · cuerpos progresados (tabla) ·
fase Sol-Luna · aspectos-a-natal · evolutionaryTriggers (contactos
Plutón/PPP/nodal + skipped step activations) · método.

## Archivos a crear (doc-first §8)

- `.scratch/chart-report/spec.md` — se redacta al retomar (contrato).
- `src/render/natal-markdown.ts` → `renderNatalChartMarkdown(chart: NatalChartOutput): string` + `tests/render/natal-markdown.test.ts`
- `src/render/transits-markdown.ts` → `renderTransitsChartMarkdown(transits: TransitChartOutput): string` + test
- `src/render/progressions-markdown.ts` → `renderProgressedChartMarkdown(progressions: ProgressedChartOutput): string` + test
- Wiring en `src/commands/chart.ts`: añadir `--report` + `--output` a cada
  `ArgsSpec`; el `run` renderiza y escribe archivo (mkdir `reports/` si falta).
- `tests/commands/chart-report.test.ts`: 3 subcomandos + `--output` + `NOT_FOUND`.
- `.gitignore`: añadir `reports/`.
- `scripts/check-docs.ts` debe quedar en verde.

## Orden de implementación (al salir de planificación)

1. `spec.md` (doc-first) · 2. los 3 renderers + tests (puros) · 3. wiring +
test de comando · 4. `bun run check:docs` verde + `bun test` · 5. commit
(inglés, captura el término resuelto).

## Notas / open questions ya resueltas

- `--output` es override opcional sobre el default `reports/`; no es requerido.
- Campo de nombre = `profile.name` (nullable en el schema). `birthPlace` es un
  lugar, **no** el nombre de la persona.
- **No hay profiles todavía**: repo recién clonado, sin `lumen.db` en ningún
  lado. Los tests usan `InMemoryProfileStore`. No se puede probar con datos
  reales hasta añadir profiles (`lumen profile add`).
- General/combinado (incl. `synthesis`) diferido a un effort posterior.
- Mapeo "data" = módulo **natal** (`src/engine/natal`).
