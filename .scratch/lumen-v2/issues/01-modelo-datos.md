# 01 — Modelo de datos del profile v2

Type: grilling
Status: resolved

## Question

¿Qué es exactamente un profile en lumen v2?

- Campos del birth: jdUt, lat, lon, local (fecha/hora), offsetMinutes, status… — ¿cuáles se persisten y cuáles se derivan?
- Forma y validación del id (slug aportado por el agente, como hoy: `erik`).
- Contrato de entrada validado de `profile add`: hora local + offset (minutos) + lat/lon; rangos y reglas (offset ±840′, fechas válidas).
- Sin metadatos (decisión de charting). El cálculo del jdUt se fija en 02; aquí se decide qué campos existen.

Cierra este ticket cuando el modelo de datos y el contrato de entrada estén escritos sin ambigüedad.

## Answer

Resuelto en grilling (2026-08-18).

**Profile v2**
- `id`: **UUID auto-generado** por lumen (único, opaco). Sin slug aportado.
- `name?`: opcional, **descriptivo, sin unicidad ni lookup** (solo display).
- `city`: **requerido**, descriptivo — lugar legible (p. ej. `"Madrid, Spain"`), aportado por el agente y guardado tal cual. *(Enmienda resuelta en 04: el humano siempre da ciudad + país; el agente resuelve lat/lon/offset desde ahí.)*
- `birth`:
  - **Entrada original persistida**: `local {year, month, day, hour, minute}` (sin segundos), `offsetMinutes`, `lat`, `lon`.
  - **`jdUt`**: valor canónico derivado, calculado por lumen (fórmula Meeus — ticket 02).
- **Sin `status` / `zone` / `dst`**: eliminados del modelo (sin resolución de timezone no tienen sentido).

**Contrato de entrada de `profile add`** (hora local + offset + lat/lon)
- Validación adoptada del research 02: offset −840..+840; año 1800–2100; mes 1–12; día válido por aritmética pura (bisiesto gregoriano); hora 0–23; minuto 0–59; lat −90..90; lon −180..180. Sin segundos.
- **Semántica de `add`**: deduplica por nacimiento — si ya existe un profile con el mismo nacimiento resuelto (mismo jdUt + coords), devuelve el existente. Consecuencia: el `name` del segundo `add` se descarta si el nacimiento ya existe (el nacimiento es la identidad).
- No hay upsert por id (el UUID es auto); cada nacimiento nuevo crea un profile nuevo.
