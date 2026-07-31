import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const broadcast = await readFile(new URL('index.html', publicDir), 'utf8')
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
