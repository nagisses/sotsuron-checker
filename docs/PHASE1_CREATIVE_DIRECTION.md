# THESIS APOCALYPSE — Phase 1: Creative Direction & Technical Architecture

## 1. Visual Reference Investigation & Transparency Log

### Uploaded Reference Images (6 Directly Inspected Visual References)
1. **Image 1 (`media_1795000620677_f36cbf48.jpg`) — Dense Brutalist Megacity Canyon**:
   - Towering charcoal-slate monoliths with horizontal setback ledges, overhanging modules, deep canyon mist (`#5a6e7a` horizon diffusion), tiny pinpoint red/amber recessed fixtures, and diagonal golden arterial highway streams.
2. **Image 2 (`media_1795000643353_9dfaaceb.jpg`) — Stepped Central Citadel & Telemetry Filaments**:
   - Stepped ziggurat central megastructure with sharp cool-silver zenithal specular edges, vertical volumetric sky beam, swirling low-lying mist banks, fine vertical glowing red/cyan telemetry needle filaments, and channeled circuit-board plaza deck.
3. **Image 3 (`media_1795000683611_179d9b28.jpg`) — Brutalist Courtyards & Spill Lighting**:
   - Deep concrete staircases, fluted monolith pillars, dramatic localized cyan/blue and arterial red bounce light spilling across textured stone steps.
4. **Image 4 (`media_1795000722312_59955594.jpg`) — *Cyber City Orion* (Adrian Red) Reference Frame**:
   - Atmospheric vertical rain streaks, dense multi-grid skyscraper facades, clean corner telemetry HUD.
5. **Image 5 (`media_1795000757308_c0d539bd.jpg`) — *UltraSuperNew* (`/nk.studio`) Showcase**:
   - High-contrast obsidian backdrop with subtle sculpted architectural silhouettes and crisp editorial typography.
6. **Image 6 (`media_1795000779666_ac91214d.jpg`) — *CONTROL* (Remedy Entertainment) Board Atrium**:
   - Suspended inverted black pyramid monolith centered in a coffered Brutalist atrium with volumetric skylight contrast and arterial red floor zones.

### Direct Live-Capture Reference Inspection (`/Users/ponchanponchannn/Desktop/参考画像`)
- Directly inspected sampled frames across all **30 live Safari captures (`スクリーンショット 2026-11-18 20.58.09.png` – `20.59.01.png`) of `orion.adrianred.com` (*Cyber City Orion* by Adrian Red)**:
  - **Sky & Atmospheric Fog**: Luminous misty steel-blue twilight horizon haze (`#476785` / `#1d2f42`) separating foreground, mid-ground, and far-ground skyscraper silhouettes rather than pure flat black void.
  - **Skyscraper Density & Facade Systems**: Continuous monumental vertical canyon skyscrapers plunging deep below the deck (`-65m`), combining 4 distinct architectural facade grammars: dense curtain-wall micro-windows (amber/white/cyan), horizontal illuminated louver bands, branching PCB circuit-trace wall etchings, and Brutalist concrete vents.
  - **Atmospheric VFX & Infrastructure**: Directional glowing cyan chevron sky-lanes, rotating pixelated holographic dot-matrix rings, diagonal Blade-Runner rain streaks, soft additive red aviation beacon halos, and distant cruising hover-traffic silhouettes.

---

## 2. Design System & Standards Alignment

### Color Palette & WCAG 2.2 AA Contrast Verification
| Token | Hex | Role | Contrast vs `#090C11` | Contrast vs `#121922` |
|---|---|---|---|---|
| Primary Background | `#090C11` | Deep void / HUD base | — | 1.15:1 |
| Secondary Background | `#121922` | Docked panels / rails | 1.15:1 | — |
| Structural Graphite | `#232B35` | Borders / architectural base | 1.56:1 | 1.36:1 |
| Metallic Surface | `#455462` | PBR metal / subtle dividers | 2.67:1 | 2.33:1 |
| Primary Text | `#ECEBE7` | Headings & primary copy | **16.6:1 (AAA)** | **14.5:1 (AAA)** |
| Secondary Text | `#8996A3` | Metadata & secondary labels | **6.45:1 (AA+)** | **5.62:1 (AA)** |
| Critical Red | `#FF594F` | Collapse / structural fault ONLY | **5.37:1 (AA)** | **4.68:1 (AA)** |
| Reconstruction Cyan | `#48D7BA` | Healthy thesis logic / active focus | **11.5:1 (AAA)** | **10.0:1 (AAA)** |
| Evidence Gold | `#E3B86B` | Verified grounds / source archives | **10.1:1 (AAA)** | **8.84:1 (AAA)** |

