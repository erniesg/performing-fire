import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const rawJson = await readFile(new URL('../public/experiments/experiments.json', import.meta.url), 'utf8')
const index = await readFile(new URL('../public/experiments/index.html', import.meta.url), 'utf8')
const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const fabric = await readFile(new URL('../public/experiments/fabric/index.html', import.meta.url), 'utf8')
const microsite = await readFile(new URL('../public/experiments/microsite/index.html', import.meta.url), 'utf8')
const legacyFabric = await readFile(new URL('../public/experiments/flame-cloth/index.html', import.meta.url), 'utf8')
const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8')

const CMS_ENDPOINT = 'https://berlayar.ai/api/experiments?limit=100&sort=-date&depth=0'
const LOCAL_COPY = './experiments.json'
const inlineScript = index.match(/<script>([\s\S]*?)<\/script>/)?.[1]
assert.ok(inlineScript, 'experiments/index.html must ship exactly one inline script')
const localeCopies = {
  en: JSON.parse(await readFile(new URL('../public/i18n/en.json', import.meta.url))),
  ko: JSON.parse(await readFile(new URL('../public/i18n/ko.json', import.meta.url))),
  zh: JSON.parse(await readFile(new URL('../public/i18n/zh.json', import.meta.url))),
  ja: JSON.parse(await readFile(new URL('../public/i18n/ja.json', import.meta.url))),
}

/**
 * Just enough DOM to run the page script under node:vm — no dependencies, and any
 * innerHTML write throws so the "textContent only" rule is enforced, not just grepped.
 */
function makeNode (tag) {
  return {
    tagName: tag,
    className: '',
    textContent: '',
    hidden: false,
    attributes: {},
    children: [],
    get innerHTML () { return '' },
    set innerHTML (value) { throw new Error(`renderer wrote innerHTML: ${value}`) },
    setAttribute (name, value) { this.attributes[name] = String(value) },
    getAttribute (name) { return name in this.attributes ? this.attributes[name] : null },
    appendChild (child) { this.children.push(child); return child },
    get firstChild () { return this.children[0] ?? null },
    removeChild (child) {
      const index = this.children.indexOf(child)
      if (index >= 0) this.children.splice(index, 1)
      return child
    },
  }
}

const serialize = node => ({
  tag: node.tagName,
  className: node.className,
  textContent: node.textContent,
  href: node.href,
  attributes: { ...node.attributes },
  children: node.children.map(serialize),
})

const cardText = node => [node.textContent, ...node.children.flatMap(cardText)].filter(Boolean)

function respond (spec) {
  if (!spec) return Promise.reject(new Error('network failure'))
  if (spec.status && spec.status >= 400) {
    return Promise.resolve({ ok: false, status: spec.status, json: () => Promise.reject(new Error('no body')) })
  }
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(spec.body) })
}

