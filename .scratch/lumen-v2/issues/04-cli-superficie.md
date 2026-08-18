# 04 — Superficie CLI v2

Type: prototype
Status: resolved
Blocked by: 01

## Question

¿Cómo se ve exactamente la superficie `lumen profile add|list|get|rm`?

- Flags y contrato de entrada de `add` (per 01), argumentos de `list`/`get`/`rm`.
- Salida TOON: política de formato de números y layout de cada comando; ¿`--json` para el agente (con redondeos TOON aplicados)?
- Mensajes y errores AXI: códigos, sugerencias accionables, idioma (¿español o inglés?).
- Prototipo: sesión de ejemplo de los 4 comandos (entrada/salida).

## Answer

Resuelto (2026-08-18). Prototipo aprobado con ajustes.

**Superficie**: `lumen profile add|list|get|rm`.

**Contrato de `add`** (strings compactos):
- `--when "YYYY-MM-DDTHH:MM"` — fecha/hora local (sin segundos), validado per 01/02.
- `--offset ±N` — offset UTC en minutos (entero, −840..+840).
- `--at "lat,lon"` — coordenadas (lat −90..90, lon −180..180).
- `--city "<lugar legible>"` — **requerido** (p. ej. `"Madrid, Spain"`); el humano siempre da ciudad + país, el agente resuelve lat/lon/offset y el lugar se guarda legible.
- `--name <slug>` — opcional, descriptivo (sin lookup).
- La salida de `add` incluye el **UUID generado** (el agente lo rastrea para `get`/`rm`).

**`get`/`rm`**: por UUID únicamente (sin lookup por nombre ni city — decisión 01).

**Salida**: **solo TOON** (sin `--json`); el agente parsea el texto. Política TOON centralizada en `toon.ts`: `jdUt` a 6 decimales, `lat`/`lon` a 4, `offset` entero en minutos — display only; la DB conserva precisión completa.

**Idioma**: inglés (como v1).

**Errores AXI**: `VALIDATION_ERROR` (input inválido, citando la regla violada), `NOT_FOUND` (`get`/`rm` de UUID inexistente), `PROFILE_ERROR` (fallo de store, p. ej. cwd no escribible).
