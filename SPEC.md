# Especificación Técnica de Implementación: Lumen (JWG + AXI)

## 1. Resumen y Objetivos
Migrar la arquitectura actual de Lumen hacia una estructura de **Módulos Profundos sin ceremonia**, garantizando:
1. **Pureza de `core/`**: Cero I/O en cálculo astrológico. `adapters/geocode.ts` y `adapters/ephemeris-gateway.ts` aíslan la red y Caelus.
2. **Ciclo de Consulta (`lumen consulta`)**: Nuevo módulo de expedientes clínicos basado en hipótesis (`H1`, `H2`) y respuestas tipadas con persistencia segura (`0600`).
3. **Gramática AXI en Comandos**: `soul`, `journey`, `karma`, `consulta`, `client`, `classical` y `setup` con salidas TOON compactas y estados vacíos explícitos.
4. **Cero regresiones**: Mantener los 141 tests pasando y soportar alias retrocompatibles (`profile` ➔ `client`).

---

## 2. Fases de Implementación (Tracer Bullets)

### Fase 1: Fronteras de Pureza y Adaptadores
- **`src/core/types.ts`**: Definir tipos canónicos de dominio (`ResolvedBirth`, `BirthProvenance`, `EAChart`, `ConsultationSession`, `Hypothesis`).
- **`src/core/birth.ts`**: Lógica matemática pura de zonas horarias, cálculo a UT Julian Day y validación de rangos sin dependencias de red.
- **`src/adapters/geocode.ts`**: Extracción del geocoding de Open-Meteo fuera de core, implementando interfaz de `birth.ts` con soporte de mocks para tests.

### Fase 2: Módulos Profundos del Motor Evolutivo (`core/`)
- **`src/core/soul.ts`**: Cálculo del paradigma de Plutón, Punto de Polaridad (con desactivación si conjunción con Nodo Norte), Midpoint Plutón-Nodo Norte y conteo de aspectos estresantes/fluidos.
- **`src/core/nodes.ts`**: Eje nodal, regentes natales, detección estricta de Pasos Omitidos (*Skipped Steps*, orbe ≤ 5°) y cadenas de dispositores de los regentes nodales.
- **`src/core/phases.ts`**: Fases Sol-Luna natales y secundarias progresadas (las 8 fases arquetípicas).
- **`src/core/journey.ts`**: Motor de progresiones secundarias día-por-año (con contactos a puntos EA en orbe ≤ 3°) y búsqueda de estaciones planetarias.
- **`src/core/karma.ts`**: Motor de sinastría evolutiva pura (contactos cruzados inter-cartas a Plutón/Nodos y superposición de casas nodales).
- **`src/core/classical.ts`**: Proyecciones técnicas auxiliares (Dracónica, lots herméticos, estrellas fijas).

### Fase 3: Capa de Almacenamiento Clínico (`storage/`)
- **`src/storage/client-store.ts`**: Gestión de `~/.config/lumen/profiles.json` (XDG compliance, permisos 0600, escritura atómica tmp+rename, alias `profile` / `client`).
- **`src/storage/consultation-store.ts`**: Expedientes clínicos en `~/.config/lumen/consultations.json` (sesiones `open` / `closed`, hipótesis, confirmaciones y notas).

### Fase 4: Comandos AXI (`commands/`)
- **`src/commands/soul.ts`**: Adaptador CLI para `lumen soul <client>` con salida TOON precomputada.
- **`src/commands/journey.ts`**: Subcomandos `progressed` y `stations` con flags unívocos.
- **`src/commands/karma.ts`**: `pair --a <id> --b <id>` con vacíos explícitos.
- **`src/commands/consulta.ts`**: Subcomandos `abrir`, `preparar`, `leer`, `confirmar`, `cerrar`.
- **`src/commands/client.ts`**: `add`, `list`, `show`, `remove` (con alias `profileCommand`).
- **`src/commands/classical.ts`**: `chart`, `draconic`, `synastry`.
- **`src/commands/setup.ts`**: `lumen setup hooks`.

### Fase 5: Integración y Suite de Pruebas
- **`src/cli.ts`**: Router con `axi-sdk-js`, contexto inyectado y Home con agenda de consultas activas (sin exponer datos biográficos).
- **`tests/`**: Migración y expansión de tests unitarios y de integración para cada módulo y comando.

---

## 3. Criterios de Aceptación (Definición de Terminado)
1. `bun test` ejecuta el 100% de los tests en verde sin errores de tipo ni regresiones.
2. `bun x biome check src/` pasa con 0 errores y 0 warnings.
3. Ningún archivo en `src/core/` realiza llamadas de red, filesystem o importa desde `src/adapters/` o `src/cli/`.
4. El comando `lumen consulta` permite abrir, preparar hipótesis (`H1`, `H2`), confirmarlas y cerrar sesiones con idempotencia demostrada en tests.
