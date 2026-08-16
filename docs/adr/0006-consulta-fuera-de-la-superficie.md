# ADR-0006: `consulta` fuera de la superficie del practicante

* Status: accepted
* Deciders: Erick, opencode
* Date: 2026-08-16

## El norte

¿Sirve a mi Nodo Norte (Leo, casa 10, conj. MC — aplicar la astrología
evolutiva con otros)? Sí y no: cortar `consulta` no quita la aplicación con
otros (sigue `karma pair` y el guardado de perfiles), pero sí elimina el
aparato de expedientes clínicos que no está en el uso real. La pregunta del
sur "¿cómo dialogo con esto?" ya la responde la conversación con el agente.

## Contexto

- El norte cerrado el 2026-08-15 (ADR-0004) incluía `consulta` en la
  superficie: "¿cómo dialogo con esto? Expedientes, hipótesis (H1, H2) y
  diálogo".
- Persistence (Q10) dejó `consulta` como mundo aparte con su store
  (`consultations.json`) y su gramática por `clientId`.
- Tras el grill del norte, el capitán decide: **la entidad de persona es
  `profile`; nada de `client` ni de `consulta`**. El guardado de personas con
  `profile` (SQLite) se queda.
- El guardarraíl pide toda decisión de alcance con ticket del norte; cortar
  de la superficie requiere ADR.

## Decisión

- `consulta` desaparece por completo: comando (`src/commands/consulta.ts`),
  store (`src/storage/consultation-store.ts`), sus tests y las claves de datos
  (`clientId`, `session`, `hipotesis`).
- CliContext pierde `consultations`; el Home queda solo con `profiles`
  (`id` + `provenance`), sin agenda ni estados de sesión.
- Se elimina `EAChart` (muerto desde la muerte de `client`; era su único
  sentido) y la sección "Consultation & Clinical Tracking Types" de
  `src/core/types.ts` (`ConsultationStatus`, `Hypothesis`,
  `ConsultationSession`, enums de respuesta).
- Superficie final: **6 comandos** — `soul`, `journey`, `karma`, `profile`,
  `chart`, `setup`.
- Docs: DOMAIN.md (y su espejo `docs/agents/domain.md`) pierden §2-D y el
  árbol pierde `consultation-store.ts`/`consulta.ts`; invariante
  "Privacidad de Grado Clínico" → **"Privacidad de los datos personales"**
  (nacimiento `0600`); README pierde el ciclo de consulta clínica; CONTEXT
  y SPEC ganan la superficie de 6; §6.1 recalibrado a 175 tests / 557 expect.

## Consecuencias

- Superficie más pequeña; "¿cómo dialogo con esto?" lo responde el agente en
  conversación, no el CLI.
- La voz `client` desaparece de código, tests y docs vivos (ADR-0004 y
  ADR-0005 quedan como registro histórico).
- ADR-0004 sigue vigente para el norte; su lista de superficie queda
  modificada por este ADR.

## Alternativas

- Mantener `consulta` dormido: deja deuda conceptual y el vocabulario
  `client` en la superficie — contra la decisión del capitán.
- Renombrar `consulta` a voz `profile`: no cambia que el ciclo de hipótesis
  clínicas no está en el uso real.