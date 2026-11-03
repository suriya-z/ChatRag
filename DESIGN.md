# Design System — Pulsar (Factory Records Catalog)

<!-- impeccable:design-schema 1 -->

## Philosophy & Lineage

Pulsar is anchored in the austere, authoritative graphic lineage of Peter Saville and Factory Records (FAC 1 through FAC 501), married to the scientific data-visualization purity of CP 1919 radio pulsar plots (*Unknown Pleasures*). 

The platform treats 23 administrative and operational configuration zones as individual catalog releases (`FAC-01` through `FAC-23`). The interface completely rejects SaaS template cliches (no bubbly pastel cards, no soft purple gradients, no rounded pill badges, no conversational filler). Every element is an exact, high-contrast, machine-calibrated instrument designed for sub-50ms vector query oversight and enterprise deployment management.

---

## Color System

All values are verified for strict WCAG AA / AAA compliance against the `#000000` sleeve canvas.

### Surfaces
- **Canvas Base**: `#000000` — Pure matte vinyl black. The unyielding foundation.
- **Surface Elevation 1**: `#0a0b10` — Raised module substrate and input background.
- **Surface Elevation 2**: `#12141c` — Active card panels, modal trays, hover states.
- **Hairline Rule 1**: `#1e2029` — Fine 1px technical structural borders.
- **Hairline Rule 2**: `#2d313e` — Interactive hover boundaries and divider accents.

### Typography & Foreground
- **Text Primary**: `#ffffff` — Stark optical white (21:1 contrast ratio against `#000000`).
- **Text Secondary**: `#94a3b8` — Neutral slate secondary text (7.3:1 contrast ratio).
- **Text Muted / Captions**: `#64748b` — Micro labels and table indices (4.6:1 contrast ratio, WCAG AA compliant).
- **Text Placeholder**: `#475569` — Form placeholder text (3.2:1 contrast ratio on inputs).

### Telemetry Accents
- **Catalog Electric Cyan**: `#38bdf8` — Catalog indexing (`FAC-XX`), active wave plots, focus rings.
- **System Active Green**: `#10b981` — Verified live connections, HNSW sync status.
- **Warning Amber**: `#f59e0b` — Unsaved diffs, pending environment reload, missing keys.
- **Critical Red**: `#f43f5e` — Connection timeouts, RLS violations, database disconnection.

---

## Typography

### Display & Interface
- **Font Family**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, "Segoe UI", `Roboto`, sans-serif.
- **Scale**:
  - Catalog Title / Large Heading: `1.5rem` (24px), font-weight 700, tracking `-0.025em`.
  - Section Heading: `1.125rem` (18px), font-weight 600, tracking `-0.015em`.
  - Body Text: `0.875rem` (14px), font-weight 400/500, line-height `1.5`.
  - Utility Caption: `0.75rem` (12px), font-weight 500, uppercase tracking `0.05em`.

### Data, Telemetry & Code
- **Font Family**: `ui-monospace`, `JetBrains Mono`, `SFMono-Regular`, `Consolas`, monospace.
- **Application**: Catalog numbers (`FAC-01`), `.env` variable names, SQL queries, vector dimensions, token chunk metrics.

---

## Layout & Spatial Geometry

- **Geometry**: Razor-sharp rectangular architecture. Border radius is strictly restricted to `0px` (true Saville sleeve) or `4px` (for tactile keyboard focus fields). No pill buttons, no bubbly corners.
- **Grid Structure**:
  - **Left Catalog Rail (280px)**: Permanent, vertically scrollable index displaying `FAC-01` through `FAC-23` with live health telemetry pills and search filtering.
  - **Main Console Deck (Remaining Width)**: Fixed-header with live vector pulsar SVG frequency canvas, followed by the active catalog module workspace.
- **Spacing**: 8px baseline scale. Tight, disciplined groups (`gap-2`, `gap-3`), generous separation between independent modules (`gap-6`, `p-6`).

---

## Component Language

### 1. Catalog Item (Sidebar Rail)
- Displays monospace serial `FAC-01`, catalog name in uppercase, and a status ping (`green` = configured, `amber` = incomplete).
- Active state: `#12141c` background, `#38bdf8` left indicator line (1px), `#ffffff` text.

### 2. Pulsar Frequency Plot
- A real-time SVG rendering of stacked horizontal wave lines representing vector distance frequencies and database embeddings.
- Renders in pure white hairline strokes (`stroke="#ffffff"`, `stroke-width="1"`) with cyan highlights (`stroke="#38bdf8"`).

### 3. Form Controls & Inputs
- Text inputs and textareas use `#0a0b10` background with `#1e2029` border.
- Focus ring: `focus:ring-1 focus:ring-[#38bdf8] focus:border-[#38bdf8]`.
- Save state is instant: local debounce with immediate visual confirmation badge `[SAVED]`.

### 4. Action Buttons
- **Primary**: Solid white background `#ffffff`, black text `#000000`, font-weight 600. On hover: electric cyan `#38bdf8`.
- **Ghost / Outline**: Transparent background, `#1e2029` border, `#ffffff` text. On hover: `#12141c` background.

---

## Craft Floor Verification

- **Contrast**: Guaranteed ≥ 4.5:1 on all form inputs and secondary text; 21:1 on primary headers.
- **Theme Hooks**: Custom scrollbar (`::-webkit-scrollbar` styled with `#1e2029`), custom selection (`selection:bg-[#38bdf8] selection:text-black`), custom focus rings on all interactive elements.
- **Performance**: Zero external render-blocking stylesheets or unminified Play CDN scripts.
