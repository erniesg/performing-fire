# Performing Fire — design reference (2026-07-27)

Local snapshot of the machine-catalogue / channel-preview design exploration.
Live (private) artifacts: decision board https://claude.ai/code/artifact/05390b10-cf69-4e13-a955-ae282e19ca30
· orbit viewer https://claude.ai/code/artifact/70cdc372-1937-4663-ae4c-72cc2d18331b

## Files

- `decision-board.html` — the full board, self-contained (open directly in a browser).
  Live animated preview signals per channel, godai element studies with the gorintō
  render, 40-machine catalogue with in-page ⟲ rotate (WebGL), proof renders.
- `orbit-viewer.html` — standalone drag-to-rotate viewer, ten models.
- `browser-proofs.html` — self-contained Earth/Water implementation proof.
  Earth is Canvas 2D. Water uses three real Blender Mantaflow/Cycles liquid
  solves delivered as small browser-native H.264 loops.
  Serve the repository (rather than opening this file with `file://`) so browser
  media behavior matches the eventual site:

  ```bash
  python3 -m http.server 4173 --bind 127.0.0.1
  # http://127.0.0.1:4173/docs/design/browser-proofs.html
  ```

  Add `?focus=earth` or `?focus=water` for a clean embeddable channel frame.
  Focused Water is a `300svh` scroll proof: the sticky sphere moves through
  low flow → impact → splash while the simulated water continues playing
  autonomously inside each state. Add `&scrolltest=1` for deterministic poster
  states and `&reduced=1` to exercise the static reduced-motion path.
- `src/` — everything is regenerable from here:
  - `catalogue.py` — every 3D model as parametric Blender (5.1) Python.
    Render: `blender -b -P catalogue.py -- <names>|ALL` · export glTF:
    `blender -b -P catalogue.py -- EXPORT <names>` · debug: `-- INSPECT <name>`.
  - `catalogue.blend` — saved scene; open and orbit anything.
  - `bake.html` / `previews.html` — canvas texture + static-preview bakers
    (headless Chrome screenshot, `?s=<name>`).
  - `preview-anims.js|2|3` — the animated channel-signal library (registry
    `PF_ANIMS`; call `PF_INIT()` after ALL batches are registered). Includes the
    live chimera-state and braided-field simulations (per-tile state via 6th
    draw arg).
  - `board3-build.py` / `viewer-build.py` — assemble the two HTML pages
    (base64-embed renders/GLBs/fonts; three.js r147 UMD in scratchpad vendor/).
  - `board-orbit.js` — the in-board rotate modal.
  - `water_fluid_sim.py` — Blender 5.1 FLIP liquid generator. It builds the
    overhead inflow, shallow starting pool, sphere/basin collision effectors,
    drains, reconstructed mesh, optional spray, Cycles water material, hero
    render, and full PNG sequence.
  - `water-fluid.blend` — setup-only impact scene with an empty local cache
    target; open it to inspect the domain, flows, effectors, material, camera,
    and lights before committing to a bake.
  - `encode_water_fluid_media.py` — extracts the approved physical windows from
    those sequences and writes the three H.264 loops plus WebP posters.
