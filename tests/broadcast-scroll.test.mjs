import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const broadcast = await readFile(new URL('broadcast/index.html', publicDir), 'utf8')
const television = await readFile(new URL('index.html', publicDir), 'utf8')
const runtime = await readFile(new URL('js/preview-anims.js', publicDir), 'utf8')

test('the scroll film is gone and the console owns exactly one viewport', () => {
  assert.doesNotMatch(broadcast, /data-scene=|ScrollTrigger|gsap\.registerPlugin/)
  assert.match(broadcast, /html,body\{[^}]*overflow:hidden/)
  assert.match(broadcast, /\.pf\{[^}]*height:100svh/)
  assert.match(broadcast, /\.console\{[^}]*width:min\(1124px,100%\)/)
  assert.match(broadcast, /\.pf\{[^}]*width:min\(1180px,/)
})

test('the page loads no scripts or stylesheets over http(s)', () => {
  assert.doesNotMatch(broadcast, /<script[^>]*\ssrc=["']https?:\/\//i)
  assert.doesNotMatch(broadcast, /<link[^>]*\shref=["']https?:\/\//i)
  assert.doesNotMatch(broadcast, /@import\s+(?:url\(\s*)?["']?https?:/i)
})

test('the nested broadcast route resolves every local runtime asset from the public root', async () => {
  const scriptSources = [...broadcast.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])
  const i18nPrefix = broadcast.match(/window\.fetch\("([^"]*i18n\/)" \+ lang \+ "\.json"\)/)?.[1]
  const fixture = broadcast.match(/var RESPONSES_FIXTURE = "([^"]+)"/)?.[1]
  assert.ok(i18nPrefix, 'the locale dictionary request must be discoverable')
  assert.ok(fixture, 'the response fixture request must be discoverable')

  for (const reference of [...scriptSources, `${i18nPrefix}en.json`, fixture]) {
    const pathname = new URL(reference, 'https://performingfire.example/broadcast/').pathname.slice(1)
    await assert.doesNotReject(stat(new URL(pathname, publicDir)), `${reference} must resolve to public/${pathname}`)
  }
})

test('five preview canvases use the approved signal catalog keys', () => {
  const previews = [...broadcast.matchAll(/<button class="preview-btn bezel"[\s\S]*?<canvas data-anim="([^"]+)"/g)]
  assert.deepEqual(previews.map(match => match[1]), ['g7', 'hj', 'x3', 'r1', 'l1'])
  assert.match(broadcast, /<canvas data-anim="g7" data-signal-main>/)
  assert.match(broadcast, /<script src="\/js\/preview-anims\.js"><\/script>/)
  assert.match(broadcast, /<script src="\/js\/preview-anims3\.js"><\/script>/)
})

test('the main signal is live while previews start frozen and wake individually', () => {
  assert.match(runtime, /hasAttribute\("data-signal-main"\) && !reduced\) live\.add\(cv\)/)
  assert.match(runtime, /wake\(cv\)[\s\S]*live\.add\(cv\)/)
  assert.match(runtime, /freeze\(cv\)[\s\S]*live\.delete\(cv\)[\s\S]*draw\(cv, 1\.7\)/)
  assert.match(runtime, /aria-pressed[\s\S]*the tuned preview always stays frozen/)
  assert.match(broadcast, /pointerenter", wake/)
  assert.match(broadcast, /addEventListener\("focus", wake\)/)
})

test('the Broadcast remains manual while preserving transmission controls', () => {
  assert.doesNotMatch(broadcast, /AUTO_ADVANCE_MS|scheduleAutoAdvance/)
  assert.match(broadcast, /#transmissionPrev"\)\.addEventListener\("click", function \(\) \{ stepChannel\(-1\)/)
  assert.match(broadcast, /#transmissionNext"\)\.addEventListener\("click", function \(\) \{ stepChannel\(1\)/)
  assert.match(broadcast, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/)
})

test('the assembled TV hands channel selections to the canonical Broadcast URL', () => {
  assert.match(television, /function handoffToBroadcast\(ch\) \{[\s\S]*location\.assign\(`\/broadcast\/\?ch=\$\{ch\}\$\{lang/)
  assert.match(television, /if \(params\.has\("ch"\) \|\| hashCh\) history\.replaceState\(null, "", location\.pathname\)/)
  assert.match(television, /masterFx\.state = "collapse"; masterFx\.t0 = sceneTime\(\); masterFx\.pending = ch;[\s\S]*onComplete\(\) \{ handoffToBroadcast\(ch\); \}/)
  assert.match(television, /if \(jumpCh >= 1 && jumpCh <= 5\) \{[\s\S]*handoffToBroadcast\(jumpCh\);/)
  assert.match(television, /else if \(hashCh\) \{[\s\S]*tuneTo\(\+hashCh\)/)
  assert.doesNotMatch(television, /location\.replace\(/)
})

test('the root contains no duplicate channel copy or selected-page renderer', () => {
  assert.doesNotMatch(television, /const CHAN = \[/)
  assert.doesNotMatch(television, /<section class="page"/)
  assert.doesNotMatch(television, /function fillPage\(/)
  assert.doesNotMatch(television, /function (?:enterPage|swapPage|exitPage|syncPageToMaster)\(/)
  assert.doesNotMatch(television, /CHECKPOINT → LATER ADDITIONS|PLAYING WITH FIRE|Placeholder copy/)
})

test('the TV breathes before assembling and its side screens settle on Broadcast stills', () => {
  assert.match(television, /<title>Pεrforming Fire — An APE Camp 2026 Project<\/title>/)
  assert.match(television, /<div class="loading" id="loading" role="status" aria-live="polite">LOADING…<\/div>/)
  assert.match(television, /requestAnimationFrame\(\(\) => document\.body\.classList\.add\("ready"\)\)/)
  assert.match(television, /AUTO_REVEAL_DELAY_MS\s*=\s*800/)
  assert.match(television, /AUTO_REVEAL_DURATION\s*=\s*2\.5/)
  assert.match(television, /duration: AUTO_REVEAL_DURATION, ease: "none"/)
  assert.match(television, /baseZ = lerp\(10\.6, 8\.05, sm\(0\.06, 0\.55, p\)\) \* layoutZ/)
  assert.match(television, /function deferAutoAdvance\(\)/)
  assert.match(television, /requestAnimationFrame\(\(\) => \{[\s\S]*scrollY <= 2\) scheduleAutoAdvance\(\)/)
  assert.match(television, /addEventListener\("wheel", deferAutoAdvance, \{ passive: true \}\)/)
  assert.doesNotMatch(television, /addEventListener\("(?:wheel|touchstart|keydown)", cancelAutoAdvance, \{ once: true/)
  assert.match(television, /cabinetMass = \(w, h, d\) => w \* h \* \(0\.65 \+ d \* 0\.35\)/)
  assert.match(television, /function deviceInertia\(d\)/)
  assert.match(television, /weightLoad \* 0\.72 \+ distanceLoad \* 0\.28/)
  assert.match(television, /function physicalArrival\(u, inertia\)/)
  assert.match(television, /MASTER_ARRIVAL_P = 0\.385/)
  assert.match(television, /SIDE_ARRIVAL_P = 0\.50/)
  assert.match(television, /SIDE_STAGGER_P = 0\.082/)
  assert.match(television, /master\.group\.visible = p > MASTER_ARRIVAL_P/)
  assert.match(television, /a0 = SIDE_ARRIVAL_P \+ i \* SIDE_STAGGER_P/)
  assert.match(television, /travel = lerp\(0\.11, 0\.17, inertia\)/)
  assert.match(television, /history\.scrollRestoration = "manual"/)
  assert.match(television, /addEventListener\("pageshow", \(\) => scrollTo\(0, 0\)/)
  assert.match(television, /SIDE_STILL_T\s*=\s*1\.7/)
  assert.match(television, /function signalAt\(s, now\)/)
  assert.match(television, /function playChannel\(ch, now = sceneTime\(\)\)/)
  assert.match(television, /function pauseChannel\(ch, now = sceneTime\(\)\)/)
  assert.match(television, /if \(arriving\) \{[\s\S]*s\.signalT = t;[\s\S]*paintDeviceSignal\(d, s\.signalT\)/)
  assert.match(television, /if \(s\.phase === "arrival" && s\.frameReady\) \{[\s\S]*s\.phase = "still"/)
  assert.doesNotMatch(television, /s\.phase === "arrival" \|\| s\.phase === "off"/)
  assert.match(television, /mode === "orbit" && hoverDev === d/)
  assert.match(television, /mode !== "orbit" && currentCh === d\.chan\.ch/)
  assert.match(television, /const signalT = source \? signalAt\(source\.screen, now\) : SIDE_STILL_T/)
  assert.match(television, /masterFx\.t0 = sceneTime\(\)/)
  assert.doesNotMatch(television, /masterFx\.t0 = performance\.now\(\) \/ 1000/)
  assert.doesNotMatch(television, /outBack/)
  assert.doesNotMatch(television, /PROGRAM_ADVANCE_MS|scheduleProgrammeAdvance/)
})

test('the TV flame bookends a stable per-cycle shuffle of 火, ひ, and 불', () => {
  const middleGlyphs = television.match(/const IDLE_MIDDLE_GLYPHS = \[([\s\S]*?)\n  \];/)?.[1] || ''
  assert.match(middleGlyphs, /key: "\u706b", glyph: 2/)
  assert.match(middleGlyphs, /key: "\u3072", glyph: 4/)
  assert.match(middleGlyphs, /key: "\ubd88", glyph: 3/)
  assert.match(television, /const hi = \[/)
  const hiSource = television.match(/const hi = (\[[\s\S]*?\n    \]);/)?.[1] || '[]'
  const hiStrokes = JSON.parse(hiSource.replace(/,\s*]/g, ']'))
  assert.equal(hiStrokes.length, 1, 'ひ must keep its one sweeping loop instead of reading as two-stroke う')
  const hiStroke = hiStrokes[0]
  const bowlIndex = hiStroke.findIndex(([, y]) => y === Math.max(...hiStroke.map(point => point[1])))
  const returnIndex = hiStroke.findIndex(([x, y], index) => index > bowlIndex && x >= 0.57 && y <= 0.18)
  assert.ok(bowlIndex > 4, 'ひ must descend into a deep bowl after its top-left crown')
  assert.ok(returnIndex > bowlIndex, 'ひ must rise back to its upper-right crown after the bowl')
  assert.ok(hiStroke.at(-1)[0] >= 0.78 && hiStroke.at(-1)[1] >= 0.35, 'ひ must finish with its rightward flick')
  assert.match(television, /return \[build\(jiaguwen\), build\(zhuan\), build\(huo\), build\(bul\), build\(hi\)\]/)
  assert.match(television, /const \[huoGlyph, hiGlyph, bulGlyph\] = IDLE_MIDDLE_GLYPHS\.map\(\(\{ glyph \}\) => glyph\);/)
  const permutationSource = television.match(/const IDLE_MIDDLE_PERMUTATIONS = \[([\s\S]*?)\n  \];/)?.[1] || ''
  const permutations = [...permutationSource.matchAll(/\[(huoGlyph|hiGlyph|bulGlyph), (huoGlyph|hiGlyph|bulGlyph), (huoGlyph|hiGlyph|bulGlyph)\]/g)]
    .map(match => match.slice(1))
  assert.equal(permutations.length, 6)
  assert.equal(new Set(permutations.map(order => order.join(','))).size, 6)
  for (const order of permutations) assert.deepEqual([...order].sort(), ['bulGlyph', 'hiGlyph', 'huoGlyph'])
  assert.match(television, /function idleMiddleOrder\(cycleNo\)/)
  assert.match(television, /if \(cycleNo === idleMiddleCycle\) return idleMiddleGlyphs;/)
  assert.match(television, /const pick = idleCycleHash\(cycleNo\) % IDLE_MIDDLE_PERMUTATIONS\.length;/)
  assert.match(television, /function idleGlyphMorph\(cyc, cycleNo\)/)
  assert.match(television, /const \[first, second, third\] = idleMiddleOrder\(cycleNo\);/)
  assert.match(television, /glyphIndex: tv, nextGlyphIndex: first/)
  assert.match(television, /glyphIndex: first, nextGlyphIndex: second/)
  assert.match(television, /glyphIndex: second, nextGlyphIndex: third/)
  assert.match(television, /glyphIndex: third, nextGlyphIndex: tv/)
  assert.match(television, /return \{ glyphIndex: tv, nextGlyphIndex: tv, mix: 0, lock: 1 - sm\(18\.4, 19\.4, cyc\) \};/)
  assert.match(television, /if \(reduced\) return \{ glyphIndex: 0, nextGlyphIndex: 0, mix: 0, lock: 1 \};/)
  assert.match(television, /glyphSeat\(f\.u, glyphMorph\.glyphIndex, W, H\)/)
  assert.match(television, /glyphSeat\(f\.u, glyphMorph\.nextGlyphIndex, W, H\)/)
  assert.match(television, /px = lerp\(px, glx, glyphMorph\.lock\); py = lerp\(py, gly, glyphMorph\.lock\);/)
  assert.match(television, /const frameT = reduced \? 0 : t;/)
  assert.match(television, /if \(reduced\) \{\s*x\.clearRect\(0, 0, W, H\);\s*\} else if \(styleDef\.persist\)/)
  assert.match(television, /const elapsed = reduced \? 0 : t - \(mflyCyc0 >= 0 \? mflyCyc0 : t\);/)
  assert.match(television, /const cycleNo = Math\.floor\(elapsed \/ IDLE_CYC\);/)
  assert.match(television, /const cyc = elapsed % IDLE_CYC;/)
  assert.match(television, /const glyphMorph = idleGlyphMorph\(cyc, cycleNo\);/)
  assert.match(television, /uTime\.value = reduced && d === master \? 0 : t/)
})

test('channel selection keeps the existing master CRT tuning transition', () => {
  assert.match(television, /overlayCRT\(s, TINT\[c\.ch\], "", 0, "top"\)/)
  assert.doesNotMatch(television, /overlayCRT\(s, TINT\[c\.ch\], `CH 0\$\{c\.ch\} · \$\{c\.name\}`/)
  assert.doesNotMatch(television, /focus-blur|backdrop-filter: blur/)
  assert.match(television, /uFocusRect: \{ value: new THREE\.Vector4\(0, 0, 1, 1\) \}/)
  assert.match(television, /uFocusAmount: \{ value: 0 \}/)
  assert.match(television, /single Poisson disc stays seamless/)
  assert.match(television, /body\.docked \.hud h1 \{ font-size: clamp\(2rem, 3\.2vw, 3rem\)/)
  assert.match(television, /flyTo\.addScaledVector\(_v, 3\.25\)/)
  assert.match(television, /distance < 0\.01 \? 0 : Math\.max\(0\.22, distance \* 0\.85\)/)
  assert.match(television, /duration: reduced \? 0\.01 : 0\.85, ease: "power3\.out"/)
})

test('master tuning uses the original CRT collapse and short static burst', () => {
  assert.match(television, /idle \| collapse \| static \| chan/)
  assert.match(television, /const u = Math\.min\(1, \(now - masterFx\.t0\) \/ 0\.22\)/)
  assert.match(television, /const hh = Math\.max\(2, \(1 - u\) \* H \* 0\.5\)/)
  assert.match(television, /if \(u >= 1\) \{ masterFx\.state = "static"; masterFx\.t0 = now; \}/)
  assert.match(television, /if \(masterFx\.state === "static"\) \{[\s\S]*drawStatic\(s\);[\s\S]*now - masterFx\.t0 > 0\.3/)
  assert.doesNotMatch(television, /drawTuningBurst|transitionBuffer|Math\.min\(6, W \* 0\.006\)/)
})

test('channel focus hides the station wordmark during the handoff', () => {
  assert.match(television, /body\.channel-focus \.hud h1 \{[^}]*opacity: 0;[^}]*visibility: hidden;/)
  assert.match(television, /function tuneTo\(ch\) \{[\s\S]*document\.body\.classList\.add\("channel-focus"\)/)
  assert.match(television, /onComplete\(\) \{ handoffToBroadcast\(ch\); \}/)
})

test('the station wordmark carries the master TV fire colour without a green halo', () => {
  const wordmark = television.match(/\.hud h1 \{([\s\S]*?)\n  \}/)?.[1] || ''
  assert.match(wordmark, /text-shadow: 0 2px 22px rgba\(255,140,60,\.34\), 0 0 2px rgba\(255,214,164,\.62\);/)
  assert.doesNotMatch(wordmark, /55,255,139/)
  assert.match(television, /\.hud h1 \.eps \{ color: #ff8c3c; \}/)
})

test('reduced motion uses stable frames and hard state changes', () => {
  assert.match(runtime, /prefers-reduced-motion: reduce/)
  assert.match(runtime, /if \(cv\.hasAttribute\("data-signal-main"\) && !reduced\)/)
  assert.match(broadcast, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(broadcast, /if \(reduced\.matches\) \{ return; \}/)
})

test('the console payload stays within the former 900 KB budget', async () => {
  const localScripts = [...broadcast.matchAll(/<script src="(\/[^"?]+)"/g)].map(match => match[1].slice(1))
  assert.deepEqual(localScripts, ['js/preview-anims.js', 'js/preview-anims3.js', 'js/broadcast-content.js', 'js/research-gallery.js'])
  const payloadFiles = [
    'broadcast/index.html',
    ...localScripts,
    'research/archive-snapshot.json',
    'i18n/en.json',
    'i18n/ko.json',
    'i18n/zh.json',
    'i18n/ja.json',
    'fixtures/artist-responses.json',
  ]
  let total = 0
  for (const file of payloadFiles) {
    total += (await stat(new URL(file, publicDir))).size
  }
  assert.ok(total <= 900 * 1024, `${total} bytes exceeds the 900 KB budget`)
})
