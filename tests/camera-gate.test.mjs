import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const LOCALES = ['en', 'ko', 'zh', 'ja']
const page = await readFile(new URL('../public/experiments/flame-cloth/index.html', import.meta.url), 'utf8')
const dicts = {}
for (const locale of LOCALES) {
  dicts[locale] = JSON.parse(await readFile(new URL(`../public/i18n/${locale}.json`, import.meta.url), 'utf8'))
}

const module = page.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]
assert.ok(module, 'fabric must ship the simulation as one module script')
const lines = module.split('\n')

/** Slices out `function name(...) { ... }` by brace matching, so assertions can be scoped to one function. */
function functionSource (name) {
  const decl = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(module)
  assert.ok(decl, `the module must define ${name}`)
  const open = module.indexOf('{', decl.index + decl[0].length - 1)
  let depth = 0
  for (let i = open; i < module.length; i++) {
    if (module[i] === '{') depth++
    else if (module[i] === '}' && --depth === 0) return module.slice(decl.index, i + 1)
  }
  throw new Error(`unbalanced braces in ${name}`)
}

/**
 * Block comments, blanked but line-count-preserving, so "who calls this" scans
 * read code and not the prose describing it. The module keeps no `/*` inside its
 * GLSL template literals, so this is safe to do textually.
 */
const code = module.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
const codeLines = code.split('\n')

/** Top-level statements are the load path: everything inside a function is indented. */
const loadPath = codeLines.filter(line => /^[A-Za-z_$]/.test(line))

const count = (source, pattern) => (source.match(pattern) ?? []).length

// ---- the camera never opens before a gesture -------------------------------

