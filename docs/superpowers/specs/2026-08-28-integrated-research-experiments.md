# Integrated Research and Experiments Design

**Status:** Approved with corrections on 2026-08-28

## Goal

Turn the five-channel broadcast into one coherent artist statement, integrate a compact research gallery with a prominent Scores strand, and expose Fabric v0, Fabric v1, Fabric 2.0, and the Microsite as a truthful experiment lineage.

## Whole-site narrative

The site opens with: **“An evolving performance about what escapes the systems we build.”**

### CH01 — About

About must carry the complete artistic argument across five short transmissions:

1. Technology is something people make, use, and depend on, but never fully control. Fire is a material that gathers, sustains, destroys, and transforms.
2. `Y = f(X) + ε`: `X` is what people bring, `f(X)` is the system’s attempt to organise it, and `ε` is what refuses to fit.
3. Contributions remain situated human material rather than anonymous data.
4. Nam June Paik and Fluxus provide a method: scores turn ideas into instructions, actions, and situations.
5. Research, contributions, and experiments pass through performer choices into image, sound, fabric, and movement. The work stages what remains unsettled; it does not predict technology’s future.

### CH02 — Contribute

Explain what people may contribute, how it enters the work, the publication/moderation boundary, and how to submit. Do not call an unimplemented processing pipeline complete.

### CH03 — Experiments

Use two transmissions:

1. A compact three-step Fabric lineage.
2. The Microsite’s development of the five-channel broadcast form.

The Fabric distinctions are exact:

- **v0 / Material:** direct hand-and-mouse surface interaction.
- **v1 / Audio-reactive:** audio maps into individual transformation parameters already present in the prototype.
- **2.0 / Performance composition:** in development; timed, repeatable cues arrange intact, dissolve, particle burst, glitter, glitch, and recovery states into a performance score.

### CH04 — Research

Research remains inside the existing console and uses the normal transmission transport. It contains seven transmissions:

1. **Score candidates:** first-class and visually prominent. Show collection-record verification separately from score-text verification.
2. **Public-online archive snapshot:** show verified counts and observation dates without summing overlapping categories.
3. **Sample records A:** ANTIEGG posts, ANTIEGG legacy proof, NJP Center main.
4. **Sample records B:** NJP Video Archive catalogue and one linked PDF.
5. **Sample records C:** NJP Video Library video, image, and PDF.
6. **Sample records D:** NJP Video Library human SRT and official NJP YouTube.
7. **Evidence and rights:** explain readable local material and the public-rendering boundary.

Each sample card opens a reader inside the console. The reader shows title, source, kind, status, note, and a safe original-source link. It never injects record data as HTML. Cards use buttons, support keyboard operation, and close with an explicit button or Escape.

### CH05 — Log

Replace a generic proposed schedule with a concise decision record: why the log exists, archive governance, Fabric material/audio findings, the broadcast-form decision, and the next Fabric 2.0 composition question.

## Verified archive snapshot

Observation dates must remain visible:

- 2026-08-03: 1,463 public ANTIEGG WordPress post metadata records.
- 2026-07-27: 29 NJP Center records.
- 2026-07-27: 678 NJP Video Library catalogue records, containing 401 video, 205 image, and 72 PDF records.
- 2026-07-27: 38 human SRT caption files spanning 18 video assets.
- 2026-07-27: 8 linked NJP Video Archive PDFs.
- 2026-07-27: 156 official NJP YouTube audiovisual assets.

These categories overlap. The interface must not show a single summed total.

## Representative samples

Selection rule: use the first canonical record/file in each verified inventory; samples are evidence of coverage, not curatorial endorsement.

