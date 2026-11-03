# Surface Brief — Unified Settings (Config Dashboard + In-App Settings)

## Job and audience
- **Who arrives:** Internal admin setting up company-document chatbots.
- **Context:** They own a knowledge base and need to wire up models, keys, RAG behavior, and appearance before users start chatting.
- **Need:** One settings surface that covers everything the incumbent splits across `/config-ui` and the in-app shell — treated as a single surface.
- **Visitor mode:** Operate (task completion: configure, save, verify).

## Outcome and proof
- **Primary task:** Configure all chatbot settings (theme/fonts/language/text size, AI model + reasoning, RAG behavior mode, API keys + embeddings, and everything else currently exposed) and persist them.
- **Success:** Admin can find, change, and save every setting without leaving the surface; first-run empty state (no docs, no keys) is clear and actionable.
- **Product-specific truth:** Dual-mode (single-tenant / multi-tenant), 100+ models via OpenRouter, Supabase RLS, visual config is the core differentiator. Keep `{{context}}` in RAG prompts. Config keys stay synchronized across `.env.local`, `scripts/init-env.js`, `src/lib/env.ts`, `scripts/config-server.js`, `scripts/config-ui/index.html`.
- **Real proof:** Existing `src/app/config-ui/route.tsx`, `src/components/ui/*`, `src/app/page.tsx`, `src/app/client-layout.tsx` as incumbent implementation.

## Direction contract

### THESIS
The enterprise knowledge platform is structured as an authoritative numbered catalog release (FAC-01 through FAC-23), marrying Peter Saville's minimalist Factory Records sleeve aesthetic with live Joy Division pulsar frequency plots generated from vector embedding similarity waves.

### OWN-WORLD
- Lineage: Peter Saville / Factory Records catalog numbering (FAC-01 to FAC-23) + CP 1919 radio pulsar plots (*Unknown Pleasures*).
- Palette: 
  - Canvas: `#000000` (pure matte sleeve black)
  - Card/Module elevation: `#0c0d12` (subtle vinyl sleeve elevation)
  - Hairline Rule: `#1e2029` (fine technical grid)
  - Primary Typographic: `#ffffff` (stark optical white)
  - Catalog Cyan: `#38bdf8` (FAC catalog numbering and active signal waves)
  - Industrial Accents: `#f59e0b` (warning/amber status) and `#ec4899` (classification markers)
- Typography: Stark Swiss/Grotesk sans-serif headers paired with monospace technical telemetry (`JetBrains Mono` / `ui-monospace`).
- Form: Razor-sharp technical sleeve layout, minimal radii (0px or 4px), stacked pulsar wave frequency plots visualized above settings panels.

### STORY
When an administrator enters port 3333, they are not looking at a bloated generic settings form. They are operating an authoritative catalog console: 23 individual numbered modules (FAC-01 Model Selection, FAC-02 RAG Prompts, FAC-03 Vector Storage, ... FAC-23 System Diagnostics). Each module carries its catalog serial, live sync status with `.env.local`, and real-time validation without page reloads.

### FIRST VIEWPORT
- Left Catalog Rail: Monospace indexed vertical track displaying `FAC-01` through `FAC-23` with live status pings (green = configured, amber = missing keys) and instant search filtering.
- Hero Header: High-frequency SVG pulsar plot dynamically reflecting the active pgvector dimensions and document count.
- Main Workspace: High-contrast, WCAG AA compliant form fields with instant debounce save, live reload trigger, and inline validation.

### FORM
- seed: `seed:a41af6a5be6f7a10`
- Surface style: Factory Minimalist Record Sleeve, pure `#000000` base, `#ffffff` high contrast text, `#38bdf8` electric blue telemetry, sharp hairline borders.

### FINISH
- Zero contrast failures (all text >= 7:1 against canvas, inputs >= 4.5:1).
- Zero DaisyUI/Tailwind Play CDN lag — compiled modular React SPA.
- All 23 configuration pages preserved as individual, directly accessible catalog items (FAC-01 to FAC-23).

## Scope and boundaries
- **Fidelity:** Production-ready screen, full interactivity, all states handled, ships as-is.
- **Breadth:** Unified settings surface covering all 23 standalone config categories.
- **Interactivity:** Production-ready (forms, validation, save, loading, error, success).
- **Named target:** `scripts/config-ui/` (port 3333 studio SPA) + in-app settings surfaces in `src/app/page.tsx` / `src/components/ui/*`.
- **What remains untouched:** API contracts with `scripts/config-server.js` and `.env.local`.
- **Explicit anti-goals:** Do NOT collapse the 23 configuration pages into 4 tabs. Keep all 23 standalone. No starter-template residue.