test('getUserMedia has exactly one call site, inside tryCamera', () => {
  assert.equal(
    count(code, /navigator\.mediaDevices\.getUserMedia\(/g),
    1,
    'one camera call site keeps the gate auditable'
  )
  assert.match(functionSource('tryCamera'), /navigator\.mediaDevices\.getUserMedia\(/)
})

test('tryCamera is reachable only through enableCamera', () => {
  assert.equal(count(code, /\btryCamera\(/g), 2, 'tryCamera must have one definition and one caller')
  assert.match(functionSource('enableCamera'), /await tryCamera\(\)/, 'enableCamera is that caller')
})

test('every enableCamera call site is a user-gesture handler', () => {
  const GESTURE = /addEventListener\(\s*'(?:click|pointerup|touchend|keydown|keyup)'/
  const sites = codeLines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(entry => /\benableCamera\(/.test(entry.line) && !/function enableCamera/.test(entry.line))
  assert.ok(sites.length > 0, 'something must be able to turn the camera on')
  for (const { line, number } of sites) {
    assert.match(line, GESTURE, `enableCamera is called outside a gesture handler at module line ${number}`)
  }
})

test('the load path starts neither the camera nor the tracking model', () => {
  for (const line of loadPath) {
    assert.doesNotMatch(
      line,
      /^(?:await\s+)?(?:enableCamera|tryCamera|loadModel|initTracking)\s*\(/,
      `the load path must not reach for the camera: ${line.trim()}`
    )
  }
  assert.doesNotMatch(code, /initTracking/, 'the old auto-start entry point must be gone, not just unused')
})

test('the hand-tracking model is fetched lazily too, inside the gate', () => {
  assert.equal(count(code, /\bloadModel\(/g), 2, 'loadModel must have one definition and one caller')
  assert.match(functionSource('enableCamera'), /await loadModel\(\)/, 'the multi-MB model waits for the gesture')
})

// ---- a visible, locale-owned enable control -------------------------------

test('a visible enable control ships in the markup with one locale-owned label', () => {
  const control = page.match(/<button id="camera-gate"([^>]*)>([\s\S]*?)<\/button>/)
  assert.ok(control, 'the page must ship a #camera-gate button')
  const [, attributes, label] = control
  assert.match(attributes, /type="button"/)
  assert.match(attributes, /aria-describedby="camera-gate-hint"/)
  assert.doesNotMatch(attributes, /\bhidden\b/, 'the gate must ship visible — it is the only way in')
  assert.match(label, /id="camera-gate-label"[^>]*data-i18n="idx\.camera\.enable">ENABLE HAND TRACKING<\/span>/)
  assert.match(label, /id="camera-gate-hint"[^>]*data-i18n="idx\.camera\.hint">Click to allow camera access<\/small>/)
})

test('the gate is styled as a real, hit-testable control and only hides via [hidden]', () => {
  const rule = page.match(/#camera-gate \{([\s\S]*?)\}/)?.[1]
  assert.ok(rule, '#camera-gate must be styled')
  assert.match(rule, /position:fixed/)
  assert.match(rule, /cursor:pointer/)
  assert.doesNotMatch(rule, /display:\s*none/, 'the base rule must not hide the gate')
  assert.match(page, /#camera-gate\[hidden\] \{ display:none; \}/, 'hidden must beat the flex display')
  assert.match(page, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#camera-gate \{ animation:none; \}/)
})

test('all four locales label the gate in their own language', () => {
  const expected = { en: 'ENABLE HAND TRACKING', ko: '손 추적 켜기', zh: '启用手部追踪', ja: 'ハンドトラッキングを有効化' }
  const hints = { en: 'Click to allow camera access', ko: '카메라 사용을 허용하려면 누르세요', zh: '点击以允许使用摄像头', ja: 'クリックしてカメラを許可' }
  const retry = { en: 'TRY AGAIN', ko: '다시 시도', zh: '重试', ja: '再試行' }
  for (const locale of LOCALES) {
    for (const key of ['idx.camera.enable', 'idx.camera.hint', 'idx.camera.retry', 'idx.status.ready', 'idx.status.requesting']) {
      assert.equal(typeof dicts[locale][key], 'string', `${locale}.json is missing ${key}`)
      assert.notEqual(dicts[locale][key].trim(), '', `${locale}.json ${key} must be non-empty`)
    }
    const label = dicts[locale]['idx.camera.enable']
    assert.equal(label, expected[locale], `${locale} gate label must be locale-owned`)
    assert.equal(dicts[locale]['idx.camera.hint'], hints[locale], `${locale} gate hint must be locale-owned`)
    assert.equal(dicts[locale]['idx.camera.retry'], retry[locale], `${locale} retry label must be locale-owned`)
  }
})

// ---- a refused camera degrades, it does not block --------------------------

test('a denied or missing camera only writes a status line', () => {
  const body = functionSource('tryCamera')
  const failure = body.slice(body.indexOf('catch'))
  assert.match(failure, /setStatus\(tr\('idx\.status\.camera'/, 'the failure surfaces as translated status text')
  assert.match(failure, /showGate\('idx\.camera\.retry'/, 'and offers the gesture again')
  assert.doesNotMatch(failure, /\$\('err'\)|stopLoop\(|location\.reload|alert\(/, 'no full-screen error, no reload, no halt')
  assert.doesNotMatch(failure, /tracking\s*=\s*true/, 'a failed camera must not claim to be tracking')
})

test('the full-screen error overlay stays reserved for missing WebGL', () => {
  for (const line of lines) {
    if (line.includes("$('err')")) assert.match(line, /no webgl/, `#err used for something else: ${line.trim()}`)
  }
})

test('the status line is a non-blocking overlay, not a modal', () => {
  assert.match(
    page,
    /<div id="status" role="status" aria-live="polite" data-i18n="idx\.status\.ready">/,
    'a camera refusal must be announced, not only drawn'
  )
  const rule = page.match(/#status \{([\s\S]*?)\}/)?.[1]
  assert.ok(rule, '#status must be styled')
  assert.match(rule, /pointer-events:none/, 'the status line must never swallow clicks')
  assert.match(rule, /max-width:/, 'and must stay a line, not a sheet')
  assert.doesNotMatch(rule, /inset:\s*0/, 'and must not cover the cloth')
})

test('the cloth simulates with the camera off', () => {
  assert.match(functionSource('updateHands'), /if\(tracking && video\.readyState>=2\)/, 'tracking is opt-in per frame')
  assert.match(module, /canvas\.addEventListener\('pointermove'/, 'the mouse drives the cloth meanwhile')
})

// ---- the render loop pauses with the tab ------------------------------------

const loopBlock = module.slice(module.indexOf('/* ---------------- main loop'))
assert.ok(loopBlock.includes('startLoop();'), 'the loop block must end by starting the loop')

/**
 * Runs the real loop-control block under stubbed rAF/visibility so the pause is
 * exercised, not grepped. The per-frame simulation work is stubbed out; only the
 * scheduling is under test.
 */
function runLoop () {
  const queue = []
  const cancelled = []
  const listeners = {}
  const deltas = []
  let nextId = 1
  let now = 1_000

  const document = {
    hidden: false,
    addEventListener (type, fn) { (listeners[type] ??= []).push(fn) },
  }
  const sandbox = {
    document,
    console,
    DT: 1 / 120,
    performance: { now: () => now },
    requestAnimationFrame (fn) { const id = nextId++; queue.push({ id, fn }); return id },
    cancelAnimationFrame (id) {
      cancelled.push(id)
      const at = queue.findIndex(entry => entry.id === id)
      if (at >= 0) queue.splice(at, 1)
    },
    updateHands (dt) { deltas.push(dt) },
  }
  for (const stub of ['watchdog', 'step', 'updateEmbers', 'computeNormals', 'computeFolds', 'lerpColors', 'render', 'drawPreview']) {
    sandbox[stub] = () => {}
  }
  vm.runInNewContext(loopBlock, sandbox)

  return {
    document,
    queue,
    cancelled,
    deltas,
    /** Advances the clock, then runs one queued frame if there is one. */
    tick (seconds = 1 / 60) {
      now += seconds * 1000
      const entry = queue.shift()
      if (entry) entry.fn()
      return Boolean(entry)
    },
    advance (seconds) { now += seconds * 1000 },
    fire (type) { for (const fn of listeners[type] ?? []) fn() },
  }
}

test('the loop self-schedules exactly one frame at a time while visible', () => {
  const loop = runLoop()
  assert.equal(loop.queue.length, 1, 'startLoop schedules the first frame')
  assert.equal(loop.tick(), true)
  assert.equal(loop.queue.length, 1, 'each frame schedules exactly its successor')
})

test('hiding the tab cancels the pending frame and schedules no more', () => {
  const loop = runLoop()
  loop.tick()
  loop.document.hidden = true
  loop.fire('visibilitychange')
  assert.equal(loop.queue.length, 0, 'a hidden tab must have no rAF pending')
  assert.equal(loop.cancelled.length, 1, 'the in-flight frame is cancelled, not left to fire')
  loop.fire('visibilitychange')
  assert.equal(loop.queue.length, 0, 'and repeated events while hidden stay quiet')
})

test('showing the tab resumes a single frame', () => {
  const loop = runLoop()
  loop.document.hidden = true
  loop.fire('visibilitychange')
  loop.document.hidden = false
  loop.fire('visibilitychange')
  assert.equal(loop.queue.length, 1, 'the loop restarts on becoming visible')
  loop.fire('visibilitychange')
  assert.equal(loop.queue.length, 1, 'a duplicate visible event must not double-schedule')
})

test('a frame that fires while hidden renders nothing and schedules nothing', () => {
  const loop = runLoop()
  loop.document.hidden = true
  const ran = loop.tick() // the frame queued before hiding, delivered anyway
  assert.equal(ran, true)
  assert.equal(loop.queue.length, 0, 'frame() must bail out when document.hidden')
  assert.equal(loop.deltas.length, 0, 'and must not step the simulation')
})

test('resuming does not hand the simulation the whole background stretch as dt', () => {
  const loop = runLoop()
  loop.tick()
  loop.document.hidden = true
  loop.fire('visibilitychange')
  loop.advance(300) // five minutes in another tab
  loop.document.hidden = false
  loop.fire('visibilitychange')
  loop.tick(1 / 60)
  const resumed = loop.deltas.at(-1)
  assert.ok(resumed < 0.1, `the first visible dt must be a frame, not a five-minute gap (got ${resumed})`)
})
