# Audit: congruencia astrológica de `chart natal` con y sin `--evo`

> **Estado**: Resuelto — fixes aplicados y re-verificados (2026-08-16).

- **Datos**: Erik — 1981-01-26 00:51 local, Magangué, Colombia.
- **Geocodificado**: lat `9.24202`, lon `-74.75467`, tz `America/Bogota`, status `ok`.
- **JD UT**: `2444630.7437`.
- **Carta**: placidus, tropical, nodo verdadero.

## Veredicto

- **Sin `--evo`**: coherente. El output es idéntico al previo a la feature (verificado byte a byte tras quitar el bloque `evo`).
- **Con `--evo`**: las posiciones y puntos derivados son coherentes con la carta base, pero hay **1 bug crítico** (fases de aspectos de Plutón invertidas) y **1 decisión astrológica ambigua** (midpoint lejano vs. cercano).

---

## 1. Identidad base ↔ base+evo

`JSON(base)` y `JSON(evo sin bloque evo)` son idénticos: `true`.

- Claves base: `chart`, `summary`, `interpretationContext`.
- Claves con flag: `chart`, `summary`, `evo`, `interpretationContext`.

---

## 2. Checks que pasan

| Check | Resultado |
|---|---|
| Nacimiento eco | `1981-01-26 00:51`, America/Bogota, `ok` |
| Sol | Acuario 6°11' H3 |
| Luna | Libra 15°07' H11 |
| Plutón en base vs `evo.pluto` | Libra / H12 ✓ |
| `evo.pluto.retrograde` | `false` ✓ (speed `+0.000174`) |
| PPP = Plutón + 180° | Aries 24°20' H6 ✓ |
| PPP active | `true` ✓ (Plutón–NN = 73°26' > 10°) |
| Nodo Norte | Leo 10°54' H9 ✓ |
| Nodo Sur = NN + 180° | Acuario 10°54' H3 ✓ |
| Nodo motion | `direct` ✓ (true_node speed `+0.008547`) |
| Fase Sol-Luna | `Disseminating` ✓ (arco 248°56') |
| Skipped steps | Chiron square NN orb 2°30 ✓; resto fuera de orbe ✓ |
| Regentes nodales | NN Leo → Sol; SN Acuario → Urano ✓ |
| Cadenas de dispositores | coherentes con signos y regentes modernos ✓ |
| Eclipses prenatales | solar anular 1980-08-10 (Leo 18°16' H10); lunar penumbral 1981-01-20 (Leo 0°16' H9) ✓ |
| Signature/patterns/atoms | verificados independientemente: elementos, modalidades, cuadrantes, hemisferios ✓ |

---

## 3. Hallazgos

### F1 — CRÍTICO: fases de `evo.pluto.aspects` están invertidas

La carta base dice:

```text
chart.aspects:
  mercury trine pluto   phase: applying
  venus   square pluto  phase: applying
  mars    trine  pluto  phase: applying
  neptune sextile pluto phase: applying
```

`evo.pluto.aspects` dice para esos mismos contactos:

```text
phase: separating   (los 5)
```

**Causa**: `src/core/soul.ts`, `aspectPhase()`.

```ts
if ((relativeSpeed > 0 && delta < 0) || (relativeSpeed < 0 && delta > 0)) {
  return "applying";
}
```

La condición está invertida. Si el cuerpo es más rápido y el punto exacto está **adelante** (`delta > 0`), el aspecto se acerca (applying). Debería ser:

```ts
if ((relativeSpeed > 0 && delta > 0) || (relativeSpeed < 0 && delta < 0)) {
  return "applying";
}
```

**Impacto**: un agente que lea el mismo output recibe dos estados contradictorios para los mismos aspectos. Severidad crítica para congruencia.

### F2 — ALTO: midpoint Plutón–Nodo Norte usa el arco largo (far midpoint)

Datos:

- Plutón: 204°20'44"
- Nodo Norte: 130°54'21"

Salida actual:

```text
midpoint: Pisces 17°38' (H4)
```

Ese es el **midpoint lejano** (`Plutón + arco directo/2`, arco directo = 286°33').

El **midpoint cercano** (media angular estándar) es:

```text
Virgo 17°38'
```

`computeSoulReading()` usa `angularDistanceDirect()`, que es el arco contrarreloj; para este par entrega el punto sobre el arco largo. Si el canon de la feature es el midpoint habitual, hay que corregir. Si ambos son válidos, deberían publicarse los dos o documentarse.

### F3 — MEDIO: el set de aspectos/orbes de `evo` no coincide con `chart.aspects`

- La carta base trae **4** aspectos a Plutón.
- `evo.pluto.aspects` trae **5**: agrega `moon conjunction pluto` con orbe 9°12' (conjunción permitida a 10° en `PLUTO_ASPECTS`).

No es necesariamente un error (los orbes evolutivos de Plutón pueden ser más anchos), pero no está documentado. El agente verá `summary.aspects = 16` y `evo.pluto.aspects` con contactos que no existen en `chart.aspects`.

**Recomendación**: documentar en `help` o `CONTEXT`: “`evo` usa el set PLUTO_ASPECTS (orbe de conjunción/oposición 10°, etc.), distinto del set de aspectos de la carta base”.

### F4 — BAJO: Plutón queda excluido de los aspectos nodales

- `computeNodeAspects()` excluye `pluto`.
- `computePlutoAspects()` excluye nodos.

Por tanto, la relación angular Plutón–Nodo solo aparece indirectamente en `ppp.active` y en el midpoint; nunca como aspecto directo. Si es doctrina deliberada, documentar. Si no, considerar incluir Plutón en `nodeAspects` (o una lista separada `plutoNodeAspects`).

### F5 — BAJO: los puntos `evo` no son autocontenidos

`evo.pluto`, `evo.ppp`, `evo.nodalAxis.north/south` publican signo y casa, pero no longitud ni grado. Para auditar o que un agente razone con precisión, convendría incluir `signDeg` (y opcionalmente `lon`). La carta base los tiene, así que no es una incongruencia, pero el bloque `evo` depende de `chart` para el grado exacto.

---

## 4. Datos reales usados

```text
birth: 1981-01-26 00:51 America/Bogota (ok)
sun:    Aquarius 06°11' H3   lon 306.1962
moon:   Libra 15°07' H11     lon 195.1311
pluto:  Libra 24°20' H12     lon 204.3457 speed +0.000174
node:   Leo 10°54' H9        lon 130.9058 speed +0.008547
asc:    Scorpio 18°00'
ppp:    Aries 24°20' H6
phase:  Disseminating (248°56')
evo.midpoint: Virgo 17°38' (H10)   [near]
evo.antiMidpoint: Pisces 17°38' (H4)
solar eclipse prenatal: 2444462.2996 annular Leo 18°16' H10
lunar eclipse prenatal: 2444624.8264 penumbral Leo 0°16' H9
```

---

## 5. Estado tras los fixes (re-verificado con Erik)

| Hallazgo | Estado |
|---|---|
| F1 fases de Plutón | ✅ Corregido — las 5 son `applying` |
| F2 midpoint | ✅ `midpoint: Virgo 17°38' (H10)`, `antiMidpoint: Pisces 17°38' (H4)` |
| F3 orbes PLUTO_ASPECTS | ✅ Documentado en help/CONTEXT/DOMAIN |
| F4 Plutón en nodos | ✅ `north.aspects` incluye `pluto quintile` orb 1.4399; `skippedSteps` sin plutón |
| F5 evo autocontenido | ✅ `lon` + `signDeg` en pluto/ppp/north/south |

Verificación final: `bun test` 162/516, `bun run typecheck` OK, `bun run check` OK.
