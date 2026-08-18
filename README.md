# lumen

lumen v2 — gestor de perfiles de nacimiento (CLI AXI).

lumen es un **CLI AXI**: su consumidor principal es un agente de IA. El humano
conversa con el agente y le da la ciudad/país y la fecha y hora local de
nacimiento; el agente resuelve coordenadas y offset UTC y llama a lumen. lumen
valida, calcula el Julian Day (Meeus, aritmética pura) y persiste el perfil.

## Instalar dependencias

```bash
bun install
```

## Uso

```bash
# Alta de un perfil de nacimiento (hora local + offset UTC + coordenadas + ciudad)
bun run bin/lumen.ts profile add --when "1981-01-26T00:50" --offset 60 --at "9.15,-74.75" --city "Magangué, Colombia" --name silvia

# Listar, ver y eliminar
bun run bin/lumen.ts profile list
bun run bin/lumen.ts profile get <uuid>
bun run bin/lumen.ts profile rm <uuid>
```

- `add` **deduplica por nacimiento**: el mismo jdUt + coordenadas devuelve el
  perfil existente.
- Los ids son **UUID auto-generados**; `get`/`rm` solo aceptan el UUID.
- Mensajes y errores en inglés; salida en **TOON** (Token-Oriented Object
  Notation) con la política de precisión lumen (jdUt a 6 decimales, lat/lon a 4).

## Persistencia

- La DB vive en `./lumen.db` del directorio de trabajo (per-project), o en la
  ruta de `LUMEN_DB` si se define.
- Se crea **perezosamente**: solo `add` crea el archivo.
- Permisos `0600`, journal de rollback (sin WAL), migraciones por
  `PRAGMA user_version`.
- `lumen.db` está en `.gitignore` (es dato per-project).

## Dependencias

- Runtime: `axi-sdk-js` (framework AXI + convención de errores).
- Dev: `@biomejs/biome`, `@types/bun`; peer: `typescript`.

## Desarrollo

```bash
bun run typecheck
bun run check
bun test
bun run build
```