# Collage Maker

Browser-based photo collage editor. Drop in images, arrange them on a flexible grid, crop and transform each cell, then export as PNG or JPEG.

**Live:** [collage.sideproject.se](https://collage.sideproject.se)

## Features

- **Drop or pick images** — up to 12 photos per collage
- **Flexible layout** — rows or columns, drag gutters to resize bands, drag cells to reorder
- **Gutter snap** — hold Shift while resizing to align gutters
- **Per-cell editing** — pan/zoom crop, flip, rotate 90°
- **Replace or remove** a selected photo
- **Randomize layout** for a fresh arrangement
- **Size presets** — Full HD, 4K, Instagram, TikTok, YouTube, LinkedIn, and more, plus custom dimensions
- **Export** — PNG or JPEG, edge capped at 4096px
- **Runs entirely in the browser** — no upload to a server

## Stack

- React 19 + TypeScript
- [Vite+](https://viteplus.dev/guide/) (`vp`)
- [Chakra UI](https://chakra-ui.com/) v3
- Deployed to Cloudflare Workers (static assets) via Wrangler

## Develop

```bash
pnpm install   # or: vp install
vp dev
```

```bash
vp check       # format, lint, typecheck
vp test
pnpm build
pnpm preview
```

## Deploy

```bash
pnpm build
pnpm deploy    # wrangler deploy
```

## Bugs & feature requests

Report bugs and propose features via [GitHub Issues](https://github.com/thejoltjoker/collage-maker/issues). Open a [new issue](https://github.com/thejoltjoker/collage-maker/issues/new) with enough detail to reproduce a bug or describe the feature you want.
