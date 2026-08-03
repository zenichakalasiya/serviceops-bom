# BOM module — roadmap

Written after finishing the Vulnerability module (listing + detail). This is the
plan for the **new** BOM module, which is a different kind of job from what we
have done so far, and the difference matters.

---

## The key difference

Everything so far has been **replication**: a live product existed, so "correct"
was measurable. I never had to decide what a screen should contain — I measured
it, and a pixel diff told me when I was wrong.

BOM has no original to measure. There is no pixel diff that can tell us the
design is right. "Correct" becomes a judgement call, and judgement needs inputs
that measurement cannot supply.

So the honest answer to your offer: **yes, I want the user research and personas
— but not all of it, and not first.** Specifics in Phase 0 below.

---

## What carries over for free

Reusable today, no changes needed:

| Asset | Reuse |
|---|---|
| `styles/tokens.css` | primitives + semantic layers |
| `styles/theme-bom.css` | **re-brand goes here** — see below |
| `components/listing/*` | `PageHeader`, `SearchField`, `DataGrid`, `Pagination`, `Popover` |
| `components/*` | `Svg`, `Card`, `Donut` |
| `lib/toast.tsx` | non-implemented actions |
| `icons/lucide.ts` | 36 product glyphs |
| `tools/*` | interaction suite, screenshot harness, `with-preview` |

`DataGrid` is column-definition driven, so a BOM listing is a `Column<BomRecord>[]`
array plus data — no new grid code.

**Re-brand cost is one file.** Components reference only semantic tokens
(`--color-primary`, `--color-surface`, …), never a primitive. When your BOM
tokens land: add the primitives, repoint the five semantic names in
`theme-bom.css`, set `data-theme="bom"` on the module root. Then run
`npm run check` — the ServiceOps baseline must be **unchanged**, which proves the
re-brand is scoped and hasn't leaked.

## What does not carry over

- **Capture → tokens → validate** is dead for BOM. No original, nothing to diff.
- The 0.65% pixel metric is not replaceable by anything as objective. We should
  not pretend otherwise or invent a fake equivalent.
- Screen inventory, field lists, states, and empty/error/permission cases all
  have to be *decided* rather than read off.

---

## Phases

### Phase 0 · Framing — **needs you** (~half a day of your time)

What I actually need, in priority order. The first two are blocking; the rest I
can proceed without.

1. **What a BOM *is* in this product.** Is it a bill of materials for an asset,
   a software BOM (SBOM) for vulnerability provenance, a procurement artefact,
   or a service/CI composition? This single answer changes the entire IA. I will
   not guess it — a wrong guess wastes the whole phase.
2. **One real example record**, redacted if needed. Real field names, real
   cardinality (how many components in a typical BOM? 12 or 4,000? that decides
   tree vs grid vs virtualised list).
3. **Personas — but only the 2–3 who actually touch BOM**, not the full set of
   ten from the register. For each: the one task they open BOM to do, and what
   "done" looks like. A persona without a task attached does not change a design.
4. **Where BOM sits relative to existing modules.** Does it hang off Assets,
   off Vulnerabilities (SBOM → CVE), or stand alone? Determines navigation and
   whether we need cross-links.
5. Research artefacts you already have (interviews, tickets, support themes) —
   useful, lower priority. I would rather have one real record than ten slides.

**If the research isn't ready:** I can still start, by building against explicit
written assumptions, clearly labelled. That is strictly worse — assumptions
compound — so I'd rather wait for items 1 and 2 than build on a guess.

**Output:** a one-page brief I write and you correct. Cheaper to fix a wrong
sentence than a wrong module.

### Phase 1 · IA and flows (no UI)

Screen inventory, the object model, and the states each screen must handle
(empty, loading, partial, permission-denied, too-much-data, first-run).
Deliverable: a written layout spec per screen — regions, hierarchy, what is
primary. Text, because it is cheap to argue with.

**Gate:** you sign off the inventory before any pixels.

### Phase 2 · Foundations

BOM tokens into `theme-bom.css`; scaffold `src/modules/bom/`; confirm the
existing primitives cover the new screens and note the gaps. Verify the
ServiceOps baseline is untouched.

### Phase 3 · Listing first

Same order as Vulnerability, deliberately: the listing forces the object model
to be concrete. Reuses `DataGrid` + `PageHeader` + `Pagination` directly.

**Gate:** review on real data volumes, not 20 tidy rows.

### Phase 4 · Detail

Tabs, side panels, actions. Reuses the detail shell from the Vulnerability
module.

### Phase 5 · States and edges

The states from Phase 1, built for real. This is the phase that usually gets
skipped and then shows up as bugs — it is a phase here on purpose.

### Phase 6 · Quality gate

Extend the interaction suite to BOM (it is module-agnostic). Add visual
regression against **our own** previous build, so we catch drift even without an
original. Accessibility pass: keyboard paths, focus order, labels.

---

## How we will know it is right, without a pixel diff

Replacements for the metric we are losing, weakest to strongest:

1. **Self-referential visual regression** — diff against our own last build.
   Catches drift, says nothing about whether the design is good.
2. **Interaction suite** — already module-agnostic; asserts behaviour.
3. **Task-based review** — give a persona's real task to someone who did not
   build it and watch. This is the only one that tests whether the design works.

I would rather book two 20-minute sessions of (3) than add a hundred assertions
of (1).

---

## Risks

| Risk | Mitigation |
|---|---|
| "BOM" means something different to you than to me | Phase 0 item 1 is blocking, deliberately |
| Real data is far larger/messier than the sample | Ask for cardinality up front; virtualise the grid if needed |
| Brand tokens arrive late | Build on semantic tokens now; re-brand stays a one-file change |
| Scope creep from "while we're here" | Phase gates; new asks go to a backlog, not the current phase |
| Replication habits leak in | No original exists — resist inventing a fake fidelity metric |

---

## What I need from you to start

Blocking: **items 1 and 2** — what a BOM is here, and one real example record.

Everything else can follow while I work. Send those two and I will produce the
Phase 0 brief for you to correct.