| ID | Source/type | Title | Original source | Public display status |
|---|---|---|---|---|
| `antiegg-post-35015` | ANTIEGG post | 모든 울타리에는 검은 양이 살고 있다 | `https://antiegg.kr/35015/` | Metadata and source link |
| `antiegg-legacy-25502` | ANTIEGG legacy proof | Legacy Fluxus article proof | `https://antiegg.kr/25502/` | Held/blocked; metadata and link only |
| `njp-center-39` | NJP Center record | 큐레이터와 함께 7: 백남준, <코끼리 수레> | `https://njp.ggcf.kr/mediaObjects/39` | Metadata and source link |
| `njp-videoarchive-1` | NJP Video Archive catalogue | Korea double Face. Processed with Fairlight CVI, for Mr. Dasan (see 55) | `https://njp.ggcf.kr/pages/videoarchive` | Tape metadata only; source held |
| `njp-videoarchive-pdf-01` | NJP Video Archive linked PDF | 01-nP2DybQ0TFmSh9eNcZzZKmynjUwmscuyvGvsuLYk.pdf | `https://njp.ggcf.kr/pages/videoarchive` | Rendering policy-gated |
| `njpvideo-video-790` | NJP Video Library video | Ryuich Sakamoto performance footage | `https://njpvideo.ggcf.kr/storage/2022/01/24/107221/107221/Proxy/proxy_107221.mp4` | Link only until display policy permits more |
| `njpvideo-image-455` | NJP Video Library image | #Art #Commons #NamJunePaik | `https://njpvideo.ggcf.kr/storage/2022/01/05/106179/106179/Proxy/Proxy_106179.jpg` | Link only until display policy permits more |
| `njpvideo-pdf-383` | NJP Video Library PDF | The World’s Oldest TV: Time and Spacetime in the Early Work of Nam June Paik | `https://njpvideo.ggcf.kr/storage/2022/01/05/105125/105125.pdf` | Native readable source; reproduction policy-gated |
| `njpvideo-srt-804` | NJP Video Library human SRT | Nam June Paik Video Art 30 years (1984) | `https://njpvideo.ggcf.kr/storage/2022/01/24/107235/107235/Attach/ATTACH_107235_24359_ko.srt` | Human captions; reproduction policy-gated |
| `njp-youtube-05y8KEPGY9I` | Official NJP YouTube | 《불연속의 접점들》 Circuits of Chance (2026) 참여 작가 인터뷰 | `https://www.youtube.com/watch?v=05y8KEPGY9I` | Original-source link |

Score candidates include `Paper Piece` (catalogue 552), `Zen for Walking` (570/571/588), `Zen for Head` (575/581), `Symphony No. 6` (576/609), `MS-Fluxussus (Symphony No.7)` (578), `Fluxus Sonata No.4` (587), and `Zen for Film` (590). The public sample is catalogue 570 / asset 106344. Label every one **“collection record verified · score candidate”**, never “verified score,” until its instruction text is human-confirmed.

## Data and rendering architecture

- Add a small, committed presentation manifest at `public/research/archive-snapshot.json`.
- Add `public/js/research-gallery.js` to validate and render that manifest with `textContent`, safe `https:`/same-origin links, visible fallback state, and the inline reader.
- Keep corpus raw media, OCR, ASR, captions, and downloaded PDFs outside this repository.
- Keep `public/js/broadcast-content.js` copy-only; do not expand the remote CMS trust boundary.
- Keep the total broadcast payload below its existing 900 KB contract.
- Preserve the fixed-viewport console. Divide samples across transmissions rather than adding page-level scrolling.

## Experiment index architecture

The CMS card wall remains a live feed. A static, code-owned lineage section underneath it guarantees that Fabric v0, Fabric v1, Fabric 2.0, and the Microsite remain visible even when live CMS content replaces the local JSON fallback.

Do not modify `public/experiments/experiments.json` merely to add v1 or 2.0. Do not modify the currently dirty Fabric v1 implementation files or tests.

## Localization

All new interface and editorial strings must exist in EN, KO, ZH, and JA dictionaries with identical key sets. EN is source-reviewed; KO/ZH/JA remain marked machine-draft until native review.

## Accessibility and responsive behavior

- Preserve keyboard-accessible channel and transmission controls.
- Sample records use real buttons; source links use safe anchors.
- The inline reader has a labelled close control, restores focus to the opening card, and closes on Escape.
- No information is available only through color.
- The console remains usable at narrow widths without page-level scrolling.
- Reduced-motion behavior remains unchanged.

## Acceptance criteria

1. The copy across all five channels reads as one coherent artist statement and process record.
2. Fabric v1 and Fabric 2.0 are distinct in both the broadcast and experiments index.
3. Fabric 2.0 is visibly in development and has no false live link.
4. CH04 opens with Scores, shows the verified archive-size snapshot, and includes exactly one representative record for every source/type listed above.
5. Every research sample opens inside the existing console and retains provenance and display status.
6. No governed raw/derived corpus content is copied into the public repository.
7. Existing Fabric v1 dirty files remain untouched.
8. Focused tests, the full suite, rendered desktop/mobile checks, and `scripts/agent-evidence` pass before completion.
