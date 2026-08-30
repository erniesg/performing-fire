import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'

const LOCALES = ['en', 'ko', 'zh', 'ja']
const dicts = {}
for (const locale of LOCALES) {
  dicts[locale] = JSON.parse(await readFile(new URL(`../public/i18n/${locale}.json`, import.meta.url), 'utf8'))
}
const broadcast = await readFile(new URL('../public/broadcast/index.html', import.meta.url), 'utf8')
const fabric = await readFile(new URL('../public/experiments/fabric/index.html', import.meta.url), 'utf8')
const microsite = await readFile(new URL('../public/experiments/microsite/index.html', import.meta.url), 'utf8')
const pages = { 'broadcast/index.html': broadcast, 'experiments/fabric/index.html': fabric, 'experiments/microsite/index.html': microsite }

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
  assert.equal(dicts.en._review, 'source-reviewed', 'en.json must keep the "_review": "source-reviewed" marker')
  for (const locale of ['ko', 'zh', 'ja']) {
    assert.equal(dicts[locale]._review, 'machine-draft', `${locale}.json must keep the "_review": "machine-draft" marker`)
  }
})

test('archive-count labels retain every verified public category', () => {
  for (const locale of LOCALES) {
    assert.match(dicts[locale]['bc.research.count.videoArchivePdf'], /8/)
    assert.match(dicts[locale]['bc.research.count.videoArchivePdf'], /2026-07-27/)
  }
})

test('English source copy preserves the approved editorial and Fabric boundaries', () => {
  assert.match(dicts.en['bc.about.1.body'], /make, use, and depend on.*never fully control/i)
  assert.match(dicts.en['bc.about.4.body'], /scores (turn|carry) ideas into instructions, actions, and situations/i)
  assert.match(dicts.en['bc.experiments.fabricV0.detail'], /checkpoint/i)
  assert.match(dicts.en['bc.experiments.fabricV1.detail'], /Bass.*Body.*Treble.*Hits.*explode.*dissolve.*glitter.*glitch/i)
  assert.equal(dicts.en['bc.experiments.fabric2.detail'], 'The next Fabric experiment has a place in the lineage, but its behaviour is not defined yet.')
  assert.equal(dicts.en['bc.experiments.fabric2.status'], 'NOT YET DEFINED')
  assert.match(dicts.en['bc.research.scores.body'], /verified collection record.*score.*text is not human-confirmed/i)
  assert.match(dicts.en['bc.log.1.body'], /tests, failures, and changes/i)
})

test('English broadcast copy carries one causal argument across all five channels', () => {
  const en = dicts.en

  // About: premise → relation → situated people → score method → performance.
  assert.match(en['bc.about.2.body'], /That gap is the relation/i)
  assert.match(en['bc.about.3.body'], /rather than reduced to anonymous input/i)
  assert.match(en['bc.about.4.body'], /That is why/i)
  assert.match(en['bc.about.5.body'], /performer decides/i)

  // Contribute gives a visitor a concrete action, an honest media boundary, and consent.
  assert.match(en['bc.contribute.1.body'], /^Offer /i)
  assert.match(en['bc.contribute.1.body'], /do not upload media/i)
  assert.match(en['bc.contribute.2.body'], /After moderation/i)
  assert.match(en['bc.ch02.consent'], /^I consent to /i)

  // Experiments presents one lineage rather than three disconnected feature claims.
  assert.match(en['bc.experiments.fabricV0.detail'], /^Fabric v0 preserves the checkpoint/i)
  assert.match(en['bc.experiments.fabricV1.detail'], /^Fabric v1 builds on that checkpoint/i)
  assert.match(en['bc.experiments.fabric2.detail'], /^The next Fabric experiment has a place/i)
  assert.match(en['bc.experiments.microsite.body'], /^Alongside the Fabric studies/i)

  // Research distinguishes evidence, counts, samples, and public display permission.
  assert.match(en['bc.research.scores.body'], /^The first question is /i)
  assert.match(en['bc.research.counts.body'], /^These are dated observations/i)
  assert.match(en['bc.research.rights.body'], /^Each sample keeps /i)

  // The Log names the decision and consequence without replaying Fabric's detailed spec.
  for (const key of ['bc.log.1.body', 'bc.log.2.body', 'bc.log.3.body', 'bc.log.4.body', 'bc.log.5.body']) {
    assert.match(en[key], /^Decision:/, `${key} must state a decision`)
  }
  assert.doesNotMatch(en['bc.log.3.body'], /Bass|Body|Treble|Hits|explode|dissolve|glitter|glitch/i)
})

