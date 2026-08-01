import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const experiment = await readFile(new URL('../public/experiments/flame-cloth/index.html', import.meta.url), 'utf8')

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

test('the Broadcast is the root index and the fabric study is its own experiment page', () => {
  assert.match(broadcast, /THE BROADCAST/)
  assert.match(experiment, /FABRIC/)
  assert.doesNotMatch(experiment, /THE BROADCAST/)
})

test('reduced motion is supported', () => {
  assert.match(broadcast, /prefers-reduced-motion:reduce/)
})
