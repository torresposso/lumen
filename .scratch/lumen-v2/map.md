# Lumen v2 — Mapa

Esfuerzo: rediseño del proyecto desde cero con pivot a gestor de perfiles de nacimiento (AXI CLI).

## Destination

Una spec de **lumen v2** lista para implementar sin más decisiones: un CLI AXI de gestión de perfiles de nacimiento — `lumen profile add|list|get|rm` sobre una DB SQLite `./lumen.db` per-project. Contrato de entrada: hora local + offset (minutos) + lat/lon; el Julian Day lo calcula lumen (aritmética pura). Salida TOON, convenciones AXI. La astrología (chart, evo, journey, karma, draconic, projection…) queda fuera del producto.

## Notes

- Dominio: perfiles de nacimiento (id + birth resuelto). Sin astrología.
- Stack: Bun + TypeScript + axi-sdk-js. Sin caelus / caelus-birth / geocoder / config store (a confirmar en el ticket 02).
- Consumidor principal: un agente de IA (AXI CLI). El humano conversa con el agente; lumen es la interfaz determinista: valida y persiste, nunca calcula facts del mundo.
- Skills por sesión: grilling + domain-modeling (default); research para 02; prototype para 03 y 04.
- Decisiones de charting (cerradas, no reabrir): pivot a solo profiles; corte radical (el CLI también se rediseña); sin migración de datos v1; DB per-project `./lumen.db` en el cwd; contrato de entrada "hora local + offset"; salida TOON; solo comandos de profile.
- Errores/UX: convenciones AXI (códigos de error, sugerencias accionables).

## Decisions so far

<!-- el índice — una línea por ticket cerrado: suficiente para juzgar relevancia, luego el enlace para el detalle -->

- [Modelo de datos del profile v2](issues/01-modelo-datos.md) — profile = {UUID auto, name opcional sin lookup, birth: entrada (local sin segundos + offset + lat/lon) + jdUt derivado por Meeus}; sin status/zone/dst; `add` deduplica por nacimiento (jdUt + coords); validación del research 02 (offset ±840, año 1800–2100, día por aritmética pura).
- [Cálculo a Julian Day y árbol de dependencias](issues/02-calculo-jd-y-deps.md) — jdUt con Meeus ch. 7 en aritmética pura (bit-idéntico a caelus, 14/14 vectores); validación a mano; deps finales: `axi-sdk-js` + dev/peer; se eliminan `caelus`, `caelus-birth`, `zod` y `luxon`.
- [Schema SQLite y archivo de la DB](issues/03-schema-y-archivo-db.md) — columnas planas (+ `city` NOT NULL, enmienda de 04); dedupe por UNIQUE INDEX (jd_ut, lat, lon) con ON CONFLICT; creación lazy solo en `add`; override `LUMEN_DB`; convenciones v1 (0600, rollback journal, user_version=1).
- [Superficie CLI v2](issues/04-cli-superficie.md) — `add` con `--when --offset --at --city --name` (city requerido y legible, name opcional); `get`/`rm` por UUID; salida solo TOON (jdUt 6, lat/lon 4 — display only); mensajes en inglés; errores AXI (VALIDATION_ERROR / NOT_FOUND / PROFILE_ERROR).
- [Estrategia de tests v2](issues/05-tests.md) — tres suites sobre `bun test` (jd: 14 vectores + validaciones; profile-store: CRUD/dedupe/lazy/permisos/migración; cli: contrato/errores/TOON/UUID); v1: reescribir profile-store + cli, descartar el resto.

---

**🏁 Destino alcanzado (2026-08-18):** las 5 decisiones están cerradas y el camino es claro — la spec de hand-off está en [`spec.md`](spec.md). No quedan tickets ni fog.

## Not yet specified

*(Vacío — todo el fog se graduó en tickets cerrados; destino alcanzado 2026-08-18.)*

## Out of scope

- **Toda la astrología** — charts, reading, evo-criteria, evolutionary-reading, journey, karma, projection, soul, classical, nodes, phases, ephemeris-gateway, y los ADRs/decisiones asociados (precisión, draconic, etc.). Pivot confirmado: no vuelven.
- Geocoding (Open-Meteo) y resolución de timezone — las resuelve el agente.
- Migración de datos v1 (`~/.config/lumen/lumen.db`) — se empieza limpio.
- Config store v1 (opciones de carta) y comandos no-profile (`setup`, `chart`, `journey`, `karma`, `intake`).
- La implementación del rebuild — el mapa decide; un esfuerzo aparte ejecuta (la `spec.md` es el hand-off).
