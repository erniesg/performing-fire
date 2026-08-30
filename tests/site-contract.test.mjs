import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/broadcast/index.html', import.meta.url), 'utf8')
const experiment = await readFile(new URL('../public/experiments/fabric/index.html', import.meta.url), 'utf8')

test('broadcast status appears once', () => {
  assert.equal((broadcast.match(/ON AIR/g) ?? []).length, 1)
})

test('the Performing Fire wordmark is stable and the equation lives in content', () => {
  assert.match(broadcast, />PERFORMING FIRE 퍼포밍 파이어 — THE BROADCAST</)
  assert.match(broadcast, /Y = f\(X\) \+ ε/)
})

test('all five approved channel previews are keyboard-focusable buttons', () => {
  assert.equal((broadcast.match(/class="preview-btn bezel"/g) ?? []).length, 5)
  for (const label of ['CH 01 ABOUT', 'CH 02 CONTRIBUTE', 'CH 03 EXPERIMENTS', 'CH 04 RESEARCH', 'CH 05 LOG']) {
    assert.match(broadcast, new RegExp(`aria-label="${label}"`))
  }
})

test('selected, latent, pointer, and focus preview states are explicit', () => {
  assert.match(broadcast, /\.preview-btn:not\(\[aria-pressed="true"\]\) canvas\{filter:blur/)
  assert.match(broadcast, /:hover canvas/)
  assert.match(broadcast, /:focus-visible canvas/)
  assert.match(broadcast, /\.preview-btn\.is-awake canvas/)
  assert.match(broadcast, /aria-pressed="true" aria-label="CH 01 ABOUT"/)
})

test('channel navigation and progress controls live inside the CRT', () => {
  assert.match(broadcast, /<div class="viewer viewer-screen"[\s\S]*?<nav class="transport"[\s\S]*?<\/div>\s*<\/section>/)
  assert.match(broadcast, /id="transmissionPrev"/)
  assert.match(broadcast, /id="transmissionNext"/)
  assert.match(broadcast, /id="progressCount"/)
  assert.match(broadcast, /id="progressTrack"/)
  assert.match(broadcast, /event\.key !== "ArrowLeft" && event\.key !== "ArrowRight"/)
  assert.match(broadcast, /CH " \+ pad2\(currentChannel \+ 1\) \+ " \/ 05"/)
  assert.doesNotMatch(broadcast, /currentTransmission \+ 1\) \+ " \/ "/)
})

test('the Broadcast remains its own site and the fabric study is its own experiment page', () => {
  assert.match(broadcast, /THE BROADCAST/)
  assert.match(experiment, /FABRIC/)
  assert.doesNotMatch(experiment, /THE BROADCAST/)
})

test('each selected channel is one coherent scrollable console surface', () => {
  for (const channel of ['about', 'contribute', 'experiments', 'research', 'log']) {
    const panel = broadcast.match(new RegExp(`data-channel-panel="${channel}"[\\s\\S]*?<\\/section>`))?.[0] ?? ''
    assert.equal((panel.match(/data-transmission=/g) ?? []).length, 1, `${channel} must not split into internal transmissions`)
  }
  assert.match(broadcast, /\.transmission-stage\{[^}]*overflow-y:auto/)
  assert.match(broadcast, /\.signal-pane\{[^}]*min-height:0/)
})

test('the initial Broadcast channel can be selected from ?ch=1 through ?ch=5', () => {
  assert.match(broadcast, /new URLSearchParams\(window\.location\.search\)\.get\("ch"\)/)
  assert.match(broadcast, /initialChannel >= 1 && initialChannel <= CHANNELS\.length/)
  assert.match(broadcast, /tune\(initialChannel - 1, true\)/)
})

test('switching channels starts the new coherent surface at its beginning', () => {
  const resetBody = broadcast.match(/function resetChannelScroll\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  const stage = { scrollTop: 720 }
  Function('$', resetBody)(selector => selector === '#transmissionStage' ? stage : null)
  assert.equal(stage.scrollTop, 0)
  assert.match(broadcast, /function tune\(index, skipHistory\) \{[\s\S]*?resetChannelScroll\(\);[\s\S]*?render\(\);/)
})

test('Experiments preserves the Fabric lineage and Microsite in one transmission', () => {
  assert.match(broadcast, /data-i18n="bc\.experiments\.lineage\.label"[^>]*>01 \/ EXPERIMENT LINEAGE</)
  const experiments = broadcast.match(/data-channel-panel="experiments"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.equal((experiments.match(/data-transmission=/g) ?? []).length, 1)
  assert.match(experiments, /data-study="microsite"[\s\S]*?href="\/experiments\/microsite\/"/)
  assert.match(broadcast, /data-study="fabric-v0"[\s\S]*?href="\/experiments\/fabric\/"/)
  assert.match(broadcast, /data-study="fabric-v1"[\s\S]*?href="\/experiments\/fabric-v1\/"/)
  assert.match(broadcast, /data-study="fabric-2"[\s\S]*?bc\.experiments\.fabric2\.status/)
  const fabric2Markup = broadcast.match(/data-study="fabric-2"[\s\S]*?<\/article>/)?.[0] ?? ''
  assert.doesNotMatch(fabric2Markup, /href=/)
  assert.match(experiments, /href="\/experiments\/"[^>]*data-i18n="bc\.footer\.experiments"/)
  assert.match(broadcast, /signal: "x3"[\s\S]*?count: 1/)
  assert.match(broadcast, /\.experiment-version__detail\{[^}]*white-space:normal/)
  assert.doesNotMatch(broadcast, /\.experiment-version__detail\{[^}]*text-overflow:ellipsis/)
})

test('Contribute asks for consent at the controls instead of asserting it in the page copy', () => {
  assert.equal((broadcast.match(/data-i18n="bc\.ch02\.consent"/g) ?? []).length, 3)
  assert.doesNotMatch(broadcast, /<p[^>]*class="tx-body"[^>]*data-i18n="bc\.ch02\.consent"/)
})

test('About and Log group their existing records without obsolete schedule chrome', () => {
  for (const key of ['bc.about.1.body', 'bc.about.2.body', 'bc.about.3.body', 'bc.about.4.body', 'bc.about.5.body', 'bc.log.1.body', 'bc.log.2.body', 'bc.log.3.body', 'bc.log.4.body', 'bc.log.5.body']) {
    assert.match(broadcast, new RegExp(`data-i18n="${key.replace('.', '\\.')}`))
  }
  assert.match(broadcast, /id="viewerLabel">01 \/ ARTIST STATEMENT</)
  assert.doesNotMatch(broadcast, /PROPOSED ·|07\/07–18|07\/19–25|07\/26–08\/08|08\/09–22|08\/23–31/)
  const log = broadcast.match(/data-channel-panel="log"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.doesNotMatch(log, /FABRIC 2\.0 REMAINS OPEN/)
})

test('Research groups scores, dated counts, samples, rights, and reader in its one console surface', () => {
  assert.match(broadcast, /data-channel-panel="research"[\s\S]*?data-research-scores/)
  assert.match(broadcast, /data-research-counts/)
  assert.equal((broadcast.match(/data-research-group="[a-d]"/g) ?? []).length, 4)
  assert.match(broadcast, /id="researchReader"[\s\S]*?role="dialog"/)
  assert.match(broadcast, /data-research-error/)
  assert.match(broadcast, /\/js\/research-gallery\.js/)
  assert.match(broadcast, /PF_RESEARCH_GALLERY\.init/)
  assert.match(broadcast, /signal: "r1"[\s\S]*?count: 1/)
})

test('reduced motion is supported', () => {
  assert.match(broadcast, /prefers-reduced-motion:reduce/)
})