test('channel transport is named as channel navigation in every locale', () => {
  for (const [lang, dict] of Object.entries(dicts)) {
    assert.doesNotMatch(dict['bc.nav.transmission'], /transmission|전송|传输|送信/i, `${lang} transport must not describe old transmission paging`)
    assert.doesNotMatch(dict['bc.nav.previous'], /transmission|전송|传输|送信/i, `${lang} previous control must change channels`)
    assert.doesNotMatch(dict['bc.nav.next'], /transmission|전송|传输|送信/i, `${lang} next control must change channels`)
  }
})

test('About and Log labels and headings match the approved editorial movements', () => {
  const movements = {
    'bc.about.1': ['01 / ARTIST STATEMENT', 'PLAYING WITH FIRE'],
    'bc.about.2': ['02 / EQUATION', 'Y = f(X) + ε'],
    'bc.about.3': ['03 / CONTRIBUTIONS', 'HUMAN MATERIAL'],
    'bc.about.4': ['04 / RESEARCH METHOD', 'IDEAS BECOME ACTIONS'],
    'bc.about.5': ['05 / PERFORMANCE', 'WHAT REMAINS UNSETTLED'],
    'bc.log.1': ['01 / WHY THIS LOG', 'A DECISION RECORD'],
    'bc.log.2': ['02 / RESEARCH', 'BUILD THE SOURCE BOUNDARY'],
    'bc.log.3': ['03 / FABRIC', 'CHECKPOINT → LATER ADDITIONS'],
    'bc.log.4': ['04 / MICROSITE', 'FIVE CONTAINERS. ONE BROADCAST.'],
    'bc.log.5': ['05 / NEXT', 'FABRIC 2.0 REMAINS OPEN'],
  }
  for (const [prefix, [label, heading]] of Object.entries(movements)) {
    assert.equal(dicts.en[`${prefix}.label`], label)
    assert.equal(dicts.en[`${prefix}.heading`], heading)
  }
})

test('generated research and lineage chrome is translated in every locale', () => {
  assert.equal(dicts.en['bc.experiments.lineage.label'], '01 / EXPERIMENT LINEAGE')
  assert.equal(dicts.en['bc.experiments.lineage.heading'], 'HOW THE WORK TOOK FORM')
  assert.match(dicts.en['bc.experiments.lineage.body'], /Fabric.*responsive material.*Microsite.*broadcast structure/i)
  assert.equal(dicts.en['bc.research.catalogue'], 'CATALOGUE')
  assert.equal(dicts.en['bc.research.scores.sample'], 'PUBLIC SAMPLE · CATALOGUE 570 / ASSET 106344')
  for (const locale of ['ko', 'zh', 'ja']) {
    for (const key of ['bc.experiments.lineage.label', 'bc.experiments.lineage.heading', 'bc.experiments.lineage.body', 'bc.research.catalogue', 'bc.research.scores.sample']) {
      assert.notEqual(dicts[locale][key], dicts.en[key], `${locale}.${key} must be semantically translated`)
    }
  }
})

test('SRT count labels retain the file count, asset span, and observation date', () => {
  for (const locale of LOCALES) {
    const label = dicts[locale]['bc.research.count.njpSrt']
    assert.match(label, /38/)
    assert.match(label, /18/)
    assert.match(label, /2026-07-27/)
  }
})

test('Korean About copy keeps the equation and situated-material movements distinct', () => {
  assert.match(dicts.ko['bc.about.2.body'], /Y = f\(X\) \+ ε.*X.*가져오는.*f\(X\).*조직.*ε.*들어맞/i)
  assert.match(dicts.ko['bc.about.3.body'], /기여.*익명.*아닌.*맥락.*인간.*재료/i)
  assert.doesNotMatch(dicts.ko['bc.about.3.body'], /임베딩|군집|지도/)
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