*Rule*: Never place `#8996A3` text directly on `#232B35` or `#455462` surfaces (contrast drops below 4.5:1). Secondary text sits strictly on `#090C11` or `#121922`.

### Typography
- Japanese UI & Thesis Text: `'Noto Sans JP', sans-serif` (locally bundled via `@fontsource/noto-sans-jp`)
- English & Structural UI: `'Inter Variable', sans-serif` (locally bundled via `@fontsource-variable/inter`)
- Telemetry, Coordinates & Code IDs: `'IBM Plex Mono', monospace` (locally bundled via `@fontsource/ibm-plex-mono`)

### Layout Specification (1440×900 Desktop First)
- **3D主表示領域 (Primary Viewport)**: Full-bleed WebGL canvas, unobscured center region (~78–80% clear screen area).
- **Left Rail (`56px`)**: Camera mode rail (Overview `1`, Central Tower `2`, Collapse Close-up `3`, Free Orbit `4`) + Accessibility/Quality triggers. Every button >= 40×40px (`WCAG 2.2 SC 2.5.8`).
- **Top Status Strip (`44px`)**: `THESIS APOCALYPSE`, active sample thesis title, structural integrity index, quality mode selector (`HIGH` / `STD` / `LOW`), live FPS/frame-time telemetry toggle.
- **Right Analysis Panel (`340px`, collapsible)**: Displays deterministic node-to-architecture mapping, Toulmin structural metadata, and detected weaknesses for the currently focused building/sector. Defaults open on desktop at compact width or smoothly collapsible (`[` / button) to maximize 3D framing.
- **Bottom Timeline Strip (`52px`)**: Phase 2 preview timeline cues (Initial Genesis -> Structural Overview -> Central Spire Inspection -> Fault Detection Close-up) with keyboard accessibility.

---

## 3. 3D City Architecture & Research-to-City Mapping

### Deterministic Mapping Rules
Every city district is deterministically generated from a Zod-validated `ClaimGraph`:
- **Central Claim** → `CENTRAL_SPIRE` (Hero Monolith at `(0, 0, 0)`, height `42m`+)
- **Supporting Claims** → `CLAIM_CITADEL`, `CLAIM_CANTILEVER`, `CLAIM_TWIN_PYLON`, `CLAIM_OBELISK` (Inner ring `r = 20–30m`)
- **Grounds / Evidence** → `EVIDENCE_VAULT`, `EVIDENCE_REACTOR`, `EVIDENCE_TERRACE` (Reinforced plinths & lower-tier facilities `r = 16–36m`)
- **Warrants / Inference Relays** → `WARRANT_RELAY` + `ConnectionBridge` (Elevated multi-chord truss bridges + GLSL pulse conduits)
- **Rebuttals** → `REBUTTAL_BASTION` (Perimeter angular defense structures `r = 34–42m`)
- **Research Sources / Backing** → `UNDERGROUND_CAISSON` (Sub-deck piers extending down to `y = -24m` into the illuminated archive grid)
- **Observation / Telemetry** → `OBSERVATION_DECK` (Cantilevered public scrutiny platforms)
- **Missing Evidence** → `UNFINISHED_FOUNDATION` (Exposed rebar grid, missing core slabs, pulsing amber/red hazard beacon)
- **Structural Collapse / Logic Flaw** → `FRACTURED_MONOLITH` (Sheared Brutalist tower with exposed trusses, glowing `#FF594F` fissure shader, severed bridge span, displaced floating/fallen debris, upward ember particles)

### 14 Distinct Procedural Architectural Archetypes
1. `CENTRAL_SPIRE` — Stepped Brutalist Sovereign Tower + 4 buttresses + recessed cyan logic core + cantilevered observation collar + twin conduit spines + spire mast
2. `CLAIM_CITADEL` — Setback stepped monolith + vertical exoskeleton fins + illuminated logic slits
3. `CLAIM_CANTILEVER` — Asymmetrical cantilevered overhang + diagonal steel truss struts + roof sensor array
4. `CLAIM_TWIN_PYLON` — Dual parallel concrete-metal shafts linked by structural skybridges
5. `CLAIM_OBELISK` — Chamfered tapered monolith + horizontal mechanical collar rings + telemetry mast
6. `EVIDENCE_VAULT` — Armored trapezoidal archive bunker + gold `#E3B86B` recessed louvers + cooling manifolds
7. `EVIDENCE_REACTOR` — Octagonal ribbed containment silo + upper service catwalk + gold conduit ring
8. `EVIDENCE_TERRACE` — Ziggurat stepped terrace foundation supporting higher claim structures
9. `WARRANT_RELAY` — Hexagonal mid-height relay pylon with directional bridge anchors
10. `REBUTTAL_BASTION` — Sloped perimeter fortress with blast baffles + dual counter-argument sensor masts
11. `UNDERGROUND_CAISSON` — Deep sub-deck caisson shafts + subterranean cross-braced girders + source nodes
12. `OBSERVATION_DECK` — Truss-supported cantilevered observation platform
13. `UNFINISHED_FOUNDATION` — Skeletal girder grid + unfinished corner piers + hazard strobe
14. `FRACTURED_MONOLITH` — Split & tilted claim monolith + glowing `#FF594F` GLSL fracture fissures + exposed rebar/trusses + fallen concrete rubble + hovering debris

