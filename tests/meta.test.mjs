import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const publicDir = new URL('../public/', import.meta.url)
const ORIGIN = 'https://performingfire.berlayar.ai'

const PAGES = [
  { file: 'index.html', path: '/', title: 'Performing Fire — The Broadcast' },
  { file: 'experiments/flame-cloth/index.html', path: '/experiments/flame-cloth/', title: 'Performing Fire — Interactive Fire Study' },
  { file: 'experiments/index.html', path: '/experiments/', title: 'Performing Fire — Experiments Index' },
]

for (const page of PAGES) {
  page.html = await readFile(new URL(page.file, publicDir), 'utf8')
  const headEnd = page.html.indexOf('</head>')
  assert.notEqual(headEnd, -1, `${page.file} has no </head>`)
  page.head = page.html.slice(0, headEnd)
}

// `name|property="key"` is anchored on the closing quote so og:image never matches og:image:width.
const meta = (head, key) =>
  head.match(new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`, 'i'))?.[1]
const linkHref = (head, rel) =>
  head.match(new RegExp(`<link\\s+rel="${rel}"[^>]*\\shref="([^"]*)"`, 'i'))?.[1]

/**
 * Minimal XML well-formedness check — Node ships no XML parser and the repo takes no
 * dependencies. Verifies quoted attributes, balanced tags, and exactly one root element.
 */
function assertParsesAsXml (source, label) {
  const stack = []
  let root = null
  let i = 0
  while (i < source.length) {
    const lt = source.indexOf('<', i)
    if (lt === -1) break
    if (source.startsWith('<!--', lt)) {
      const end = source.indexOf('-->', lt + 4)
      assert.notEqual(end, -1, `${label}: unterminated comment`)
      i = end + 3
      continue
    }
    if (source.startsWith('<![CDATA[', lt)) {
      const end = source.indexOf(']]>', lt + 9)
      assert.notEqual(end, -1, `${label}: unterminated CDATA section`)
      i = end + 3
      continue
    }
    if (source.startsWith('<?', lt) || source.startsWith('<!', lt)) {
      const end = source.indexOf('>', lt)
      assert.notEqual(end, -1, `${label}: unterminated declaration`)
      i = end + 1
      continue
    }
    // Scan to the '>' that closes the tag, ignoring any inside quoted attribute values.
    let j = lt + 1
    let quote = null
    while (j < source.length) {
      const c = source[j]
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '>') {
        break
      }
      j++
    }
    assert.ok(j < source.length, `${label}: unterminated tag`)
    const raw = source.slice(lt + 1, j)
    i = j + 1

    if (raw.startsWith('/')) {
      assert.equal(stack.pop(), raw.slice(1).trim(), `${label}: mismatched closing tag </${raw.slice(1).trim()}>`)
      continue
    }
    const selfClosing = raw.endsWith('/')
    const body = selfClosing ? raw.slice(0, -1) : raw
    const name = body.match(/^[^\s/>]+/)?.[0]
    assert.ok(name, `${label}: malformed tag`)
    assert.match(
      body.slice(name.length),
      /^(\s+[A-Za-z_][\w:.-]*\s*=\s*("[^"]*"|'[^']*'))*\s*$/,
      `${label}: <${name}> has malformed or unquoted attributes`
    )
    if (stack.length === 0) {
      assert.equal(root, null, `${label}: more than one root element`)
      root = name
    }
    if (!selfClosing) stack.push(name)
  }
  assert.deepEqual(stack, [], `${label}: unclosed elements`)
  assert.ok(root, `${label}: no root element`)
  return root
}

test('the XML well-formedness check rejects malformed documents', () => {
  assert.equal(
    assertParsesAsXml('<?xml version="1.0"?><!-- c --><svg xmlns="x"><g/><path d="M0 0"/></svg>', 'ok'),
    'svg'
  )
  for (const [label, bad] of Object.entries({
    'mismatched closing tag': '<svg><g></svg>',
    'unclosed element': '<svg><g></g>',
    'unquoted attribute': '<svg a=b></svg>',
    'two root elements': '<svg/><svg/>',
    'unterminated tag': '<svg',
  })) {
    assert.throws(() => assertParsesAsXml(bad, label), `${label} must be rejected`)
  }
})

test('every page has a unique, non-empty meta description', () => {
  const seen = new Map()
  for (const page of PAGES) {
    const description = meta(page.head, 'description')
    assert.ok(description, `${page.file} is missing <meta name="description">`)
    assert.notEqual(description.trim(), '', `${page.file} description must be non-empty`)
    assert.ok(description.length <= 200, `${page.file} description is ${description.length} chars; keep it under 200`)
    assert.ok(!seen.has(description), `${page.file} reuses the description already on ${seen.get(description)}`)
    seen.set(description, page.file)
  }
})

