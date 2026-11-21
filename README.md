# THESIS APOCALYPSE — Cinematic 3D Research Intelligence Platform

> 「論文は、ひとつの都市である。」
> Transforms academic papers and arguments into an interactive Neo-Brutalist 3D metropolis powered by Toulmin Argumentation Analysis and Google Gemini.

## Key Capabilities
- **Purdue OWL Toulmin Argument Graph -> 3D City Blueprint**: Deterministically maps claims, grounds, warrants, backings, qualifiers, and rebuttals onto 14 procedural Brutalist building archetypes connected by animated chevron logical bridges.
- **Server-Side Gemini API Pipeline (`@google/genai`)**: Structured output extraction (`THESIS_GRAPH_GEMINI_SCHEMA`, `BENCHMARK_EVAL_GEMINI_SCHEMA`, `REVISE_NODE_GEMINI_SCHEMA`), resilient fallback (`gemini-3.5-flash-lite` -> `3.1-flash-lite` -> `3.6-flash` -> `3.8-flash`), and anti-hallucination verbatim grounding audits.
- **Destruction & Reconstruction Editing Loop**: Edit flawed or collapsed argument passages inline in the inspector, re-audit live via Gemini, trigger animated 3D reconstruction assembly beams or seismic collapse shockwaves, inspect integrity deltas, and undo revisions cleanly.
- **WCAG 2.2 AA Accessible & 60 FPS Verified**: Automated `axe-core` compliance (`0` violations), 2D Accessible Toulmin Logic Graph (`G`), Reduced Motion mode (`M`), keyboard navigation (`1–4`, `[`/`]`, `F`, `I`, `U`, `G`, `M`, `Esc`), and GPU-instanced skyline rendering.

## Quick Start

1. Install dependencies:
   ```zsh
   npm install
   ```
2. Configure your Gemini API key securely in `.env.local` (gitignored):
   ```zsh
   printf 'GEMINI_API_KEY=your_api_key_here\n' > .env.local
   ```
3. Build client and server bundles:
   ```zsh
   npm run build
   ```
4. Launch the API server and UI dev/preview server:
   ```zsh
   npm run start:api   # Terminal 1: API proxy on http://127.0.0.1:8787
   npm run dev         # Terminal 2: Vite UI on http://localhost:5173
   ```

## Keyboard Shortcuts
- `1`–`4`: Switch Camera Mode (Overview / Building Inspection / Destruction Close-up / Free Orbit)
- `[` / `]`: Step previous / next Toulmin Sector
- `F`: Focus active node in 3D
- `U`: Open Gemini Ingestion / Analysis Modal
- `I`: Toggle Right Research Inspector Panel
- `G`: Toggle 2D Accessible Logic Graph
- `M`: Toggle Reduced Motion mode
- `Esc`: Close dialogs or reset camera to Overview

## Verification Commands
- `npm run typecheck && npm run typecheck:server`: Strict TypeScript checks
- `npm run build`: Production Vite client & `esbuild` server build
- `npm run verify:gemini`: Live Gemini Section E benchmark & manuscript extraction test
- `npm run verify:phase2` / `verify:phase3` / `verify:phase4` / `verify:phase5`: Headless Chrome Metal WebGL + `axe-core` WCAG 2.2 AA E2E suites
