import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const root = await readFile(new URL('index.html', publicDir), 'utf8')
const broadcast = await readFile(new URL('broadcast/index.html', publicDir), 'utf8')

test('every inline root script parses after the Broadcast layer is added', () => {
  const scripts = [...root.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .filter(source => source.trim())
  assert.ok(scripts.length > 0)
  scripts.forEach(source => assert.doesNotThrow(() => new Function(source)))
})

test('the root owns one accessible in-place Broadcast layer', () => {
  assert.match(root, /<section[^>]*id="broadcastLayer"[^>]*aria-hidden="true"/)
  assert.match(root, /<iframe[^>]*id="broadcastFrame"[^>]*src="\/broadcast\/\?embedded=1"/)
  assert.match(root, /<button[^>]*id="broadcastClose"[^>]*>[^<]*RETURN TO FIRE/)
  assert.match(root, /body\.broadcast-open #broadcastLayer/)
})

test('opening a channel keeps the canonical root path and synchronizes channel state', () => {
  assert.match(root, /function openIntegratedBroadcast\(ch, options = \{\}\)/)
  assert.match(root, /query\.set\("ch", String\(ch\)\)/)
  assert.match(root, /history\[options\.replace \? "replaceState" : "pushState"\]/)
  assert.match(root, /broadcastFrame\.contentWindow\.postMessage\(\{ type: "pf:tune", ch \}/)
  assert.match(root, /event\.data\.type !== "pf:broadcast-channel"/)
  assert.match(root, /addEventListener\("popstate", syncBroadcastFromUrl\)/)
})

test('the modal console makes the fire-world background inert until it closes', () => {
  assert.match(root, /const broadcastBackground = \[\.\.\.document\.body\.children\][\s\S]*child !== broadcastLayer[\s\S]*child\.tagName !== "SCRIPT"/)
  assert.match(root, /function setBroadcastBackgroundInert\(inert\) \{[\s\S]*broadcastBackground\.forEach\(element => \{ element\.inert = inert; \}\)/)
  assert.match(root, /function openIntegratedBroadcast[\s\S]*setBroadcastBackgroundInert\(true\)/)
  assert.match(root, /function closeIntegratedBroadcast[\s\S]*setBroadcastBackgroundInert\(false\)/)
})

test('closing restores focus and clears only a legacy channel fragment', () => {
  assert.match(root, /<canvas[^>]*id="gl"[^>]*tabindex="-1"[^>]*aria-label="Interactive Performing Fire world"/)
  assert.match(root, /let broadcastReturnFocus = null/)
  assert.match(root, /broadcastLayer\.getAttribute\("aria-hidden"\) === "true"[\s\S]*broadcastReturnFocus =[\s\S]*: fireWorld/)
  assert.match(root, /const restoreFocus = wasOpen \? broadcastReturnFocus : null;[\s\S]*restoreFocus\.isConnected \? restoreFocus : fireWorld[\s\S]*focusTarget\.focus\(\)/)
  assert.ok(root.includes('const nextHash = /^#ch0?[1-5]$/i.test(location.hash) ? "" : location.hash;'))
  assert.match(root, /history\.replaceState\(null, "", location\.pathname \+ \(suffix \? `\?\$\{suffix\}` : ""\) \+ nextHash\)/)
})

test('the legacy Broadcast route is compatibility-only outside the root layer', () => {
  assert.match(broadcast, /window\.top === window\.self/)
  assert.match(broadcast, /query\.delete\("embedded"\)/)
  assert.match(broadcast, /window\.location\.replace\("\/" \+ suffix\)/)
  assert.match(broadcast, /<link rel="canonical" href="\/">/)
  assert.match(broadcast, /<meta property="og:url" content="https:\/\/performingfire\.berlayar\.ai\/">/)
})

test('the embedded console reports in-place channel changes to the root', () => {
  assert.match(broadcast, /window\.parent\.postMessage\(\{ type: "pf:broadcast-channel", ch: currentChannel \+ 1 \}, window\.location\.origin\)/)
  assert.match(broadcast, /event\.data\.type !== "pf:tune"/)
  assert.match(broadcast, /tune\(Number\(event\.data\.ch\) - 1, true\)/)
})

test('embedded non-blank links leave the console at the top level', () => {
  assert.match(broadcast, /document\.addEventListener\("click", function \(event\) \{[\s\S]*window\.parent === window[\s\S]*closest\("a\[href\]"\)[\s\S]*link\.target === "_blank"[\s\S]*link\.target = "_top"/)
})
