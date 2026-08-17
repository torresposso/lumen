# Chart Evo — mapa

Feature: mover la mecánica evolutiva (Plutón/PPP + eje nodal) a `chart natal` bajo un solo flag `--evo`, sin `--full`, y retirar `soul` de la superficie.

## Decisiones-so-far

- Flag: `--evo` (booleano).
- Output block: `evo` (completo en una sola llamada; sin `--full`).
- `chart natal` sin flags queda idéntico.
- `chart draconic` rechaza `--evo`.
- `phase` vive dentro de `evo`, no en el base.
- `interpretationContext` se mantiene como está.
- `soul` se elimina sin alias.
- `--evo` entrega todo: aspectos, cadenas y eclipses prenatales.
- `NatalRequest` no se extiende; `ChartOutputSelection { evo }` separado.

## Hijos

- [x] `01-adr-norte` — ADR/ticket del norte (mueve mecánica a chart; retira soul)
- [x] `02-docs-evo` — docs primero (SPEC/DOMAIN/CONTEXT/README/Home/help)
- [x] `03-intake` — flag `--evo` + parser posicional perfil+flag
- [x] `04-engine` — motor genera bloque `evo`
- [x] `05-draconic-reject` — `chart draconic --evo` rechazado
- [x] `06-delete-soul` — borrar `soul` + migrar tests/help
- [x] `07-tests` — tests AXI y bordes
- [x] `08-check` — check:docs + test + check verdes

## Fog / notas

- Bloqueante principal: hoy `chart natal <profile> --evo` es rechazado por
  `resolveRequest` (`src/commands/chart.ts:391-401` y `:404-413`).
- `soul` no es importado por ningún otro comando de `src/` (solo router y tests);
  el impacto real está en `cli.ts`, `profile.ts` (help), `profile.test.ts`.
