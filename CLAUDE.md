# ServiceOps module replicas

Pixel-accurate, interactive rebuilds of Motadata ServiceOps modules, built from
**measured** values rather than values estimated from screenshots.
See [README.md](./README.md) for the method, scripts and known traps.

## Deployment
Repo: https://github.com/zenichakalasiya/serviceops-bom
Live URL: https://zenichakalasiya.github.io/serviceops-bom/

Deployed from `main` by `.github/workflows/deploy.yml` (Vite build → GitHub
Pages). The Vite `base` in `vite.config.ts` **must** match the repo name, or
every asset 404s and the page renders blank.

## Before you push

Run the gate — it builds, drives every control, and pixel-diffs the
Vulnerability detail page against the live product:

```bash
npm run check
```

Baseline to hold: **0.66% pixel diff, 20/22 landmarks exact**, all interaction
checks passing, no console errors.

## Not in the repo

`tools/out/` is gitignored — ~100 MB of screenshots and captured DOM. Regenerate
with `npm run refresh`. The app builds without it because the generated sources
(`src/icons/lucide.ts`, `src/data/tables.ts`, `src/data/listing.ts`) are
committed.
