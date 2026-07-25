import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const harness = await readFile(new URL('./harness/narrow-viewport.html', import.meta.url), 'utf8')

const LOCALES = ['en', 'ko', 'zh', 'ja']
const dicts = {}
for (const locale of LOCALES) {
  dicts[locale] = JSON.parse(await readFile(new URL(`../public/i18n/${locale}.json`, import.meta.url), 'utf8'))
}

const BEGIN = '/* ---- touch and small screens: begin ---- */'
const END = '/* ---- touch and small screens: end ---- */'

/* Everything this issue added lives between the markers, so "the new CSS" is a
   region we can hold to a stricter contract than the rest of the stylesheet. */
function mobileCss() {
  const from = broadcast.indexOf(BEGIN)
  const to = broadcast.indexOf(END)
  assert.ok(from !== -1 && to > from, 'broadcast.html must delimit the touch/small-screen CSS with the begin/end markers')
  return broadcast.slice(from + BEGIN.length, to)
}

/* @media blocks, brace-matched so nested rules stay with their query */
function mediaBlocks(css) {
  const blocks = []
  const opener = /@media([^{]*)\{/g
  let match
  while ((match = opener.exec(css)) !== null) {
    let depth = 1
    let i = opener.lastIndex
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1
      else if (css[i] === '}') depth -= 1
      i += 1
    }
    blocks.push({ condition: match[1].trim(), body: css.slice(opener.lastIndex, i - 1) })
    opener.lastIndex = i
  }
  return blocks
}

/* innermost `selector { declarations }` pairs; @media preludes never match because
   `[^{}]*` cannot span the nested rule's opening brace */
function rules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }))
}

function selectorsIn(css) {
  return rules(css)
    .flatMap(rule => rule.selector.split(','))
    .flatMap(sel => sel.trim().split(/[\s>+~]+/))
    .map(part => part.trim())
    .filter(Boolean)
}

function targets(css, className) {
  return selectorsIn(css).some(part => part === className || part.startsWith(`${className}:`) || part.startsWith(`${className}.`))
}

