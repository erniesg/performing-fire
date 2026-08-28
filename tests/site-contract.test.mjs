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

test('navigation and progress controls live inside the CRT', () => {
  assert.match(broadcast, /<div class="viewer viewer-screen"[\s\S]*?<nav class="transport"[\s\S]*?<\/div>\s*<\/section>/)
  assert.match(broadcast, /id="transmissionPrev"/)
  assert.match(broadcast, /id="transmissionNext"/)
  assert.match(broadcast, /id="progressCount"/)
  assert.match(broadcast, /id="progressTrack"/)
  assert.match(broadcast, /event\.key !== "ArrowLeft" && event\.key !== "ArrowRight"/)
})

test('the Broadcast remains its own site and the fabric study is its own experiment page', () => {
  assert.match(broadcast, /THE BROADCAST/)
  assert.match(experiment, /FABRIC/)
  assert.doesNotMatch(experiment, /THE BROADCAST/)
})

test('Experiments preserves the Fabric lineage and Microsite as two transmissions', () => {
  assert.match(broadcast, /data-channel-panel="experiments"[\s\S]*?class="[^"]*experiment-switchboard[^"]*"/)
  assert.match(broadcast, /data-study="fabric-v0"[\s\S]*?href="\/experiments\/fabric\/"/)
  assert.match(broadcast, /data-study="fabric-v1"[\s\S]*?href="\/experiments\/fabric-v1\/"/)
  assert.match(broadcast, /data-study="fabric-2"[\s\S]*?bc\.experiments\.fabric2\.status/)
  const fabric2Markup = broadcast.match(/data-study="fabric-2"[\s\S]*?<\/article>/)?.[0] ?? ''
  assert.doesNotMatch(fabric2Markup, /href=/)
  assert.match(broadcast, /data-study="microsite"[\s\S]*?href="\/experiments\/microsite\/"/)
  assert.match(broadcast, /class="study-toggle"[\s\S]*?bc\.experiments\.open[\s\S]*?bc\.experiments\.close/)
  assert.match(broadcast, /signal: "x3"[\s\S]*?count: 2/)
})

test('Research exposes seven transmissions and an in-console reader', () => {
  assert.match(broadcast, /data-channel-panel="research"[\s\S]*?data-research-scores/)
  assert.match(broadcast, /data-research-counts/)
  assert.equal((broadcast.match(/data-research-group="[a-d]"/g) ?? []).length, 4)
  assert.match(broadcast, /id="researchReader"[\s\S]*?role="dialog"/)
  assert.match(broadcast, /data-research-error/)
  assert.match(broadcast, /\/js\/research-gallery\.js/)
  assert.match(broadcast, /PF_RESEARCH_GALLERY\.init/)
  assert.match(broadcast, /signal: "r1"[\s\S]*?count: 7/)
})

test('reduced motion is supported', () => {
  assert.match(broadcast, /prefers-reduced-motion:reduce/)
})
