---
name: current-slide
description: Resolve which slide and page the user is currently viewing in the open-slide dev server. Consult this whenever the user references "this page", "this slide", "the slide I'm on", "the current page", or any deictic reference to slide content without naming it. Reads `node_modules/.open-slide/current.json`, which the dev server writes whenever the user navigates.
---

# Where is the user right now?

When the user says "fix this page", "tweak the layout here", or "the slide I'm looking at", they almost never name the slide id or page number — they mean wherever they are in the dev viewer. Before asking "which slide?", check the file the dev server writes on every navigation.

## How to read it

```
node_modules/.open-slide/current.json
```

Path is relative to the project root (the user's `cwd`, the directory that contains `slides/` and `package.json`). Use the `Read` tool. The file is JSON.

## What you get

```json
{
  "slideId": "q2-roadmap",
  "pageIndex": 2,
  "pageNumber": 3,
  "totalPages": 8,
  "slideTitle": "Q2 Roadmap",
  "view": "slides",
  "pagePath": "slides/q2-roadmap/index.tsx",
  "updatedAt": "2026-05-09T14:32:11.123Z"
}
```

- `slideId` — folder name under `slides/`. Use as-is for any `/__slides/<id>/...` API or as the URL segment.
- `pageIndex` — 0-based, for use with the page array in `index.tsx` (`export default [Cover, Body, ...]`).
- `pageNumber` — 1-based, for use in messages to the user ("page 3 of 8") and for the URL `?p=N`.
- `pagePath` — relative path to the slide source. Hand straight to `Read` / `Edit`.
- `view` — `"slides"` (canvas view) or `"assets"` (asset manager). If `"assets"`, the user is browsing files for that slide rather than viewing a page.
- `updatedAt` — ISO timestamp of the last navigation. Use it to detect staleness.

## When to use this

- The user references the current slide/page deictically: "this", "here", "the page I'm on", "the slide I'm looking at", "what I'm working on".
- Before asking "which slide?" as a clarifying question — check this file first.
- Before guessing from `git log`, recently-edited files, or the most recent slide folder.

## When NOT to use this

- The user names a slide explicitly ("edit `q2-roadmap`") — use that name directly.
- The `apply-comments` workflow already finds the right file via `@slide-comment` markers; it doesn't need this skill.
- For listing or discovering slides — read `slides/` directly.

## Staleness — verify before acting

`updatedAt` is the last time the user navigated. Treat it like a cache:

- **Fresh (under ~5 minutes old)**: trust it. Open `pagePath`, do the work.
- **Older than ~5 minutes, or older than your last interaction with the user**: confirm with the user before editing. The dev server may not be running; the user may have switched contexts.
- **Hours/days old**: ignore it. Ask the user which slide they mean.

## When the file is missing

- The dev server hasn't been opened on a slide yet, or has never run.
- Don't create the file or guess. Ask the user which slide they mean, or suggest they open the slide in the dev server first.

## Example

User: "tighten the spacing on this page"

1. Read `node_modules/.open-slide/current.json`.
2. Check `updatedAt` is recent.
3. Read `pagePath` (e.g. `slides/q2-roadmap/index.tsx`).
4. Identify the page at `pageIndex` in the default-exported array.
5. Consult the `slide-authoring` skill for spacing rules, then edit that page in place.

If `current.json` is missing or stale, ask: "Which slide and page should I tighten? The dev server hasn't published a current page recently."
