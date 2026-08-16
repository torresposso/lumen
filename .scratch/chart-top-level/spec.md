# Spec: `chart` top-level (natal | draconic)

Decision record + scope for the surface change replacing `classical` with a
top-level `chart` command. Grill-with-docs session 2026-08-15.

## Decision (Q1, cerrada)

- `chart` sube a **top-level** con subcomandos explícitos `natal` y `draconic`.
- `classical` **desaparece** de la superficie (ADR-0004: "los nombres de
  escuela son etiquetas de docs, no puertas de código" — `classical` era una
  etiqueta de escuela como puerta).
- El modo `evolutionary` (default oculto de `lumen classical`, que duplicaba a
  `soul`) **muere**: el flag `--evolutionary` sale del intake; la lectura
  evolutiva vive solo en `soul` (mismo motor `computeEvolutionaryReading` en
  core, inmune).
- `chart draconic` = carta natal + proyección draconic, **sin lectura adjunta**
  (experimento puramente geométrico).
- Sin subcomando → usage (sin defaults silenciosos; SPEC §3 "sin comandos
  ocultos"). Subcomando desconocido → `VALIDATION_ERROR`.
- El flag `--draconic` también muere como flag de usuario (el subcomando es la
  puerta); el **campo** `options.draconic` queda (lo setea el despacho del
  subcomando para el motor).
- `lumen chart natal erick` con client guardado (posicional), `--profile <id>`,
  o flags inline — misma gramática que `soul`.
- `client add erick --when "1981-01-26T00:50" --place "Magangué, Colombia"` se
  ejecuta como parte del ticket para que `lumen chart natal erick` funcione el
  día uno.

## Decisiones diferidas (próxima sesión)

- **Q2**: ¿Erick es un *client* más o el instrumento necesita el concepto
  "self" (perfil del dueño)?
- **Q3**: ¿El store guarda solo a erick o también a la familia?
- **P1**: ¿Dónde vive el dato del dueño — ClientStore estándar (a), flag
  `self` en el store (b), o config separada (c)?
- **P2**: ¿El campo `options.evolutionary` muere del schema persistido
  (`isOptions` en client-store.ts)? Hoy 0 clientes → migración gratis; este
  ticket NO toca el schema persistido (los campos se quedan en el tipo).

## Blast radius

- `src/commands/classical.ts` → `src/commands/chart.ts` (despacho natal|draconic,
  motor sin sección evolutionary)
- `src/cli.ts` (registro + topLevelHelp + Home)
- `src/commands/client.ts` (intake: flags `--draconic`/`--evolutionary` fuera
  del spec; campos zod se quedan con default false — P2 diferido)
- Tests: `tests/commands/classical.test.ts` (muere), `tests/commands/chart.test.ts`
  (reescrito), `tests/commands/profile.test.ts`, `tests/cli/natal-intake.test.ts`
- SPEC §6.1 (recalibrar conteo de tests vía este ticket de remoción)