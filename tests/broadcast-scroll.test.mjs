import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const broadcast = await readFile(new URL('index.html', publicDir), 'utf8')
const television = await readFile(new URL('experiments/firefly-console/index.html', publicDir), 'utf8')
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

test('five preview canvases use the approved signal catalog keys', () => {
  const previews = [...broadcast.matchAll(/<button class="preview-btn bezel"[\s\S]*?<canvas data-anim="([^"]+)"/g)]
  assert.deepEqual(previews.map(match => match[1]), ['g7', 'hj', 'x3', 'r1', 'l1'])
  assert.match(broadcast, /<canvas data-anim="g7" data-signal-main>/)
  assert.match(broadcast, /<script src="js\/preview-anims\.js"><\/script>/)
  assert.match(broadcast, /<script src="js\/preview-anims3\.js"><\/script>/)
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

test('the TV breathes before assembling and its side screens settle on Broadcast stills', () => {
  assert.match(television, /<title>Pεrforming Fire — An APE Camp 2026 Project<\/title>/)
  assert.match(television, /AUTO_REVEAL_DELAY_MS\s*=\s*3000/)
  assert.match(television, /AUTO_REVEAL_DURATION\s*=\s*5/)
  assert.match(television, /duration: AUTO_REVEAL_DURATION, ease: "none"/)
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
  assert.match(television, /const live = hoverDev === d/)
  assert.match(television, /s\.liveFrom = s\.signalT/)
  assert.match(television, /s\.signalT = s\.liveFrom \+ \(t - s\.liveAt\)/)
  assert.match(television, /else if \(s\.phase === "live"\)[\s\S]*s\.phase = "still"/)
  assert.doesNotMatch(television, /outBack/)
  assert.doesNotMatch(television, /PROGRAM_ADVANCE_MS|scheduleProgrammeAdvance/)
})

test('channel pages remain framed by the main CRT throughout entry and exit', () => {
  assert.match(television, /<div class="page-screen">/)
  assert.match(television, /function syncPageToMaster\(\)/)
  assert.match(television, /master\.screenMesh\.localToWorld\(pageCorners\[i\]\)/)
  assert.match(television, /--screen-clip["'], `polygon\(\$\{polygon\}\)`/)
  assert.match(television, /--page-presence["'], sm\(0\.54, 0\.9, flyT\)/)
  assert.match(television, /flyTo\.addScaledVector\(_v, 3\.25\)/)
  assert.match(television, /preparePage\(ch\);[\s\S]*gsap\.to\(\{ t: 0 \}/)
  assert.match(television, /onComplete\(\) \{[\s\S]*page\.classList\.remove\("show"\);[\s\S]*mode = "orbit"/)
  assert.doesNotMatch(television, /setTimeout\(\(\) => page\.classList\.remove\("show"\), 460\)/)
})

test('reduced motion uses stable frames and hard state changes', () => {
  assert.match(runtime, /prefers-reduced-motion: reduce/)
  assert.match(runtime, /if \(cv\.hasAttribute\("data-signal-main"\) && !reduced\)/)
  assert.match(broadcast, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(broadcast, /if \(reduced\.matches\) \{ return; \}/)
})

test('the console payload stays within the former 900 KB budget', async () => {
  let total = (await stat(new URL('index.html', publicDir))).size
  for (const file of ['js/preview-anims.js', 'js/preview-anims3.js', 'js/broadcast-content.js']) {
    total += (await stat(new URL(file, publicDir))).size
  }
  assert.ok(total <= 900 * 1024, `${total} bytes exceeds the 900 KB budget`)
})
