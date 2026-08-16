# Especificación Técnica de Implementación: Lumen (JWG + AXI)

## 1. Resumen y Objetivos
Migrar la arquitectura actual de Lumen hacia una estructura de **Módulos Profundos sin ceremonia**, garantizando:
1. **Pureza de `core/`**: Cero I/O en cálculo astrológico. `adapters/geocode.ts` y `adapters/ephemeris-gateway.ts` aíslan la red y Caelus.
2. **Ciclo de Consulta (`lumen consulta`)**: Nuevo módulo de expedientes clínicos basado en hipótesis (`H1`, `H2`) y respuestas tipadas con persistencia segura (`0600`).
3. **Gramática AXI en Comandos**: `soul`, `journey`, `karma`, `consulta`, `client`, `classical` y `setup` con salidas TOON compactas y estados vacíos explícitos.
4. **Cero regresiones**: Mantener los **186 tests** en verde y soportar alias retrocompatibles (`profile` ➔ `client`, `chart`/`synastry`/`timing` desde `cli.ts`).

---

## 2. Fases de Implementación (Tracer Bullets)

### Fase 1: Fronteras de Pureza y Adaptadores
- **`src/core/types.ts`**: Tipos canónicos de dominio (`ResolvedBirth`, `EAChart`, `ConsultationSession`, `Hypothesis`), geometría zodiacal compartida y el seam puro `Ephemeris`.
- **`src/core/birth.ts`**: Lógica pura de zonas horarias, cálculo a UT Julian Day y procedencia (`ok | ambiguous | nonexistent`) sin zod, AxiError, red ni filesystem. La validación de flags vive en `src/commands/client.ts` (único punto de contacto de zod).
- **`src/adapters/geocode.ts`**: Extracción del geocoding de Open-Meteo fuera de core; implementa el contrato `Geocoder` definido en `core/types.ts` y expone `createMockGeocoder` para tests.

### Fase 2: Módulos Profundos del Motor Evolutivo (`core/`)
- **`src/core/soul.ts`**: Cálculo del paradigma de Plutón, Punto de Polaridad (con desactivación si conjunción con Nodo Norte), Midpoint Plutón-Nodo Norte y conteo de aspectos estresantes/fluidos.
- **`src/core/nodes.ts`**: Eje nodal, regentes natales, detección estricta de Pasos Omitidos (*Skipped Steps*, orbe ≤ 5°) y cadenas de dispositores de los regentes nodales.
- **`src/core/phases.ts`**: Fases Sol-Luna natales y secundarias progresadas (las 8 fases arquetípicas).
- **`src/core/journey.ts`**: Motor de progresiones secundarias día-por-año (con contactos a puntos EA en orbe ≤ 3°) y búsqueda de estaciones planetarias.
- **`src/core/karma.ts`**: Motor de sinastría evolutiva pura (contactos cruzados inter-cartas a Plutón/Nodos, superposición de casas nodales y primitivas clásicas de sinastría).
- **`src/core/classical.ts`**: Proyecciones técnicas auxiliares (Dracónica, lots herméticos, estrellas fijas, eclipses prenatales), patrones de aspecto, firma de carta y síntesis de átomos de hecho.

### Fase 3: Capa de Almacenamiento Clínico (`storage/`)
- **`src/storage/client-store.ts`**: Gestión real de `~/.config/lumen/profiles.json` (XDG compliance, permisos 0600, escritura atómica tmp+rename, retrocompatibilidad `profile` / `client`, validación manual de archivo sin zod y resúmenes privados sin fecha de nacimiento).
- **`src/storage/consultation-store.ts`**: Expedientes clínicos en `~/.config/lumen/consultations.json` (sesiones `open` / `closed`, hipótesis tipadas con enums cerrados, confirmaciones y notas; validación manual de archivo sin zod).

### Fase 4: Comandos AXI (`commands/`)
- **`src/commands/soul.ts`**: Adaptador CLI para `lumen soul <client>` con salida TOON precomputada.
- **`src/commands/journey.ts`**: Subcomandos `progressed` y `stations` con flags unívocos.
- **`src/commands/karma.ts`**: `pair --a <id> --b <id>` con vacíos explícitos.
- **`src/commands/consulta.ts`**: Subcomandos `abrir`, `preparar`, `leer`, `confirmar`, `cerrar`.
- **`src/commands/client.ts`**: `add`, `list`, `show`, `remove` (con alias `profileCommand`). También concentra `NatalIntake`, schemas zod, geocoding, `CliContext` y selección de perfiles compartida; no existe carpeta `src/cli/`.
- **`src/commands/classical.ts`**: `chart`, `draconic`, `synastry`, más el motor de carta (`AstrologicalEngine`) y los comandos retrocompatibles `chartCommand`/`synastryCommand`.
- **`src/commands/setup.ts`**: `lumen setup hooks`.

### Fase 5: Integración y Suite de Pruebas
- **`src/cli.ts`**: Router con `axi-sdk-js`, contexto inyectado, Home con agenda de consultas activas (sin exponer datos biográficos) y aliases retrocompatibles `chart`, `profile`, `synastry` y `timing`.
- **`tests/`**: Migración y expansión de tests unitarios y de integración para cada módulo y comando.

---

## 3. Criterios de Aceptación (Definición de Terminado)
1. `bun test` (186 tests) y `bun run typecheck` pasan sin errores ni regresiones.
2. `bun run check` (biome sobre todo el repo) pasa con 0 errores y 0 warnings.
3. Ningún archivo en `src/core/` realiza llamadas de red o filesystem, ni importa desde `src/adapters/`, `src/commands/`, `src/storage/`, zod o axi-sdk-js; `core/` solo depende de caelus, caelus-birth y de sus propios módulos.
4. El comando `lumen consulta` permite abrir, preparar hipótesis (`H1`, `H2`), confirmarlas y cerrar sesiones con idempotencia demostrada en tests.