test('every page carries a complete Open Graph card', () => {
  for (const page of PAGES) {
    assert.equal(meta(page.head, 'og:title'), page.title, `${page.file} og:title`)
    assert.equal(meta(page.head, 'og:type'), 'website', `${page.file} og:type`)
    assert.equal(meta(page.head, 'og:url'), `${ORIGIN}${page.path}`, `${page.file} og:url must be absolute`)
    assert.equal(
      meta(page.head, 'og:description'),
      meta(page.head, 'description'),
      `${page.file} og:description must match the meta description`
    )
    const image = meta(page.head, 'og:image')
    assert.ok(image, `${page.file} is missing og:image`)
    assert.ok(image.startsWith(`${ORIGIN}/share/og.`), `${page.file} og:image must be an absolute URL under ${ORIGIN}/share/`)
  }
})

test('every page declares the large Twitter summary card', () => {
  for (const page of PAGES) {
    assert.equal(meta(page.head, 'twitter:card'), 'summary_large_image', `${page.file} twitter:card`)
  }
})

test('every page declares a canonical URL for its own path', () => {
  for (const page of PAGES) {
    assert.equal(linkHref(page.head, 'canonical'), page.path, `${page.file} canonical`)
  }
})

test('every page links the inline-SVG favicon', () => {
  for (const page of PAGES) {
    assert.match(
      page.head,
      /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/,
      `${page.file} must link /favicon.svg as an SVG icon`
    )
  }
})

test('favicon.svg is checked in and parses as XML', async () => {
  const source = await readFile(new URL('favicon.svg', publicDir), 'utf8')
  assert.equal(assertParsesAsXml(source, 'favicon.svg'), 'svg', 'favicon.svg root element must be <svg>')
  assert.match(source, /viewBox="0 0 32 32"/, 'favicon.svg must declare a square viewBox')
})

test('og.svg is checked in, parses as XML, and is 1200x630', async () => {
  const source = await readFile(new URL('share/og.svg', publicDir), 'utf8')
  assert.equal(assertParsesAsXml(source, 'share/og.svg'), 'svg', 'og.svg root element must be <svg>')
  assert.match(source, /viewBox="0 0 1200 630"/, 'og.svg must declare a 1200x630 viewBox')
})

test('the share assets fetch nothing at render time', async () => {
  for (const name of ['favicon.svg', 'share/og.svg']) {
    const source = await readFile(new URL(name, publicDir), 'utf8')
    assert.doesNotMatch(source, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/i, `${name} must not reference remote resources`)
    assert.doesNotMatch(source, /@import|<image\b|xlink:href/i, `${name} must not pull in external images or fonts`)
  }
})

test('the referenced OG image is checked in under public/share/ and within budget', async () => {
  const image = meta(PAGES[0].head, 'og:image')
  for (const page of PAGES) {
    assert.equal(meta(page.head, 'og:image'), image, `${page.file} must reference the same og:image as the other pages`)
  }

  const name = image.slice(`${ORIGIN}/share/`.length)
  const asset = new URL(`share/${name}`, publicDir)
  const { size } = await stat(asset)
  assert.ok(size <= 250 * 1024, `public/share/${name} is ${size} bytes; the budget is 250 KB`)

  if (name === 'og.png') {
    const buf = await readFile(asset)
    assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'og.png must be a real PNG')
    assert.equal(buf.subarray(12, 16).toString('ascii'), 'IHDR', 'og.png must open with an IHDR chunk')
    assert.equal(buf.readUInt32BE(16), 1200, 'og.png must be 1200 px wide')
    assert.equal(buf.readUInt32BE(20), 630, 'og.png must be 630 px tall')
    return
  }

  // Temporary fallback: no raster tooling was available, so og:image points at the SVG source
  // of truth. That only passes while the swap is flagged as outstanding everywhere.
  assert.equal(name, 'og.svg', 'og:image must be og.png, or og.svg while the raster is still pending')
  const readme = await readFile(new URL('share/README.md', publicDir), 'utf8')
  assert.match(readme, /TODO\(og-png\)/, 'public/share/README.md must keep the TODO(og-png) marker while the PNG is pending')
  for (const page of PAGES) {
    assert.match(page.html, /TODO\(og-png\)/, `${page.file} must flag the pending PNG with a TODO(og-png) comment`)
  }
})