/** Runs the page script against stubbed fetch/i18n state and returns what it rendered. */
async function load ({ cms, local, search = '', stored = null, language = 'en-US' } = {}) {
  const requested = []
  const wall = makeNode('ul')
  const offair = makeNode('p')
  const localCopy = makeNode('p')
  offair.hidden = true
  localCopy.hidden = true
  const byId = { wall, offair, 'local-copy': localCopy }

  const document = {
    getElementById: id => byId[id] ?? null,
    createElement: tag => makeNode(tag),
    querySelectorAll: () => [],
    addEventListener: () => {},
    title: '',
  }
  const window = {
    document,
    fetch (url) {
      requested.push(url)
      if (/^https?:\/\//i.test(url)) return respond(cms)
      if (/^\/i18n\//.test(url)) {
        const locale = url.match(/\/i18n\/([a-z]+)\.json$/)?.[1] ?? 'en'
        return respond({ body: localeCopies[locale] ?? localeCopies.en })
      }
      return respond(local)
    },
    location: { search },
    localStorage: { getItem: key => (key === 'pf-lang' ? stored : null) },
    navigator: { language },
  }

  vm.runInNewContext(inlineScript, { window, document, URLSearchParams, console })
  await new Promise(resolve => setTimeout(resolve, 0)) // drain the fetch promise chain
  return { requested, wall, offair, localCopy, cards: wall.children }
}

const cmsDocs = [
  {
    slug: 'broadcast-direction-5',
    title: 'The Broadcast — Direction 5',
    date: '2026-07-23T00:00:00.000Z',
    summary: 'A five-channel station wall for the living totem.',
    url: '/broadcast',
  },
  {
    slug: 'fabric',
    title: 'Fabric',
    date: '2026-07-07T00:00:00.000Z',
    summary: 'Interactive fabric study.',
    url: '/experiments/flame-cloth/',
  },
]
const localEntries = JSON.parse(rawJson)

test('experiments.json parses into a non-empty array', () => {
  const entries = JSON.parse(rawJson)
  assert.ok(Array.isArray(entries))
  assert.equal(entries.length, 1)
})

test('every entry has non-empty slug, title, ISO 8601 date, summary, and url', () => {
  for (const entry of JSON.parse(rawJson)) {
    for (const field of ['slug', 'title', 'date', 'summary', 'url']) {
      assert.equal(typeof entry[field], 'string', `${field} must be a string`)
      assert.notEqual(entry[field].trim(), '', `${field} must be non-empty`)
    }
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `date ${entry.date} must be ISO 8601 (YYYY-MM-DD)`)
    assert.ok(!Number.isNaN(Date.parse(entry.date)), `date ${entry.date} must be a real date`)
  }
})

test('slugs are unique', () => {
  const slugs = JSON.parse(rawJson).map(entry => entry.slug)
  assert.equal(new Set(slugs).size, slugs.length)
})

test('the Fabric seed experiment exists and the retired second card is gone', () => {
  const entries = JSON.parse(rawJson)
  const fabric = entries.find(entry => entry.title === 'Fabric')
  assert.ok(fabric, 'Fabric entry missing')
  assert.equal(fabric.slug, 'fabric')
  assert.equal(fabric.url, '/experiments/fabric/')
  assert.equal(entries.some(entry => entry.slug === 'broadcast-direction-5'), false)
})

