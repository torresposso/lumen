# ADR-0010 — Optimal Modular Architecture for Agent-Centric CLI

Following the deepening of the natal calculation pipeline (ADR-0009), `src/core/` remained a mixed bag containing CLI framework primitives, domain entities/models, and the calculation engine. Additionally, command surface definitions had residual static catalogs, and single-file folders risked shallow hierarchy sprawl.

Because Lumen is designed specifically as an AXI CLI tool for interaction between a human and AI agents in TUIs (`agy`, `opencode`, `claude code`), we structured the codebase into high-cohesion, deep modules:

1. **`src/commands/` as Top-Level Product Verbs**: The primary CLI entrypoints (`profile.ts`, `chart.ts`) live at the root of `src/`, providing instant discovery for both humans and AI agents.
2. **`src/cli/` (AXI Infrastructure)**: Houses reusable AXI CLI mechanics (`args.ts`, `subcommand.ts`, `surface.ts`, `home.ts`). `CliContext` and its guard live in the composition root (`src/cli.ts`), not here (collapsed 2026-08-19: the one-module context seam added no depth).
3. **`src/domain/` (Profile Domain Core)**: Houses profile entities (`model.ts`), persistence port (`store.ts`), parsing & validation (`birth-input.ts`), Meeus Julian Day arithmetic (`jd.ts`), and TOON projection (`toon.ts`).
4. **`src/engine/` (Deterministic Calculation Engine)**: Combines pure astronomical geometry (`aspects.ts`) and natal evolutionary chart synthesis (`natal.ts`), exposing `computeNatalChart(profile, ephemeris)` as the single deep interface.
5. **`src/storage/` & `src/adapters/`**: Houses SQLite persistence (`profile-store.ts`, `schema.ts`) and Ephemeris capability ports (`ephemeris.ts`) with deterministic in-memory test doubles (`InMemoryProfileStore`, `InMemoryEphemeris`).
