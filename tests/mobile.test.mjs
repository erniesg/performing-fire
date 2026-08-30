import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/broadcast/index.html', import.meta.url), 'utf8')
const harness = await readFile(new URL('./harness/narrow-viewport.html', import.meta.url), 'utf8')
const BEGIN = '/* ---- touch and small screens: begin ---- */'
const END = '/* ---- touch and small screens: end ---- */'

function mobileCss () {
  const from = broadcast.indexOf(BEGIN)
  const to = broadcast.indexOf(END)
  assert.ok(from !== -1 && to > from)
  return broadcast.slice(from + BEGIN.length, to)
}

test('the viewport stays fixed while the selected content pane can scroll', () => {
  assert.match(broadcast, /html,body\{[^}]*height:100%[^}]*overflow:hidden/)
  assert.match(broadcast, /\.pf\{[^}]*height:100svh/)
  assert.match(broadcast, /\.content-pane\{[^}]*overflow:hidden/)
  assert.match(broadcast, /\.transmission-stage\{[^}]*overflow-y:auto/)
  assert.match(broadcast, /\.signal-pane\{[^}]*min-height:0/)
})

test('the narrow layout keeps all five previews above the viewer', () => {
  const css = mobileCss()
  assert.match(css, /@media \(max-width:700px\)/)
  assert.match(css, /\.console\{grid-template-rows:/)
  assert.match(css, /\.viewer-screen\{grid-template-columns:1fr;grid-template-rows:/)
  assert.doesNotMatch(css, /column-reverse/)
  assert.match(broadcast, /<section class="previews"[\s\S]*<section class="viewer-bezel"/)
})

test('Fabric and Microsite explanations remain readable instead of disappearing on narrow screens', () => {
  const css = mobileCss()
  assert.doesNotMatch(css, /\.experiment-version__detail\{display:none/)
  assert.match(css, /\.experiment-version\{grid-template-columns:1fr/)
  assert.match(css, /\.experiment-version \.study-link,\.experiment-version \.study-status\{grid-column:1/)
})

test('research grids and the reader stay compact inside the fixed content pane', () => {
  const css = mobileCss()
  assert.match(broadcast, /\.research-counts\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(broadcast, /\.research-samples\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(broadcast, /\.research-sample\{[^}]*-webkit-line-clamp:2/)
  assert.match(broadcast, /\.research-reader\{[^}]*position:absolute[^}]*inset:0/)
  assert.match(css, /\.research-counts,\.research-samples\{grid-template-columns:1fr/)
  assert.match(css, /\.research-reader\{padding:/)
  assert.doesNotMatch(css, /\.transmission-stage\{[^}]*overflow-y:\s*(?:auto|scroll)/)
})

test('coarse pointers receive 44px targets for console controls', () => {
  const css = mobileCss()
  assert.match(css, /@media \(hover:none\) and \(pointer:coarse\)/)
  for (const selector of ['.preview-btn', '.transport-btn', '.tab-btn', '.send-btn', '.link-btn', '.study-link', '.research-sample', '.research-score__source', '.research-reader__close', '.research-reader__link', '.lang-toggle button']) {
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