test('the index renders one card per JSON entry from the JSON by relative path', () => {
  assert.match(index, /fetch\("\.\/experiments\.json"\)/)
  assert.match(index, /entries\.forEach\(function \(entry, index\) \{[\s\S]*?renderCard\(localizeEntry\(entry\), index\)/)
  assert.match(index, /entry\.title/)
  assert.match(index, /entry\.date/)
  assert.match(index, /entry\.summary/)
  assert.match(index, /card\.href = entry\.url/)
})

test('the index matches the broadcast visual language', () => {
  assert.match(index, /background: #0A0A10/)
  assert.match(index, /class="station-id"/)
  assert.match(index, /\.crt::after/)
  assert.match(index, /el\("div", "crt"\)/)
  assert.match(index, /prefers-reduced-motion:\s*reduce/)
})

test('the Experiments page reads Fabric first, then the microsite study', () => {
  assert.match(index, /class="inquiry fabric-inquiry"/)
  assert.match(index, /data-i18n="exp\.fabric\.inquiryBody"/)
  assert.match(index, /href="\/experiments\/fabric\/"[^>]*data-i18n="exp\.fabric\.inquiryLink"/)
  assert.match(index, /class="inquiry microsite-inquiry"/)
  assert.match(index, /data-i18n="exp\.microsite\.body"/)
  assert.match(index, /href="\/experiments\/microsite\/"[^>]*data-i18n="exp\.microsite\.link"/)
})

test('the two experiment propositions stay distinct and concise', () => {
  assert.equal(localeCopies.en['bc.experiments.fabric.title'], 'SOFTWARE AS MATERIAL')
  assert.equal(localeCopies.en['bc.experiments.microsite.title'], 'HOW DO YOU BUILD A BROADCAST?')
  assert.doesNotMatch(localeCopies.en['bc.experiments.microsite.detail'], /signal/i)
})

test('the Microsite study turns the render catalogue into a narrative', () => {
  for (const key of ['micro.hero.body', 'micro.system.body', 'micro.signal.body', 'micro.vessel.body', 'micro.final.body']) {
    assert.match(microsite, new RegExp(`data-i18n="${key.replace(/[.]/g, '\\.') }"`))
  }
  for (const asset of ['candle-tv-render.jpg', 'slabs-render.jpg', 'rack-b-open-frame-render.jpg', 'water-autoflow-closeup.gif', 'satellite-dish-render.jpg', 'cheomseongdae-render.jpg', 'data-jangseung-render.jpg', 'moon-jars-render.jpg', 'stupa-ceramic-wind-jewel.png', 'stupa-vertical-celadon-future-v3.png']) {
    assert.match(microsite, new RegExp(`/visuals/${asset.replace(/[.]/g, '\\.')}`))
  }
})

test('the Fabric page keeps its original compact HUD copy', () => {
  assert.match(fabric, /data-i18n="idx\.tagline"/)
  assert.doesNotMatch(fabric, /idx\.(?:kicker|signal|motivation)/)
})

test('both existing pages link to /experiments/ from their footers', () => {
  assert.match(broadcast, /<footer class="pf-footer">[\s\S]*?href="\/experiments\/"[\s\S]*?<\/footer>/)
  assert.match(fabric, /<footer[^>]*>[\s\S]*?href="\/experiments\/"[\s\S]*?<\/footer>/)
})

test('the legacy flame-cloth route redirects to canonical Fabric', () => {
  assert.match(legacyFabric, /http-equiv="refresh"[^>]*url=\/experiments\/fabric\//)
  assert.match(legacyFabric, /window\.location\.replace\("\/experiments\/fabric\//)
  assert.match(legacyFabric, /href="\/experiments\/fabric\/"/)
  assert.match(redirects, /\/experiments\/flame-cloth\/ \/experiments\/fabric\/ 301/)
})

// ---- CMS-first wiring -------------------------------------------------------

test('the documented CMS endpoint is the first request, with no other host in the page', () => {
  assert.ok(index.includes(CMS_ENDPOINT), `index.html must request ${CMS_ENDPOINT}`)
  const hosts = [...index.matchAll(/https?:\/\/([^/"'\s)]+)/gi)].map(match => match[1].toLowerCase())
  assert.ok(hosts.length > 0)
  for (const host of hosts) {
    assert.ok(host === 'berlayar.ai' || host.endsWith('.berlayar.ai'), `unexpected host ${host}`)
  }
})

test('a live CMS response renders the cards and no LOCAL COPY badge', async () => {
  const { requested, cards, localCopy, offair } = await load({ cms: { body: { docs: cmsDocs } } })
  assert.deepEqual(requested, [`${CMS_ENDPOINT}&locale=en`, '/i18n/en.json'], 'the CMS response is followed by the selected locale dictionary')
  assert.equal(cards.length, 1, 'the retired Direction 5 card is filtered from CMS responses')
  assert.ok(cardText(cards[0]).includes('Fabric'), 'CMS content renders through the card renderer')
  assert.equal(localCopy.hidden, true, 'the badge stays hidden on the CMS path')
  assert.equal(offair.hidden, true)
})

for (const [label, cms] of Object.entries({
  'an HTTP error': { status: 500 },
  'a network failure': undefined,
  'an empty docs array': { body: { docs: [] } },
  'a payload with no docs key': { body: {} },
})) {
  test(`${label} falls back to the checked-in JSON with the LOCAL COPY badge`, async () => {
    const { requested, cards, localCopy, offair } = await load({ cms, local: { body: localEntries } })
    assert.deepEqual(requested, [`${CMS_ENDPOINT}&locale=en`, LOCAL_COPY, '/i18n/en.json'], 'CMS first, then local copy and its locale dictionary')
    assert.equal(cards.length, localEntries.length)
    assert.deepEqual(
      cards.map(card => cardText(card).find(text => text.startsWith('CH'))),
      ['CH 01'],
      'the JSON renders the single Fabric entry'
    )
    assert.equal(localCopy.hidden, false, 'the LOCAL COPY badge must show')
    assert.equal(offair.hidden, true)
  })
}

test('the LOCAL COPY badge ships hidden in the markup and is hidden by CSS', () => {
  assert.match(index, /<p id="local-copy" hidden data-i18n="exp\.local">LOCAL COPY<\/p>/)
  assert.match(index, /\[hidden\] \{ display: none !important; \}/)
})

test('both sources failing leaves the page OFF AIR with an empty wall', async () => {
  const { requested, cards, localCopy, offair } = await load({})
  assert.deepEqual(requested, [`${CMS_ENDPOINT}&locale=en`, LOCAL_COPY])
  assert.equal(cards.length, 0)
  assert.equal(offair.hidden, false)
  assert.equal(localCopy.hidden, true, 'no badge when nothing was rendered')
})

test('the CMS request carries the locale the i18n layer resolved', async () => {
  const query = async options => (await load({ cms: { body: { docs: cmsDocs } }, ...options })).requested[0]
  assert.equal(await query({ search: '?lang=ko' }), `${CMS_ENDPOINT}&locale=ko`, '?lang wins')
  assert.equal(await query({ search: '?lang=ko', stored: 'ja' }), `${CMS_ENDPOINT}&locale=ko`, '?lang beats storage')
  assert.equal(await query({ stored: 'ja' }), `${CMS_ENDPOINT}&locale=ja`, 'stored pf-lang is next')
  assert.equal(await query({ language: 'zh-CN' }), `${CMS_ENDPOINT}&locale=zh`, 'navigator.language is last')
  assert.equal(await query({ search: '?lang=de', language: 'de-DE' }), CMS_ENDPOINT, 'unknown locales are dropped')
})

test('a CMS doc and a JSON entry render through the same card renderer', async () => {
  const entry = { slug: 'ident-loop', title: 'Ident Loop', date: '2026-08-01', summary: 'Station ident study.', url: '/ident' }
  const fromCms = await load({ cms: { body: { docs: [{ ...entry, date: '2026-08-01T00:00:00.000Z' }] } } })
  const fromJson = await load({ cms: { status: 503 }, local: { body: [entry] } })
  assert.deepEqual(serialize(fromCms.cards[0]), serialize(fromJson.cards[0]), 'the two paths must produce one card shape')
  assert.ok(cardText(fromCms.cards[0]).includes('2026-08-01'), 'CMS ISO datetimes are trimmed to the date')
})

test('the renderer writes text only — CMS values never become markup or a javascript: href', async () => {
  assert.doesNotMatch(index, /innerHTML|insertAdjacentHTML|document\.write/, 'the renderer must stay textContent-only')
  const { cards } = await load({
    cms: {
      body: {
        docs: [
          { slug: 's', title: '<img src=x onerror="alert(1)">', date: '2026-07-30', summary: '<b>hi</b>', url: '/x' },
          { slug: 'evil', title: 'Evil', date: '2026-07-30', summary: 'nope', url: 'javascript:alert(1)' },
          { slug: 'proto', title: 'Protocol relative', date: '2026-07-30', summary: 'nope', url: '//evil.example' },
          { slug: 'blank', title: '', date: '2026-07-30', summary: 'no title', url: '/y' },
        ],
      },
    },
  })
  assert.equal(cards.length, 1, 'unsafe or incomplete docs are dropped, not rendered')
  const [card] = cards
  assert.ok(cardText(card).includes('<img src=x onerror="alert(1)">'), 'markup stays inert text')
  const hrefs = []
  const walk = node => { if (node.href !== undefined) hrefs.push(node.href); node.children.forEach(walk) }
  walk(card)
  assert.deepEqual(hrefs, ['/x'])
})
