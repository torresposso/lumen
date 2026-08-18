# 02 — Cálculo a Julian Day y árbol de dependencias

Type: research
Status: resolved
Blocked by: 01

## Question

¿Cómo calcula lumen el jdUt desde hora local + offset sin caelus-birth?

- Fórmula estándar en aritmética pura (p. ej. Fliegel–Van Flandern / Meeus) — verificar exactitud en rangos de fechas habituales (1900–2100) y casos límite (calendario gregoriano proléptico, horas con decimales).
- Validaciones del contrato de 01: rango de fechas, offset ±840 minutos.
- Árbol de dependencias final: axi-sdk-js (sí), zod (¿se usa para validar el contrato de entrada?), caelus / caelus-birth (¿salen del package.json?), luxon (no es dep directa — confirmar).

**Nota de charting:** la investigación de hechos puede correr en paralelo con 01 (no depende de su respuesta); la decisión final de dependencias (zod) sí depende del contrato de 01, así que este ticket se resuelve después de 01.

## Answer

Resuelto (2026-08-18). Hechos del research (rama `research/calculo-jd-y-deps`, hallazgos en `research/calculo-jd-y-deps.md`) + decisión de zod.

**Cálculo JD**: fórmula **Meeus, *Astronomical Algorithms* ch. 7**, aritmética pura — la misma que caelus usa (`julianDay`); lumen v2 produce jdUt bit-idénticos a v1. 14/14 vectores PASS; 0 discrepancias vs caelus en 3.096 muestras (1800–2100). Sin dependencias de tiempo, sin tabla DST.

**Validación**: reglas adoptadas en el ticket 01 (offset ±840, año 1800–2100, día por aritmética pura, hora 0–23, minuto 0–59, lat ±90, lon ±180) — validación a mano, sin zod.

**Árbol de dependencias final**:
- Runtime: `axi-sdk-js` (framework AXI + AxiError).
- Dev/peer: `@types/bun`, `@biomejs/biome`, `typescript`.
- **Eliminados**: `caelus`, `caelus-birth` (nada del corte los necesita; jdUt con Meeus puro), `zod` (**decisión: eliminar** — el contrato de ~7 campos se valida a mano, ~30 líneas; chart natal no vuelve y validar salida interna no es caso para zod), `luxon` (solo transitoria de caelus-birth; se va sola).

## Comments

- **2026-08-18 — investigación completada** (subagente; rama `research/calculo-jd-y-deps`, hallazgos en `research/calculo-jd-y-deps.md`, sin merge). Hechos: fórmula Meeus ch. 7 (aritmética pura, bit-idéntica a `julianDay` de caelus; 14/14 vectores PASS, 0 discrepancias vs caelus en 1800–2100); reglas de validación concretas (offset ±840, año 1800–2100, día válido por aritmética pura — el chequeo `Date.UTC` actual tiene el footgun de años 0–99 → siglo XX); deps: quitar `caelus`, `caelus-birth` (y `luxon`, solo transitoria), quitar `zod` (recomendación — se confirma con 01), mantener `axi-sdk-js` + dev/peer deps. El `status`/`zone`/`dst` de `ResolvedBirth` v1 dejan de tener sentido: decide 01 si sobreviven.
