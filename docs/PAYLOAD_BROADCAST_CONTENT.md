# Payload broadcast-content contract

The public console has a complete EN/KO/ZH/JA fallback in `public/i18n/`. A future
Payload Global or singleton can override presentation copy, but the backend schema
must first be added in the separate `erniesg/berlayar` CMS repository before these
fields will appear in Payload admin.

The optional endpoint is configured with the empty-by-default
`pf-broadcast-endpoint` meta value in `public/broadcast/index.html`. It may be same-origin or
use `https://berlayar.ai`; it is a public read endpoint and must not require browser
credentials. The client appends `locale=en|ko|zh|ja`.

The response may be the object below or `{ "docs": [object] }`:

```json
{
  "status": "published",
  "locale": "en",
  "updatedAt": "ISO-8601 timestamp supplied by Payload",
  "channels": {
    "about": {
      "transmissions": [
        {
          "label": "01 / EQUATION",
          "heading": "THE EQUATION",
          "body": "Y = f(X) + ε ...",
          "linkLabel": "Optional internal link",
          "linkHref": "/experiments/"
        }
      ]
    },
    "contribute": { "transmissions": [] },
    "experiments": { "transmissions": [] },
    "research": { "transmissions": [] },
    "log": { "transmissions": [] }
  }
}
```

Channel order is fixed as About, Contribute, Experiments, Research, Log. Each
channel renders as one internally scrollable surface; the legacy `transmissions`
array now means ordered editorial movements within that surface, not separate UI
pages. The expected movement counts are About 5, Contribute 5, Experiments 2,
Research 7, and Log 5. The first item owns the channel introduction and later
items map to the grouped sections in document order.

The adapter accepts fields only where the corresponding movement has a render
target:

- Item 0 in every channel: `label`, `heading`, `body`, and an optional link.
- Later About and Log items: `heading`, `body`, and an optional link.
- Contribute items 1–2: `heading`, `body`, and an optional link; items 3–4:
  `heading` and an optional link.
- Experiments item 1: `label`, `heading`, `body`, and an optional link.
- Research item 1 and item 6: `heading`, `body`, and an optional link; items 2–5:
  `heading` and an optional link.

Unsupported fields are rejected during normalization rather than accepted and
silently hidden. Links require paired `linkLabel`/`linkHref` values; `linkHref`
must be a same-origin, root-relative path with no backslashes. All copy renders
with `textContent`; rich text and HTML are rejected. Missing or invalid fields
retain their bundled fallback.

Renderer keys, animation settings, layout, progress/navigation behavior, response
endpoints, form fields, consent mechanics, and executable configuration remain
code-owned. Missing configuration, timeouts, network errors, non-2xx responses,
empty results, malformed JSON, unsupported locales, drafts, and invalid fields all
degrade to the bundled content without leaving a blank CRT.

## Experiments index

The `/experiments/` page is also CMS-first for its experiment cards. Payload's
`experiments` collection controls the card title, date, summary, and route; the
checked-in `public/experiments/experiments.json` remains the offline fallback.
The page's two editorial sections—Fabric and the broader Microsite visual-language
study—are intentionally code-owned for now, along with the reference images in
`public/visuals/`. This keeps the inquiry and its visual sequence stable while the
Payload schema is extended. When those passages need editorial updates, add a
localized content contract before moving them into the CMS; do not replace them
with a single unlocalized rich-text field.
