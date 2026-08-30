import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import vm from 'node:vm'

const publicDir = new URL('../public/', import.meta.url)
const broadcast = await readFile(new URL('broadcast/index.html', publicDir), 'utf8')
const television = await readFile(new URL('index.html', publicDir), 'utf8')
const runtime = await readFile(new URL('js/preview-anims.js', publicDir), 'utf8')
const english = JSON.parse(await readFile(new URL('i18n/en.json', publicDir), 'utf8'))

function televisionChannels () {
  const source = television.match(/const CHAN = (\[[\s\S]*?\n  \]);/)?.[1]
  assert.ok(source, 'the homepage channel model must be readable')
  return vm.runInNewContext(`(${source})`)
}

function renderTelevisionChannel (channel) {
  const channels = televisionChannels()
  const fillPage = television.match(/function fillPage\(ch\) \{[\s\S]*?\n  \}(?=\n  function preparePage)/)?.[0]
  assert.ok(fillPage, 'the homepage channel renderer must be readable')
  const element = tagName => ({
    tagName: tagName.toUpperCase(),
    children: [],
    textContent: '',
    className: '',
    href: '',
    attributes: {},
    appendChild (child) { this.children.push(child); return child },
    replaceChildren (...children) { this.children = children },
    setAttribute (name, value) { this.attributes[name] = value },
  })
  const kicker = element('div')
  const heading = element('h2')
  const body = element('div')
  const page = {
    style: { setProperty () {} },
    querySelector: selector => ({ '.kicker': kicker, h2: heading, '.body': body })[selector],
  }
  vm.runInNewContext(`${fillPage}; fillPage(${channel})`, {
    CHAN: channels,
    TINT: { 1: '#1', 2: '#2', 3: '#3', 4: '#4', 5: '#5' },
    page,
    document: { createElement: element },
  })
  return { kicker, heading, body }
}

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
  assert.match(broadcast, /#transmissionPrev"\)\.addEventListener\("click", function \(\) \{ stepTransmission\(-1\)/)
  assert.match(broadcast, /#transmissionNext"\)\.addEventListener\("click", function \(\) \{ stepTransmission\(1\)/)
  assert.match(broadcast, /event\.key === "ArrowLeft" \|\| event\.key === "ArrowRight"/)
})

test('the assembled homepage carries the approved five-channel copy and Fabric lineage', () => {
  const channels = televisionChannels()
  const [about, contribute, experiments, research, log] = channels

  assert.equal(about.title, english['bc.about.1.heading'])
  assert.deepEqual([...about.body], [1, 2, 3, 4, 5].map(index => english[`bc.about.${index}.body`]))

  assert.equal(contribute.title, english['bc.contribute.1.heading'])
  assert.deepEqual([...contribute.body], [
    english['bc.contribute.1.body'],
    english['bc.contribute.2.body'],
    english['bc.ch02.consent'],
    english['bc.contribute.3.note'],
  ])

  assert.equal(experiments.title, english['bc.log.3.heading'])
  assert.deepEqual([...experiments.body], [
    english['bc.experiments.fabricV0.detail'],
    english['bc.experiments.fabricV1.detail'],
    english['bc.experiments.fabric2.detail'],
    english['bc.experiments.microsite.body'],
  ])
  assert.deepEqual(JSON.parse(JSON.stringify(experiments.links)), [
    { href: '/experiments/fabric/', label: english['bc.experiments.fabricV0.link'] },
    { href: '/experiments/fabric-v1/', label: english['bc.experiments.fabricV1.link'] },
    { href: '/experiments/', label: 'OPEN EXPERIMENT INDEX →' },
  ])

  assert.equal(research.title, english['bc.research.scores.heading'])
  assert.deepEqual([...research.body], [
    english['bc.research.scores.body'],
    english['bc.research.counts.body'],
    english['bc.research.3.body'],
    english['bc.research.4.body'],
  ])

  assert.equal(log.title, english['bc.log.1.heading'])
  assert.deepEqual([...log.body], [1, 2, 3, 4, 5].map(index => english[`bc.log.${index}.body`]))

  assert.doesNotMatch(television, /HOW WILL WE GREET NEW TECHNOLOGY\?|Placeholder copy/)
})

