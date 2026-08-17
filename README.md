# lumen

Mi instrumento de evolución: astrología evolutiva (Green + Forrest) desde la terminal.

## Instalar dependencias

```bash
bun install
```

## Comandos AXI

```bash
# Carta natal base + mecánica evolutiva completa (Plutón/PPP + eje nodal + eclipses prenatales)
bun run bin/lumen.ts chart natal silvia
bun run bin/lumen.ts chart natal silvia --evo

# Progresiones secundarias y estaciones planetarias
bun run bin/lumen.ts journey progressed silvia --at 2026-08-13
bun run bin/lumen.ts journey stations silvia --body mercury --from 2026-01-01 --to 2026-12-31 --limit 30

# Sinastría evolutiva entre dos Almas
bun run bin/lumen.ts karma pair --a erik --b kary --orb 3

# Perfiles locales de nacimiento (reseñados por chart/journey/karma)
bun run bin/lumen.ts profile add erik --when "1981-01-26T00:50" --place "Magangué, Colombia"
bun run bin/lumen.ts profile list
bun run bin/lumen.ts profile show erik
bun run bin/lumen.ts profile remove erik

# Carta natal (insumo base; `--evo` agrega la mecánica evolutiva) y proyección draconic (experimento etiquetado)
bun run bin/lumen.ts chart natal --when "1981-01-26T00:50" --place "Magangué, Colombia"
bun run bin/lumen.ts chart draconic --when "1981-01-26T00:50" --place "Magangué, Colombia"
```

## Privacidad

- Los perfiles viven en `~/.config/lumen/lumen.db` (bun:sqlite embebido, permisos `0600`, migraciones con `PRAGMA user_version`).
- Las opciones de carta por defecto viven en `~/.config/lumen/config.json` (sistema de casas); un flag en la línea de comandos gana a la config.
- `lumen profile list` y el Home solo muestran `id` y estado de nacimiento (`ok | ambiguous | nonexistent`): nunca fechas de nacimiento.
- `lumen profile show <id>` es el único comando que expone los datos natales completos.

## Integración de sesión

```bash
bun run build
./dist/lumen setup hooks
```

## Desarrollo

```bash
bun run typecheck
bun run check
bun test
bun run build
```
