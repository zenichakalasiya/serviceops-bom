# ServiceOps module replicas

Pixel-accurate, interactive rebuilds of Motadata ServiceOps modules, built from
**measured** values rather than values estimated from screenshots.

Currently implemented: the **Vulnerability module** — listing and detail, with
navigation between them.

Next up: the **BOM module** — see [ROADMAP-BOM.md](./ROADMAP-BOM.md).

Source of truth: <https://ronak-patel-motadata.github.io/ServiceOps-Ticket-Detail->

```bash
npm install
npm run dev          # http://localhost:5190
npm run check        # build + interaction suite + pixel validation
```

## The method

Screenshot-to-code guesses: a model looks at a grey and writes `#F5F5F5` when it
is `#F4F6F8`. Every value is an estimate, the errors are individually invisible,
and together they make the result look "off" in a way nobody can point at.

This project never guesses. It drives the live product with Playwright and reads
values out of the DOM with `getComputedStyle()` — exact by construction — then
closes the remaining gap with a screenshot pixel-diff loop.

Current state: **0.63% pixel diff, 20 of 22 landmarks exact.** The two
exceptions are inherited `color`/`font-weight` on wrapper elements that render
no text of their own.

## Layout

```
src/
  icons/lucide.ts        GENERATED · 36 real product glyphs + the 16 rail icons
  data/tables.ts         GENERATED · real rows (15 CVE, 20 endpoint)
  data/content.ts        hand-transcribed non-table content
  data/listing.ts        GENERATED · the 20 patch records
  styles/tokens.css      PRIMITIVE + SEMANTIC token layers
  styles/theme-bom.css   per-module re-brand — one file, nothing else changes
  styles/components.css  detail-page CSS carried from the validated build
  styles/listing.css     listing-page CSS
  components/            Svg · Donut · DataTable · Card · IconRail · AppTopBar
  components/listing/    PageHeader · SearchField · DataGrid · Pagination · Popover
  lib/toast.tsx          actions with no client-side meaning surface here
  modules/vulnerability/
    VulnerabilityListing.tsx  the listing page
    VulnerabilityDetail.tsx   shell: header, tabs, sidebar, resizer
    tabs/                     Overview · Tables · Deployment · Superseded · AuditTrail
    panels/Panels.tsx         the 4 right-rail panels
tools/                   capture · extraction · validation (see below)
```

## Theming

Tokens are two layers. **Primitives** are the raw measured palette; **semantic**
names (`--color-primary`, `--color-surface`, `--color-line`, …) are the only
thing components reference. Re-branding is therefore one file —
[`styles/theme-bom.css`](src/styles/theme-bom.css) — plus a `data-theme`
attribute on the module root. No component CSS and no `.tsx` changes.

Files marked GENERATED are produced by `npm run gen` — edit the capture
pipeline, not the output.

## Scripts

| script | what it does |
|---|---|
| `npm run dev` | dev server on :5190 |
| `npm run build` | type-check + production build |
| `npm run check` | **build + `test:ui` + `validate`** — the gate |
| `npm run test:ui` | drives every control, asserts real behaviour |
| `npm run validate` | pixel-diff + landmark geometry vs the live product |
| `npm run refresh` | re-capture everything and regenerate `src/` |
| `npm run capture` | screenshot + DOM + computed styles for 26 surfaces |
| `npm run tokens` | aggregate captures → `tools/out/TOKENS.md` |
| `npm run gen` | capture output → typed `src/` modules |
| `npm run fonts` | re-fetch the Inter faces |

`test:ui` and `validate` boot `vite preview` themselves; set `APP_URL` to point
them at an already-running server.

## Things that will bite you

Each of these cost real debugging time and is now enforced by a test or a comment:

- **Inter must actually load.** The product resolves real Inter; without the
  self-hosted faces everything falls back to Segoe UI and every string renders
  ~6% narrow ("Overview" 59.5px instead of 63.5px), shifting every box.
- **`padding:0` on inputs.** The UA default `1px 2px` makes the sidebar search
  21.5px tall instead of 19.5, which shifts every property row below it.
- **`line-height: 24px` on property values.** That strut is what makes a
  one-line field 40px and a wrapped one 64px. Using the text's 19.5px made every
  wrapped cell 9px short and the error *accumulated* down the list.
- **`display:flex`, not `inline-flex`, on panel headings.** Inline-level puts
  the heading on the parent's 24px line box, 2px low, cascading down the panel.
- **Donut spec:** `viewBox="0 0 100 100"` in a 104px box, `r=40`,
  `stroke-width=16`, track `#F1F5F9`, and **no rotation** — arcs start at 3
  o'clock, which is what puts the remainder segment top-left.
- **Extracted SVGs carry no `width`/`height`.** Any control that forgets a size
  rule lets the glyph expand to fill its button, silently wrapping the label.
  `test:ui` fails on any icon over 24px.
- **The module listing stays mounted underneath the detail overlay.** Scoping
  captures by geometry silently returns the *listing's* columns for every tab.
  Slice the overlay subtree instead.
- **`---` is the product's own empty-cell placeholder,** and those glyphs sit
  off the row baseline, so naive clustering emits phantom rows made only of
  dashes. `test:ui` fails on any all-empty row.
- **Never name a class after a Tailwind utility.** `<table className="grid">`
  silently picked up Tailwind's `.grid { display: grid }`, which blockified
  `<thead>`/`<tbody>`/`<colgroup>` and threw away every column width — the grid
  bunched into the left 60% with no CSS error anywhere. Renamed to `datagrid`;
  `test:ui` now asserts the table computes to `display: table`. Watch for
  `grid`, `flex`, `block`, `table`, `hidden`, `fixed`, `static`, `container`,
  `absolute`, `relative`, `sticky`, `visible`, `contents`, `isolate`.
- **A listing row's cells are not on one baseline.** In the listing the `<td>`
  text sits at y=202.5 while the id pill and severity chip sit at 215–222.5 — a
  20px spread against a 54px row pitch. Cluster with a ~26px window.

## Not implemented

- **The original's listing toolbar is inert.** Probed each control for DOM
  changes: the view switcher, export, download, refresh, column chooser and
  overflow menu all register **zero** effect in the source prototype, and row
  clicks do not open the record (only the id pill does). The rebuild implements
  the behaviours whose semantics are unambiguous — search, sort, selection,
  column visibility, rows-per-page, pagination, id → detail — and toasts the
  ones that would need a backend. That is a deliberate addition, not a copy.
- Actions needing a backend (Deploy Patch, Export, View Configuration) raise a
  toast rather than pretending to succeed.
- Two listing rows carry extraction artefacts (`5 1` in one Impacted Endpoints
  cell; one row missing category/score/date) where cells fell outside the
  clustering window. Cosmetic, in the data not the design.
- The Superseded graph uses captured node positions, not a layout engine.
- Left-rail module names are inferred from their icons; only Vulnerabilities is
  in scope.
- Hover/focus states beyond Approve/Decline are not captured.

## Adding the next module

1. Point `tools/capture.cjs` at the new module and `npm run refresh`.
2. Read `tools/out/TOKENS.md` — if new values appear, add them to `tokens.css`.
3. Add `src/modules/<name>/` following the vulnerability module's shape.
4. Extend the landmark set in `tools/validate.cjs`, then `npm run check`.
