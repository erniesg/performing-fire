import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'

const LOCALES = ['en', 'ko', 'zh', 'ja']
const dicts = {}
for (const locale of LOCALES) {
  dicts[locale] = JSON.parse(await readFile(new URL(`../public/i18n/${locale}.json`, import.meta.url), 'utf8'))
}
const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const fabric = await readFile(new URL('../public/experiments/fabric/index.html', import.meta.url), 'utf8')
const microsite = await readFile(new URL('../public/experiments/microsite/index.html', import.meta.url), 'utf8')
const pages = { 'index.html': broadcast, 'experiments/fabric/index.html': fabric, 'experiments/microsite/index.html': microsite }

test('all four locale dictionaries parse and share a byte-identical key set', () => {
  const enKeys = JSON.stringify(Object.keys(dicts.en).sort())
  for (const locale of LOCALES) {
    assert.equal(JSON.stringify(Object.keys(dicts[locale]).sort()), enKeys, `${locale}.json key set differs from en.json`)
  }
})

test('every dictionary value is a non-empty string', () => {
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(dicts[locale])) {
      assert.equal(typeof value, 'string', `${locale}.json ${key} must be a string`)
      assert.notEqual(value.trim(), '', `${locale}.json ${key} must be non-empty`)
    }
  }
})

test('machine-draft dictionaries are marked for native review', () => {
  for (const locale of ['ko', 'zh', 'ja']) {
    assert.equal(dicts[locale]._review, 'machine-draft', `${locale}.json must keep the "_review": "machine-draft" marker`)
  }
})

test('every data-i18n key referenced in the pages exists in the dictionaries', () => {
  const keys = new Set(Object.keys(dicts.en))
  for (const [name, page] of Object.entries(pages)) {
    const refs = [...page.matchAll(/data-i18n(?:-placeholder|-ready|-aria-label)?="([^"]+)"/g)].map(m => m[1])
    assert.ok(refs.length > 0, `${name} must reference dictionary keys via data-i18n attributes`)
    for (const key of refs) {
      assert.ok(keys.has(key), `${name} references missing dictionary key ${key}`)
    }
  }
})

test('the language resolver resolves ?lang, then localStorage, then navigator.language, then en', () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /function resolveLang/, `${name} must define resolveLang`)
    assert.match(
      page,
      /function resolveLang\(\) \{[\s\S]*?URLSearchParams[\s\S]*?localStorage[\s\S]*?navigator\.language[\s\S]*?return "en";[\s\S]*?\}/,
      `${name} resolveLang must check ?lang → localStorage → navigator.language → en, in that order`
    )
  }
})

test('switching languages updates document.documentElement.lang without a reload', () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /document\.documentElement\.lang = HTML_LANG\[lang\]/, `${name} must set the root lang attribute on switch`)
    assert.match(page, /hydrate\(\)/, `${name} must re-render strings in place after a switch`)
  }
})

test('a visible four-locale language toggle uses short consistent labels with accessible native names', () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /class="lang-toggle/, `${name} must render the language toggle`)
    for (const locale of LOCALES) {
      assert.match(page, new RegExp(`<button[^>]*data-lang="${locale}"`), `${name} toggle must offer ${locale}`)
    }
    assert.match(page, /data-lang="en"[^>]*>EN</)
    assert.match(page, /data-lang="ko"[^>]*>KO</)
    assert.match(page, /data-lang="zh"[^>]*>ZH</)
    assert.match(page, /data-lang="ja"[^>]*>JA</)
    assert.match(page, /aria-label="한국어"/)
    assert.match(page, /aria-label="中文"/)
    assert.match(page, /aria-label="日本語"/)
  }
})

test('CJK typography rules exist in both pages', () => {
  for (const [name, page] of Object.entries(pages)) {
    assert.match(page, /html\[lang="ko"\][^{]*\{[^}]*word-break:\s*keep-all/, `${name} must apply keep-all for Korean`)
    assert.match(page, /html\[lang\^="zh"\][^{]*\{[^}]*line-break:\s*strict/, `${name} must apply strict line breaking for Chinese`)
    assert.match(page, /html\[lang="ja"\][^{]*\{[^}]*line-break:\s*strict/, `${name} must apply strict line breaking for Japanese`)
    for (const font of ['Apple SD Gothic Neo', 'PingFang SC', 'Hiragino']) {
      assert.ok(page.includes(font), `${name} must cover CJK glyphs with the system stack (${font})`)
    }
  }
})

test('every inline script in both pages still parses', () => {
  for (const [name, page] of Object.entries(pages)) {
    for (const [index, match] of [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) {
      assert.doesNotThrow(() => new Script(match[1]), `${name} inline script ${index} has a syntax error`)
    }
    const module = page.match(/<script type="module">([\s\S]*?)<\/script>/)
    if (module) {
      const body = `async function m(){${module[1].replace(/await import\(/g, '(')}\n}`
      assert.doesNotThrow(() => new Script(body), `${name} module script has a syntax error`)
    }
  }
})

test('the artistic EN/KO wordmark stays literal and is not externalized', () => {
  assert.match(broadcast, />PERFORMING FIRE 퍼포밍 파이어 — THE BROADCAST</)
  const wordmarkLine = broadcast.match(/<h1[^>]*class="station-id[^>]*>/)[0]
  assert.ok(!wordmarkLine.includes('data-i18n'), 'the wordmark must not carry a data-i18n hook')
})
