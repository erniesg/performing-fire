import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const experiment = await readFile(new URL('../public/experiments/flame-cloth/index.html', import.meta.url), 'utf8')

test('broadcast status appears once', () => {
  assert.equal((broadcast.match(/ON AIR/g) ?? []).length, 1)
})

test('the Performing Fire wordmark is stable and contains no equation', () => {
  assert.match(broadcast, />PERFORMING FIRE 퍼포밍 파이어 — THE BROADCAST</)
  assert.doesNotMatch(broadcast, /error-e|pf-error-e/)
  assert.doesNotMatch(broadcast, /ŷ|f\(hands\)|error term/)
})

test('all six channel previews are keyboard focusable', () => {
  assert.equal((broadcast.match(/class="wall-btn bezel"/g) ?? []).length, 6)
  assert.equal((broadcast.match(/class="wall-preview /g) ?? []).length, 6)
})

test('every monitor shows a latent preview that clears on hover', () => {
  assert.match(broadcast, /\.wall-preview \{[\s\S]*opacity: \.76/)
  assert.match(broadcast, /\.wall-btn:hover canvas\.snow/)
  assert.match(broadcast, /\.wall-btn:hover \.wall-preview/)
  assert.match(broadcast, /preview-signal/)
  assert.match(broadcast, /preview-voices/)
  assert.match(broadcast, /preview-log/)
  assert.match(broadcast, /preview-score/)
  assert.match(broadcast, /preview-static/)
  assert.match(broadcast, /preview-ident/)
})

test('the Broadcast is the root index and the flame cloth is its own experiment page', () => {
  assert.match(broadcast, /THE BROADCAST/)
  assert.match(experiment, /FLAME CLOTH v3/)
  assert.doesNotMatch(experiment, /THE BROADCAST/)
})

test('reduced motion is supported', () => {
  assert.match(broadcast, /prefers-reduced-motion:\s*reduce/)
})
