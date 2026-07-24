import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const broadcast = await readFile(new URL('broadcast.html', publicDir), 'utf8')

test('GSAP and ScrollTrigger are vendored and referenced by relative paths', async () => {
  const vendored = await readdir(new URL('vendor/', publicDir))
  assert.ok(vendored.includes('gsap.min.js'), 'public/vendor/gsap.min.js is missing')
  assert.ok(vendored.includes('ScrollTrigger.min.js'), 'public/vendor/ScrollTrigger.min.js is missing')
  assert.match(broadcast, /<script src="vendor\/gsap\.min\.js"><\/script>/)
  assert.match(broadcast, /<script src="vendor\/ScrollTrigger\.min\.js"><\/script>/)
})

test('the page loads no scripts or stylesheets over http(s)', () => {
  assert.doesNotMatch(broadcast, /<script[^>]*\ssrc=["']https?:\/\//i)
  assert.doesNotMatch(broadcast, /<link[^>]*\shref=["']https?:\/\//i)
  assert.doesNotMatch(broadcast, /@import\s+(?:url\(\s*)?["']?https?:/i)
})

test('at least four data-scene scroll scenes exist', () => {
  const scenes = broadcast.match(/data-scene="[a-z-]+"/g) ?? []
  assert.ok(scenes.length >= 4, `expected at least 4 scenes, found ${scenes.length}`)
})

test('reduced motion bypasses scroll-triggered tweens', () => {
  assert.match(broadcast, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/)
  // the guard must return before ScrollTrigger is ever registered
  assert.match(broadcast, /if \(reducedMotion\.matches[\s\S]{0,400}?return;[\s\S]{0,400}?gsap\.registerPlugin\(ScrollTrigger\)/)
})

test('broadcast.html plus public/vendor stays within the 900 KB budget', async () => {
  let total = (await stat(new URL('broadcast.html', publicDir))).size
  for (const name of await readdir(new URL('vendor/', publicDir))) {
    total += (await stat(new URL(`vendor/${name}`, publicDir))).size
  }
  assert.ok(total <= 900 * 1024, `${total} bytes exceeds the 900 KB budget`)
})
