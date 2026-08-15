# lumen

Astrología evolutiva computacional desde la terminal.

## Instalar dependencias

```bash
bun install
```

## Uso

```bash
# Lectura evolutiva completa (default)
bun run bin/lumen.ts chart --when "1981-01-26T00:50" --place "Magangué, Colombia"

# Carta natal base
bun run bin/lumen.ts chart natal --when "1981-01-26T00:50" --place "Magangué, Colombia"

# Carta draconic con lectura evolutiva
bun run bin/lumen.ts chart draconic --when "1981-01-26T00:50" --place "Magangué, Colombia"
```

## Perfiles y sinastría

```bash
bun run bin/lumen.ts profile add erik --when "1981-01-26T00:50" --place "Magangué, Colombia"
bun run bin/lumen.ts profile add kary --when "1987-03-14T06:10" --place "Bogotá, Colombia"

bun run bin/lumen.ts profile list
bun run bin/lumen.ts chart --profile erik

# Natal vs draconic de la misma persona
bun run bin/lumen.ts synastry self --profile erik

# Sinastría entre dos personas
bun run bin/lumen.ts synastry pair --a erik --b kary
bun run bin/lumen.ts synastry pair --a erik --b kary --focus all --full
```

## Tiempo

```bash
bun run bin/lumen.ts timing progressed --profile erik --date 2026-08-13
bun run bin/lumen.ts timing stations --profile erik --body mercury --years 1
```

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