### 3-Layer Depth Composition
1. **Near/Hero Layer (`r = 0–48m`)**: Full multi-part procedural Brutalist architecture, truss bridges, underground piers, particle systems, localized hazard/core lights.
2. **Mid-Ground Layer (`r = 52–108m`)**: Instanced modular mid-rise brutalist towers & stepped blocks (`InstancedMesh` with custom GLSL architectural louver + seam + window-slit shader) + elevated perimeter viaducts.
3. **Far-Ground / Horizon Layer (`r = 112–210m`)**: Dense outer megacity silhouette rings (`InstancedMesh`) fading smoothly into exponential atmospheric fog (`#090C11`) and horizon light scattering.

---

## 4. Rendering & Compatibility Strategy (Three.js r187 / R3F v9)

- **Shadow Mapping**: `THREE.PCFShadowMap` (Note: `THREE.PCFSoftShadowMap` was removed in Three.js r186; `PCFShadowMap` provides native soft filtering in r182+).
- **Tone Mapping**: `THREE.ACESFilmicToneMapping` (`exposure = 1.05`) for cinematic contrast without clipping highlights.
- **Image-Based Lighting**: Procedural `<Environment resolution={256} frames={1}>` using `<Lightformer>` panels — 100% deterministic, zero external HDR network failure risk.
- **Controlled Bloom**: `luminanceThreshold = 0.90`, `mipmapBlur`, `intensity = 0.52` — triggers strictly on high-HDR emissive trims (`emissiveIntensity > 1.4`) so architectural silhouette details are never washed out.
- **Custom GLSL Shaders**:
  1. `facadeLouverShader`: Procedural Brutalist concrete paneling, vertical ribs, and micro-window telemetry matrices for instanced mid/far city density.
  2. `conduitFlowShader`: Directional animated pulse streams for logic bridges (`#48D7BA` healthy / `#FF594F` corrupted pulse glitch).
  3. `fractureFissureShader`: Animated arterial red (`#FF594F`) structural crack glow across damaged concrete surfaces.
  4. `abyssGridShader`: Sub-deck architectural blueprint/source grid fading cleanly with radial distance.
- **Camera System**: 4 modes (`overview`, `central_tower`, `collapse_closeup`, `orbit`) smoothly interpolated via damped target/position transitions (honoring `prefers-reduced-motion` when active).

---

## 5. Academic Analysis Schema & Phase 4 Test Suite Specification (Section D & E)

Every AI-analyzed weakness in the Toulmin Claim Graph carries:
- `sourceText`: Exact verbatim passage from paper
- `issueCategory`: Logical Leap / Insufficient Grounds / Contradiction / Correlation-as-Causation / Missing Rebuttal / Unclear Source / Overgeneralization
- `rationale`: Detailed analytical reasoning
- `missingEvidence`: Concrete evidence/data required to resolve the flaw
- `suggestedRevision`: Candidate textual/methodological revision
- `uncertainty`: Explicit confidence score (`0..1`) & epistemic uncertainty notice (AI findings are hypotheses for scholarly review, never final academic judgments; zero fabricated citations).

**5 Benchmark Test Cases** (Prepared in `src/data/testCases.ts`; live Gemini verification scheduled in Phase 4):
1. Clear Toulmin logical structure (Expected: high structural integrity, 0 critical collapses)
2. Insufficient empirical grounds (Expected: `Insufficient Grounds` -> `Type A Structural Collapse` / `UNFINISHED_FOUNDATION`)
3. Correlation mistaken for causation (Expected: `Correlation-as-Causation` -> `Type B Connection Failure` on Warrant bridge)
4. Missing rebuttal to obvious counter-arguments (Expected: `Missing Rebuttal` -> weakened `REBUTTAL_BASTION`)
5. Uncertain / unverified claims without citation (Expected: `Unclear Source` + high epistemic uncertainty flag, no hallucinated citations)
