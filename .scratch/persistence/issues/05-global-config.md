---
id: 05-global-config
title: 'config.json — defaults de opciones de carta (config global + flag gana)'
status: resolved
blockers: [03]
---

**Objetivo**: `src/storage/config.ts` — el default de opciones de carta que en
Q7 no vive ni en el perfil ni en los flags: sistema de casas y nodos por
defecto en una config global única, con precedencia flag > config > default
del schema.

## Tareas

1. `~/.config/lumen/config.json` (permisos `0600`, mismo dir que stores; si no
   existe → defaults). Lectura tolerante: archivo inválido → aviso y defaults,
   nunca rompe el arranque.
2. Campos: `houseSystem`, `node` (`both|mean|true`). Sin campos de cuerpos por
   ahora (el set estándar ya es el default del schema).
3. En el intake compartido (`src/commands/intake.ts`): construir `Chart-
   RequestOptions` con `flag > config > zod-default`; los flags explícitos
   siempre ganan a la config.
4. Tests `tests/storage/config.test.ts` (lectura default, archivo inválido,
   merge de precedencia) + un assert en `profile.test.ts` (`soul` usa el
   houseSystem de config cuando no hay flag).

## Criterios de aceptación

- Cambiar `houseSystem` en `config.json` cambia el output de `soul`/`chart`
  sin flags, y un `--house-system` en la línea de comandos gana a la config.
- `bun test` / `typecheck` / `check` en verde — **incluido `check:docs`**: es el
  ticket de cierre de la cadena, y aquí `check:docs` debe dejar de estar rojo
  (los docs del ticket 01 ya describen el target; el código ya convergió).

## Comments

- Spec: `.scratch/persistence/spec.md` (Q7 — "config global única o flag;
  el flag gana"). Fue el único punto cerrado como suposición en el grilling
  (asumido en el resumen, confirmado por el usuario).
- CERRADO 2026-08-16: `check:docs` verde — cierre de la cadena. Notas de la
  revisión (2 ejes, 0 violaciones duras, 0 requisitos faltantes tras corregir):
  1) El `0600` de config.json estaba sin aplicar (lumen nunca crea el archivo);
     se implementó espejando a profile-store: `chmodSync(0600)` best-effort en
     la lectura (nunca rompe el arranque) + assert de permisos en
     `config.test.ts`.
  2) El dropping por valor inválido (house system desconocido / node malo) con
     aviso individual excede literalmente "archivo inválido → aviso y
     defaults", pero es la misma postura tolerante — aceptado.
  3) `profile add --house-system <X>` se rechaza aunque `<X>` sea exactamente
     la config del usuario: es el comportamiento de Q7 (profile no guarda
     opciones), no un fallo de 05 — se deja documentado aquí.
  En vivo verificado: config `whole_sign` sin flag → houseSystem whole_sign;
  `--house-system equal` gana a la config; `node: mean` → chart con mean_node;
  config inválido → aviso y sigue funcionando. SPEC §6.1: 184 tests / 592.