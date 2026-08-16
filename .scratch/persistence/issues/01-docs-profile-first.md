---
id: 01-docs-profile-first
title: 'docs primero — DOMAIN, README, SPEC, CONTEXT y docs/ al target (profile/lumen.db)'
status: resolved
blockers: []
---

**Objetivo**: antes de mover código, los 8 docs que describen el mundo viejo se
reescriben al target acordado (`profile` reemplaza a `client`, store
`lumen.db`/bun:sqlite, `config.json`, `consulta` intacto). Los tickets de
implementación 02+ entregan contra docs ya actualizados — así el código nunca
corre delante de la especificación.

## Tareas

Actualizar sea el móvil exacto (los archivos no cambian de nombre; solo el
contenido):

1. **`README.md`**: sección "Gestión local de clientes" → `profile add|list|
   show|remove` con los mismos ejemplos; sección Privacidad (`lumen client
   list`/`show` → `lumen profile …`, stores JSON → `lumen.db` bun:sqlite
   `0600`); ejemplos `script example` de `client add erick` → `profile add
   erick`.
2. **`DOMAIN.md`**: árbol §1 (`src/storage/`): `client-store.ts` (con
   retrocompatibilidad) → `profile-store.ts` (bun:sqlite lumen.db, `user_version`)
   + `config.ts`; `consultation-store.ts` intacto. `commands/`: `client.ts` →
   `profile.ts` (add|list|show|remove; intake natal compartido en `intake.ts`).
   Catálogo §2: sección A `lumen soul <client>` → `<profile>` (y `client:` →
   `profile:` en los ejemplos TOON); B y C igual; E `lumen client <action>` →
   `lumen profile <action>` (add/list/show/remove, mismas garantías, incluye
   `profile list` privacidad); sección D (`consulta`) NO se toca — mundo aparte
   (Q10), su `<client>` sigue válido en la gramática de consulta.
3. **`SPEC.md`**: §2 tabla "src/commands/" y nota "La validación zod vive
   únicamente en el seam de intake (`src/commands/client.ts`)" → `intake.ts`;
   §3 superficie: línea `client` → `profile` ("perfiles locales (privacidad
   0600, lumen.db)"; 7 comandos sigue); contador de tests §6.1 se recalibra en
   el ticket 04.
4. **`CONTEXT.md`**: "Lives in `src/commands/client.ts` (the only zod contact
   point)" → `src/commands/intake.ts`; mención de `client` en lenguaje de
   dominio solo si sigue siendo precisa (consulta).
5. **`docs/agents/domain.md`**: espejo de DOMAIN.md — mismo árbol y catálogo
   (`<client>` → `<profile>`, `client.ts` → `profile.ts` + `intake.ts`); nota
   "alias profile" de la línea de `client.ts` se resuelve: el comando se llama
   `profile`, sin alias.
6. **`docs/spec-evolutionary-module.md`**: "la entrada de flags vive en
   `src/commands/client.ts`" → `src/commands/intake.ts`.
7. **`docs/adr/0001-zod-at-intake-…`**: la ruta del seam zod
   (`src/commands/client.ts`) → `src/commands/intake.ts` (el ADR se queda: zod
   sigue en el seam de intake, solo cambia el archivo).
8. **`docs/adr/0004-el-norte-de-lumen.md`**: "los seres de la práctica
   (`client`)" → "los seres de la práctica (`profile`)".
9. Cierre: `rg -i "client|client-store|clients\.json|Atomic" README.md
   DOMAIN.md SPEC.md CONTEXT.md docs/` → los únicos hits legítimos son la
   gramática de `consulta` (sección D, mundo aparte) y cielo; si aparece
   `client` como entidad de persona/sp? → seguir buscando.

## Criterios de aceptación

- Cero menciones de `client` como entidad de persona en README/DOMAIN/SPEC/
  CONTEXT/domain.md, salvo `consulta`.
- Los 8 docs describen: `lumen profile add|list|show|remove`, `lumen.db`
  (bun:sqlite, `0600`, `user_version`), `config.json` (sistema de casas/nodos,
  flag gana), `consultations.json` intacto.
- `bun test` / `typecheck` en verde; `biome check .` limpio. `check:docs`
  quedará rojo hasta el ticket 05 (ver Comments) — aquí es rojo esperado, no
  hay que forzarlo a verde.

## Comments

- Spec: `.scratch/persistence/spec.md` (Q4/Q10/Q11/Q12) + decisión del usuario:
  "antes de implementar, hay que actualizar los docs".
- Sin blockers; es el primero de la cadena. Ningún ticket de implementación
  empieza hasta que esté resuelto.
- Al reescribir los docs, `bun run check:docs` pasa a estado **rojo esperado**
  (los docs describen el target que el código aún no alcanza: `profile`,
  `lumen.db`, `intake.ts`). Vuelve a verde al cerrar el ticket 05. No forzar su
  verde aquí; solo cerrar con `bun test`/`typecheck`/`biome check` limpios
  (correr `biome check .` sin el `&& check:docs` si hace falta).