test('a max-width block covers the wall, the film wall, the dial, and scene typography', () => {
  const css = mobileCss()
  const narrow = mediaBlocks(css).filter(block => /max-width/.test(block.condition))
  assert.ok(narrow.length > 0, 'the new CSS must carry at least one max-width media query')

  const body = narrow.map(block => block.body).join('\n')
  for (const selector of ['.film-wall', '.wall', '.dial', '.scene-title', '.scene-copy', '.scene-kicker']) {
    assert.ok(targets(body, selector), `the max-width block must adjust ${selector} for narrow screens`)
  }

  /* the 360-430px band sits below every desktop font floor, so the type must scale */
  for (const selector of ['.scene-title', '.scene-sub', '.scene-copy', '.scene-kicker', '.scene-hint']) {
    const rule = rules(body).find(r => r.selector.split(',').some(s => s.trim() === selector))
    assert.ok(rule, `${selector} must be re-sized in the max-width block`)
    assert.match(rule.body, /font-size:\s*clamp\(/, `${selector} must use a fluid font-size, not a smaller constant`)
  }
})

test('no width in the new CSS is a px constant above 320px', () => {
  const css = mobileCss()
  const FLUID = /clamp\(|calc\(|\bmin\(|\bmax\(|%|vw|vh|vmin|vmax|auto|none|fit-content|max-content|min-content/
  let checked = 0
  for (const rule of rules(css)) {
    for (const declaration of rule.body.split(';')) {
      const match = declaration.match(/^\s*((?:min-|max-)?width)\s*:\s*(.+)$/)
      if (!match) continue
      checked += 1
      const [, property, value] = match
      const oversized = [...value.matchAll(/([\d.]+)px/g)].map(px => Number(px[1])).filter(px => px > 320)
      assert.ok(
        FLUID.test(value) || oversized.length === 0,
        `${rule.selector} sets ${property}: ${value.trim()} — above 320px a width must be fluid (clamp/%/vw)`
      )
    }
  }
  assert.ok(checked > 0, 'the new CSS must actually declare widths for the checker to cover')
})

test('coarse pointers get a tap path that complements hover rather than replacing it', () => {
  const coarse = mediaBlocks(mobileCss()).find(block => /\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/.test(block.condition))
  assert.ok(coarse, 'the new CSS must carry an @media (hover: none) and (pointer: coarse) block')

  /* hover keeps working on desktop: the coarse block only swaps hint copy and grows targets */
  assert.match(broadcast, /\.wall-btn:hover canvas\.snow/, 'the desktop hover-to-clarify rule must stay')
  assert.match(broadcast, /\.credits:hover \.roll \{[^}]*animation-play-state:\s*paused/, 'the desktop hover-to-pause rule must stay')

  /* tap-to-clarify, then tap-to-tune */
  assert.match(broadcast, /\.wall-btn\.clarified canvas\.snow/)
  assert.match(broadcast, /\.wall-btn\.clarified \.wall-preview/)
  assert.match(broadcast, /matchMedia\("\(hover: none\) and \(pointer: coarse\)"\)/)
  assert.match(broadcast, /addEventListener\("pointerdown"/)
  assert.match(broadcast, /classList\.contains\("clarified"\)/)
  assert.match(broadcast, /clarifyWall\(btn\)/)

  /* tap-to-pause on the credits roll */
  assert.match(broadcast, /\.credits\.paused \.roll \{[^}]*animation-play-state:\s*paused/)
  assert.match(broadcast, /credits\.addEventListener\([\s\S]{0,120}?classList\.toggle\("paused"\)/)

  /* 44px thumb targets for the dial and the tabs */
  for (const selector of ['.dial-btn', '.tab-btn', '.pager-btn']) {
    assert.ok(targets(coarse.body, selector), `${selector} must get a touch-sized target under a coarse pointer`)
  }
  for (const rule of rules(coarse.body)) {
    const minHeight = rule.body.match(/min-height:\s*([\d.]+)px/)
    if (minHeight) assert.ok(Number(minHeight[1]) >= 44, `${rule.selector} min-height must be at least 44px`)
  }
})

test('the SKIP INTRO link has a 44x44px hit area on every pointer', () => {
  const rule = broadcast.match(/\n\.film-skip\s*\{([^}]*)\}/)
  assert.ok(rule, 'broadcast.html must define .film-skip')
  const minWidth = rule[1].match(/min-width:\s*([\d.]+)px/)
  const minHeight = rule[1].match(/min-height:\s*([\d.]+)px/)
  assert.ok(minWidth && Number(minWidth[1]) >= 44, '.film-skip must reserve at least 44px of width')
  assert.ok(minHeight && Number(minHeight[1]) >= 44, '.film-skip must reserve at least 44px of height')
  /* padding alone would not grow an inline box vertically */
  assert.match(rule[1], /display:\s*inline-flex/, '.film-skip must be a flex box so the min box size applies')
})

test('the scroll film and console swap in TAP copy when the pointer is coarse', () => {
  const coarse = mediaBlocks(mobileCss()).find(block => /\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/.test(block.condition))
  assert.match(coarse.body, /\[data-when="hover"\]\s*\{\s*display:\s*none/, 'the coarse block must hide the hover-worded hint')
  assert.match(coarse.body, /\[data-when="touch"\]\s*\{\s*display:\s*revert/, 'the coarse block must reveal the touch-worded hint')
  assert.match(mobileCss(), /\[data-when="touch"\]\s*\{\s*display:\s*none/, 'the touch-worded hint must be hidden by default')

  const touchKeys = [
    'bc.film.ident.hint.touch',
    'bc.film.wall.copy.touch',
    'bc.film.static.hint.touch',
    'bc.wall.hint.touch',
    'bc.credits.hint.touch'
  ]
  for (const key of touchKeys) {
    assert.ok(broadcast.includes(`data-i18n="${key}"`), `broadcast.html must render the touch variant ${key}`)
    for (const locale of LOCALES) {
      assert.ok(key in dicts[locale], `${locale}.json must translate ${key}`)
    }
  }

  /* every hover-worded string keeps a touch-worded sibling, and the sibling says TAP */
  const variants = [...broadcast.matchAll(/<span data-when="(hover|touch)"[^>]*>([^<]*)<\/span>/g)]
  const hover = variants.filter(m => m[1] === 'hover')
  const touch = variants.filter(m => m[1] === 'touch')
  assert.equal(hover.length, touchKeys.length, 'each touch variant needs exactly one hover counterpart')
  assert.equal(touch.length, touchKeys.length)
  for (const [, , text] of touch) {
    assert.match(text, /TAP|탭/, `touch copy "${text}" must tell the reader to tap`)
  }
})

test('the narrow-viewport harness frames a fixed-size viewport from the query string', () => {
  assert.match(harness, /<iframe[^>]*id="frame"/, 'the harness must capture inside an iframe, not by resizing the window')
  assert.match(harness, /URLSearchParams/)
  assert.match(harness, /frame\.style\.width = w \+ "px"/)
  assert.match(harness, /frame\.style\.height = h \+ "px"/)
  /* the framed page comes from an allow-list, never straight from the query string */
  assert.match(harness, /var PAGES = \{/)
  assert.doesNotMatch(harness, /frame\.src\s*=\s*params\.get/)
  /* same offline contract as the pages it frames */
  assert.doesNotMatch(harness, /<script[^>]*\ssrc=["']https?:\/\//i)
  assert.doesNotMatch(harness, /<link[^>]*\shref=["']https?:\/\//i)
})