test('the assembled Experiments channel renders working Fabric and index links', () => {
  const { body } = renderTelevisionChannel(3)
  const paragraphs = body.children.filter(node => node.tagName === 'P')
  const navigation = body.children.find(node => node.tagName === 'NAV')

  assert.equal(paragraphs.length, 4)
  assert.ok(navigation, 'experiment links must be rendered inside the assembled CRT')
  assert.equal(navigation.attributes['aria-label'], 'EXPERIMENTS links')
  assert.deepEqual(navigation.children.map(link => [link.href, link.textContent]), [
    ['/experiments/fabric/', 'OPEN FABRIC v0 →'],
    ['/experiments/fabric-v1/', 'OPEN FABRIC v1 →'],
    ['/experiments/', 'OPEN EXPERIMENT INDEX →'],
  ])
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
  assert.match(television, /pauseChannel\(leavingCh\);[\s\S]*mode = "orbit"; currentCh = 0/)
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

test('channel pages remain framed by the main CRT throughout entry and exit', () => {
  assert.match(television, /<div class="page-screen">/)
  assert.match(television, /overlayCRT\(s, TINT\[c\.ch\], "", 0, "top"\)/)
  assert.doesNotMatch(television, /overlayCRT\(s, TINT\[c\.ch\], `CH 0\$\{c\.ch\} · \$\{c\.name\}`/)
  assert.doesNotMatch(television, /focus-blur|backdrop-filter: blur/)
  assert.match(television, /uFocusRect: \{ value: new THREE\.Vector4\(0, 0, 1, 1\) \}/)
  assert.match(television, /uFocusAmount: \{ value: 0 \}/)
  assert.match(television, /single Poisson disc stays seamless/)
  assert.doesNotMatch(television, /\.page-screen \{[\s\S]{0,700}backdrop-filter/)
  assert.match(television, /body\.docked \.hud h1 \{ font-size: clamp\(2rem, 3\.2vw, 3rem\)/)
  assert.match(television, /\.page h2 \{[\s\S]*max-width: none;/)
  assert.match(television, /\.page \.body \{ max-width: none; \}/)
  assert.match(television, /\.page p \{[\s\S]*font-size: clamp\(1\.25rem, 1\.35vw, 1\.5rem\); line-height: 1\.55/)
  assert.match(television, /\.page h2 \{[\s\S]*font-size: clamp\(2\.5rem, 4vw, 4\.5rem\)/)
  assert.match(television, /function syncPageToMaster\(\)/)
  assert.match(television, /master\.screenMesh\.localToWorld\(pageCorners\[i\]\)/)
  assert.match(television, /--screen-clip["'], `polygon\(\$\{polygon\}\)`/)
  assert.match(television, /--page-presence["'], sm\(0\.54, 0\.9, flyT\)/)
  assert.match(television, /focusWidth = widthPx \* 1\.52, focusHeight = heightPx \* 1\.32/)
  assert.match(television, /postMat\.uniforms\.uFocusRect\.value\.set/)
  assert.match(television, /postMat\.uniforms\.uFocusAmount\.value = sm\(0\.32, 0\.82, flyT\)/)
  assert.match(television, /flyTo\.addScaledVector\(_v, 3\.25\)/)
  assert.match(television, /distance < 0\.01 \? 0 : Math\.max\(0\.22, distance \* 0\.85\)/)
  assert.match(television, /duration: reduced \? 0\.01 : 0\.85, ease: "power3\.out"/)
  assert.match(television, /duration: reduced \? 0\.01 : 0\.7, ease: "power3\.in"/)
  assert.match(television, /preparePage\(ch\);[\s\S]*gsap\.to\(\{ t: 0 \}/)
  assert.match(television, /onComplete\(\) \{[\s\S]*page\.classList\.remove\("show"\);[\s\S]*mode = "orbit"/)
  assert.doesNotMatch(television, /setTimeout\(\(\) => page\.classList\.remove\("show"\), 460\)/)
})

test('master tuning uses the original CRT collapse and short static burst', () => {
  assert.match(television, /idle \| collapse \| static \| chan/)
  assert.match(television, /const u = Math\.min\(1, \(now - masterFx\.t0\) \/ 0\.22\)/)
  assert.match(television, /const hh = Math\.max\(2, \(1 - u\) \* H \* 0\.5\)/)
  assert.match(television, /if \(u >= 1\) \{ masterFx\.state = "static"; masterFx\.t0 = now; \}/)
  assert.match(television, /if \(masterFx\.state === "static"\) \{[\s\S]*drawStatic\(s\);[\s\S]*now - masterFx\.t0 > 0\.3/)
  assert.doesNotMatch(television, /drawTuningBurst|transitionBuffer|Math\.min\(6, W \* 0\.006\)/)
})

test('channel focus hides the station wordmark from selection until the exit completes', () => {
  assert.match(television, /body\.channel-focus \.hud h1 \{[^}]*opacity: 0;[^}]*visibility: hidden;/)
  assert.match(television, /function tuneTo\(ch\) \{[\s\S]*document\.body\.classList\.add\("channel-focus"\)/)
  assert.match(television, /function enterPage\(ch\) \{[\s\S]*document\.body\.classList\.add\("channel-focus"\)/)
  assert.match(television, /onComplete\(\) \{[\s\S]*document\.body\.classList\.remove\("channel-focus"\);[\s\S]*mode = "orbit"/)
})

test('zoomed channel copy dims the entire signal without a local text plate', () => {
  const pageScreen = television.match(/\.page-screen \{([\s\S]*?)\n  \}/)?.[1] || ''
  assert.match(pageScreen, /background: rgba\(4,8,6,\.62\);/)
  assert.match(pageScreen, /filter: none;/)
  assert.match(pageScreen, /box-shadow: none;/)
  assert.doesNotMatch(pageScreen, /repeating-linear-gradient|radial-gradient/)
  assert.doesNotMatch(television, /\.page (?:h2|p)[^{]*\{[^}]*background:/)
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
