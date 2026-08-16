# lumen

Mi instrumento de evolución: astrología evolutiva (Green + Forrest) desde la terminal.

## Instalar dependencias

```bash
bun install
```

## Comandos AXI

```bash
# Radiografía evolutiva del Alma (también acepta flags de nacimiento inline)
# --full incluye cadenas de dispositores completas y eclipses prenatales
bun run bin/lumen.ts soul silvia
bun run bin/lumen.ts soul silvia --full

# Progresiones secundarias y estaciones planetarias
bun run bin/lumen.ts journey progressed silvia --at 2026-08-13
bun run bin/lumen.ts journey stations silvia --body mercury --from 2026-01-01 --to 2026-12-31 --limit 30

# Sinastría evolutiva entre dos Almas
bun run bin/lumen.ts karma pair --a erik --b kary --orb 3

# Ciclo de consulta clínica
bun run bin/lumen.ts consulta abrir silvia --motivo "Reorientación vocacional"
bun run bin/lumen.ts consulta preparar silvia
bun run bin/lumen.ts consulta confirmar silvia --hipotesis H1 --respuesta reliving
bun run bin/lumen.ts consulta leer silvia --capa preguntas
bun run bin/lumen.ts consulta cerrar silvia --sintesis "..." --tarea "..."

# Gestión local de clientes
bun run bin/lumen.ts client add erik --when "1981-01-26T00:50" --place "Magangué, Colombia"
bun run bin/lumen.ts client list
bun run bin/lumen.ts client show erik
bun run bin/lumen.ts client remove erik

# Andamiaje técnico (chart = insumo base; draconic = experimento fuera del canon)
bun run bin/lumen.ts classical chart --when "1981-01-26T00:50" --place "Magangué, Colombia"
bun run bin/lumen.ts classical draconic --when "1981-01-26T00:50" --place "Magangué, Colombia"
```

## Privacidad

- Los stores viven en `~/.config/lumen/` con permisos `0600` y escritura atómica (`tmp + rename`).
- `lumen client list` y el Home solo muestran `id`, `provenance` y estado de sesión: nunca fechas de nacimiento.
- `lumen client show <id>` es el único comando que expone los datos natales completos.

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