- `glb/` — glTF exports (the viewer's models).
- `textures/` — baked screen/material textures.
- `renders/godai-layers/` — the current five material studies, rendered in the
  same Blender studio for a fair side-by-side comparison.
- `renders/browser-proofs/earth.png` and `water.png` — verified headless-Chrome
  captures of the two live proofs; regenerate with the matching `?focus=`.
- `renders/browser-proofs/water-fluid-low.mp4`,
  `water-fluid-impact.mp4`, and `water-fluid-splash.mp4` — fixed-camera,
  muted H.264 loops rendered from three real liquid solves. Matching `.webp`
  files are their reduced-motion and failure posters.
- `renders/browser-proofs/water-fluid-low-flow-hero.png`,
  `water-fluid-proof-hero.png`, and `water-fluid-splash-hero.png` — full-quality
  review frames for the restrained thread, continuous impact, and asymmetric
  crown states.
- `renders/browser-proofs/water-bearing.png`, `water-flow.png`, and
  `water-surge.png` — superseded static wet-skin experiments retained as design
  history and a last-resort legacy poster.
- `renders/browser-proofs/water-autoflow.gif` and
  `water-autoflow-closeup.gif` — pointer-free timed captures retained from the
  superseded bearing/basin shader study. The current proof is verified through
  its solver-backed low-flow → impact → splash states.
- `textures/pbr/granite-tile-03/` — local 1K PBR source maps plus a grout-free
  crop used for the slab and kugel materials. Source:
  [Poly Haven, Granite Tile 03](https://polyhaven.com/a/granite_tile_03), CC0.
- `src/godai_layers.py` — procedural geometry, shader nodes, lights, animation
  hooks, and renderer for the five current godai layers. Earth and Water read
  the checked-in CC0 PBR maps above:

  ```bash
  blender -b -P docs/design/src/godai_layers.py -- all
  blender -b -P docs/design/src/godai_layers.py -- water fire wind void
  blender -b -P docs/design/src/godai_layers.py -- water-states
  ```

- `src/water_fluid_sim.py` — the current Water source of truth. Always use a
  fresh cache directory; the script refuses to let stale cache data pass as a
  new solve:

  ```bash
  # Fast pipeline check
  blender -b -P docs/design/src/water_fluid_sim.py -- \
    --profile smoke \
    --cache-dir /private/tmp/pf-water-smoke \
    --output /private/tmp/pf-water-smoke.blend \
    --bake --render

  # One-command state bake + hero + full PNG sequence
  blender -b -P docs/design/src/water_fluid_sim.py -- \
    --profile low-flow \
    --cache-dir /private/tmp/pf-water-low \
    --output /private/tmp/pf-water-low.blend \
    --render --render-sequence \
    --sequence-dir docs/design/renders/browser-proofs/water-fluid-low-flow-sequence
  ```

  Replace `low-flow` with `proof` or `splash` for the other two regimes.
  After all three sequences exist:

  ```bash
  python3 docs/design/src/encode_water_fluid_media.py
  ```

## Decisions so far (owner picks ★, leaders ✦)

- CH03 EXPERIMENTS ★ magnet breathe · CH04 RESEARCH ★ punch data · CH05 LOG ★ moon phases
- CH01 ABOUT ✦ chromatic lock (five channel-tinted waves cohering white)
- CH02 CONTRIBUTE — contenders: chimera field (live Kuramoto–Battogtokh sim),
  braided field (owner's "open braid" spec at full density)
- Godai: earth ✦ columbarium data centre (owner's idea) / slabs / open-frame rack;
  fire = fabric pyramid + Candle TV; water = orb + moon + abstract moon jars;
  wind = dish + tape; void = hōju + sign-off dot
- Stupa = gorintō of machines: catalog cube → orb sphere → fire pyramid →
  dish crescent → hōju jewel

## Canonical form contract (researched 2026-07-27)

The gorintō is not five arbitrary “elemental objects.” The Metropolitan Museum
of Art identifies its exact formal sequence as Earth = square, Water = sphere,
Fire = pyramid, Wind = half-moon, and Air/Void = jewel. Machine behavior and
regional material references belong *inside* those silhouettes; they do not
replace them.

Source: [The Met, Gorintō (Five-Element Pagoda)](https://www.metmuseum.org/art/collection/search/77911).

| Layer | Machine | Physical verb | Motion rule |
|---|---|---|---|
| Earth · square | **Upright archive slabs** | stores | The browser proof compares one complete monolithic slab with four separate upright slabs side by side. Every feed remains a full-height granite record with visible cubic depth—no surface glyphs, horizontal cuts, centre crack, glowing seam, or staggered heights. |
| Water · sphere | **Pressure sphere / hydraulic fountain** | bears / splits / sheds | A real overhead stream falls under gravity, collides with the polished red-granite sphere, divides around it, and transfers momentum into a shallow receiving basin. Scroll selects low-flow, impact, and crown-splash regimes while each solver clock keeps running—never blue paint or a hand-authored water mask. |
| Fire · pyramid | **Kiln pyramid** | contains / transforms | The outer mass remains pyramidal. Inside it, a refractory chamber, firemouth, paired stoke apertures, heat gradient, soot, and exhaust borrow the *operating logic* of Singapore’s dragon kilns. Do not substitute a long tunnel for the pyramid. |
| Wind · half-moon | **Receiver crescent** | carries laterally | A proper half-moon/crescent dish receives physical oxide tape or pressure ribbons from one side. Phase travels laterally; the silhouette stays crescent, not a generic satellite dish. |
| Void · jewel | **Dead CRT hōju** | remains | A compact wish-jewel encloses a nearly extinguished phosphor body. Scan structure settles into one standby point; the outline must remain the canonical jewel, not a random glass blob. |

The Water reference keeps the kugel fountain’s improbable massive moving
sphere, then exposes the hidden hydraulic system as an overhead falling stream.
The sphere and bearing remain the machine; clear refraction, gravity, impact,
sheet breakup, and spray make its water load visible without colouring the
stone blue. Singapore Botanic Gardens records Ueli Fausch’s granite *Swiss
Granite Fountain* in its sculpture collection:
[NParks, Sculptures in the Gardens](https://sbg.nparks.gov.sg/attractions/sculptures-in-the-gardens/).

The Fire reference is also a mechanics/material reference, not the final
silhouette. Singapore’s Thow Kwang dragon kiln is a long hollow semi-circular
brick tunnel built on a slope, with paired stoke holes and a rear damper/chimney.
Those facts justify the chamber, ports, masonry, soot, and travelling heat, while
the gorintō contract still requires a pyramid:
[NHB Roots, The Dragon Kiln Breathes](https://www.roots.gov.sg/stories-landing/stories/the-dragon-kiln-breathes-thow-kwang-dragon-kiln/story).

## Browser Water implementation

`browser-proofs.html` now treats physics and optics as separate jobs:

1. Blender creates a liquid Domain, an overhead liquid Inflow, a one-shot
   shallow pool, the granite sphere and five basin pieces as collision
   Effectors, and two hidden Outflows. Scene gravity, adaptive FLIP timesteps,
   mesh reconstruction, and secondary spray produce the changing topology.
2. Three compact solves establish different forces rather than three modeled
   silhouettes: `low-flow` is a narrow off-axis thread; `proof` is a connected
   continuous impact; `splash` is an off-axis pulse captured after the column
   breaks into a crown.
3. Cycles renders the same locked camera and PBR set for every frame. Water uses
   transmission, IOR `1.333`, neutral absorption, and no cyan base tint. The
   H.264 files are only browser delivery of those simulated frames; they are
   not the source of the motion.
4. Scroll controls only the semantic blend weights. Native video time remains
   autonomous, so water keeps falling after scrolling stops. Only the active
   clip and its blend neighbour play; hidden or offscreen clips pause.
5. The focused proof keeps its sticky `100svh` screen within a `300svh` track.
   `prefers-reduced-motion` and deterministic tests do not request video sources
   at all; they snap among the matching WebP posters. Touch keeps native
   vertical scrolling via `touch-action: pan-y`, and a failed or blocked clip
   falls back without a black frame.

This architecture is deliberate. A shallow height-field shader can create
ripples and refraction, but not a vertical jet, overhang, sheet turnover,
collision wrapping, or detached spray. glTF morph targets are also the wrong
delivery shape for a remeshed liquid because every target is expressed as
attribute deltas against one base mesh. Fixed-camera video preserves the
changing topology at a fraction of the runtime and memory cost.

Primary technical references:

- [Blender liquid simulation workflow](https://docs.blender.org/manual/en/4.1/physics/fluid/introduction.html)
- [Blender Flow / Inflow settings](https://docs.blender.org/manual/en/4.2/physics/fluid/type/flow.html)
- [Blender liquid mesh reconstruction](https://docs.blender.org/manual/en/4.2/physics/fluid/type/domain/liquid/mesh.html)
- [Blender liquid secondary particles](https://docs.blender.org/manual/en/4.5/physics/fluid/type/domain/liquid/particles.html)
- [Khronos glTF 2.0 morph targets](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-morph-targets)

Recommended motion implementation: Earth stays still while its one-feed and
multiple-feed slab arrangements are judged side by side. Water alone uses
solver footage because topology change is its content; the three regimes share
one browser phase clock. Fire needs heat to travel through the pyramidal chamber
toward its exhaust; Wind needs phase-linked ribbons across the crescent; Void
needs a phosphor afterimage to settle before the standby point remains. Do not
turn the full five-layer wall into unrelated looping videos.

## Design laws (learned the hard way)

1. DENSITY: winners fill the frame with structured signal; sparse elements on
   black die on sight.
2. Signal phenomena, never pictograms, never text tiles, never literal flames.
3. One phosphor tint per channel; no white flashes (intensity carries the peak).
4. An abstraction reads as "contribute" only with a protagonist / visible
   cause-and-effect.
5. Variants side-by-side, never one-at-a-time.
6. Blender traps: transform_apply defaults bake location (pass explicit flags);
   float strings in datablock names crash Blender (stoi overflow); screens sit
   ~0.03 proud of bezels; round tubes get shader-masked round screens.
7. Verify automatic animation with pointer-free timed frames and a localized
   pixel diff; a single screenshot cannot prove motion.
