# Payload broadcast-content contract

The public console has a complete EN/KO/ZH/JA fallback in `public/i18n/`. A future
Payload Global or singleton can override presentation copy, but the backend schema
must first be added in the separate `erniesg/berlayar` CMS repository before these
fields will appear in Payload admin.

The optional endpoint is configured with the empty-by-default
`pf-broadcast-endpoint` meta value in `public/index.html`. It may be same-origin or
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

Channel order is fixed as About, Contribute, Experiments, Research, Log. Payload
array order is transmission order. The adapter accepts only `label`, `heading`,
`body`, and a paired root-relative `linkLabel`/`linkHref`. All values render with
`textContent`; rich text and HTML are rejected. Missing or invalid fields retain
their bundled fallback.

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
