# 7. `chart natal --evo`: mecánica evolutiva en la carta

* Status: accepted
* Deciders: Erick
* Date: 2026-08-16

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí — integrar Plutón/PPP y el eje nodal en `chart natal`
hace que una sola llamada entregue la carta y su mecánica evolutiva, quitando la
ruta duplicada de `soul` y acercando la práctica al norte: leer mi propia carta
y las de mi familia.

## Contexto

- Lumen tiene 6 comandos; `soul` entrega lectura evolutiva con su propia
  llamada a `CaelusEphemeris.chartAt()`, duplicando el cálculo de `chart natal`.
- El capitán quiere que la carta natal pueda mostrar la mecánica evolutiva
  (Plutón/PPP y eje nodal) sin un segundo comando, de forma geométrica y sin
  interpretación.
- AXI favorece default mínimo y llamadas predecibles para el agente: un flag
  opt-in completo es mejor que dos flags o un segundo comando.

## Decisión

- **`chart natal <profile> --evo`** agrega el bloque `evo` completo:
  Plutón (signo/casa/retro/counts/aspectos), PPP (signo/casa/active/aspectos),
  midpoint, eje nodal (norte/sur, regentes, motion, skipped steps, aspects),
  fase Sol-Luna, cadenas de dispositores y eclipses prenatales.
- **Sin `--full`**: el bloque `evo` entrega todo en una sola llamada.
- **`chart natal` sin flags sigue exactamente igual** (output actual).
- **`chart draconic` rechaza `--evo`** con error estructurado.
- **`soul` se elimina** de la superficie; `chart natal --evo` lo reemplaza.
  Sin alias, sin deprecación.
- `phase` vive dentro de `evo`, no en el output base.
- `interpretationContext` se mantiene como está (átomos factuales para LLM).

## Consecuencias

- Superficie final: 5 comandos (`journey`, `karma`, `profile`, `chart`, `setup`).
- SPEC §3, DOMAIN, CONTEXT y README se actualizan al target (ticket `02-docs-evo`).
- El parser posicional de `chart` debe aceptar `chart natal <profile> --evo`
  (hoy lo rechaza).
- `AstrologicalEngine.compute()` acepta una selección de output (`{ evo: boolean }`)
  sin extender `NatalRequest`.

## Alternativas

- Mantener `soul` separado: conserva la duplicación de `chartAt`.
- Dos flags (`--pluto-mechanics` + `--nodal-axis`): más gramática para el agente.
- `--full` en `chart`: añade una segunda vía de detalle innecesaria cuando el
  bloque `evo` es opt-in y ya entrega todo.
