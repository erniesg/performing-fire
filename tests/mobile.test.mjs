import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const harness = await readFile(new URL('./harness/narrow-viewport.html', import.meta.url), 'utf8')
const BEGIN = '/* ---- touch and small screens: begin ---- */'
const END = '/* ---- touch and small screens: end ---- */'

function mobileCss () {
  const from = broadcast.indexOf(BEGIN)
  const to = broadcast.indexOf(END)
  assert.ok(from !== -1 && to > from)
  return broadcast.slice(from + BEGIN.length, to)
}

test('the viewport and console are non-scrolling at every width', () => {
  assert.match(broadcast, /html,body\{[^}]*height:100%[^}]*overflow:hidden/)
  assert.match(broadcast, /\.pf\{[^}]*height:100svh/)
  assert.match(broadcast, /\.transmission-stage\{[^}]*overflow:hidden/)
  assert.doesNotMatch(broadcast, /overflow-y:\s*(?:auto|scroll)/)
})

test('the narrow layout keeps all five previews above the viewer', () => {
  const css = mobileCss()
  assert.match(css, /@media \(max-width:700px\)/)
  assert.match(css, /\.console\{grid-template-rows:/)
  assert.match(css, /\.viewer-screen\{grid-template-columns:1fr;grid-template-rows:/)
  assert.doesNotMatch(css, /column-reverse/)
  assert.match(broadcast, /<section class="previews"[\s\S]*<section class="viewer-bezel"/)
})

test('coarse pointers receive 44px targets for console controls', () => {
  const css = mobileCss()
  assert.match(css, /@media \(hover:none\) and \(pointer:coarse\)/)
  for (const selector of ['.preview-btn', '.transport-btn', '.tab-btn', '.send-btn', '.link-btn', '.lang-toggle button']) {
    assert.ok(css.includes(selector), `${selector} must be covered by the coarse-pointer rule`)
  }
  assert.match(css, /min-height:44px/)
})

test('long CJK copy has language-specific line-breaking rules', () => {
  assert.match(broadcast, /html\[lang="ko"\] body\{[^}]*word-break:keep-all/)
  assert.match(broadcast, /html\[lang\^="zh"\] body\{[^}]*line-break:strict/)
  assert.match(broadcast, /html\[lang="ja"\] body\{[^}]*line-break:strict/)
})

test('the narrow-viewport harness frames a fixed-size viewport from the query string', () => {
  assert.match(harness, /<iframe[^>]*id="frame"/)
  assert.match(harness, /URLSearchParams/)
  assert.match(harness, /frame\.style\.width = w \+ "px"/)
  assert.match(harness, /frame\.style\.height = h \+ "px"/)
  assert.match(harness, /var PAGES = \{/)
  assert.doesNotMatch(harness, /frame\.src\s*=\s*params\.get/)
})
