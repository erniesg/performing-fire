# Share assets

`og.svg` is the **source of truth** for the 1200x630 social share card. It is hand-authored,
uses only system font stacks, and fetches nothing at render time.

## TODO(og-png): render the raster

`og.png` is **not checked in yet**, so `og:image` currently points at `og.svg`. Most social
platforms (X/Twitter, Slack, iMessage, WhatsApp, LinkedIn) do not render SVG share images, so
the card will not preview until the PNG lands.

The sandbox that produced this commit had no image tooling — no ImageMagick, `rsvg-convert`,
Inkscape, `cairosvg`, or Pillow — and per the issue's stop conditions nothing may be fetched at
build time. Render it locally with whichever of these you have:

```bash
rsvg-convert -w 1200 -h 630 og.svg -o og.png
# or
magick -background none -density 144 og.svg -resize 1200x630 og.png
# or
inkscape og.svg --export-type=png --export-width=1200 --export-height=630 -o og.png
```

The renderer needs a CJK font installed, or `퍼포밍 파이어` and `미래의 살아있는 토템` render as tofu.

Then point `og:image` at `/share/og.png` in `public/index.html`, `public/broadcast.html`, and
`public/experiments/index.html`, and delete the `TODO(og-png)` comment from each. Drop this
section once that is done — `tests/meta.test.mjs` enforces the swap either way.

## Contract enforced by `tests/meta.test.mjs`

- All three pages reference the same `og:image`, absolute, under `https://performingfire.berlayar.ai/share/`.
- The referenced file is checked in and at most 250 KB.
- If it is `og.png`, its IHDR must read exactly 1200x630.
- If it is `og.svg`, the `TODO(og-png)` marker must be present here and in all three pages.
