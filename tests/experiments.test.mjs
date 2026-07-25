import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const rawJson = await readFile(new URL('../public/experiments/experiments.json', import.meta.url), 'utf8')
const index = await readFile(new URL('../public/experiments/index.html', import.meta.url), 'utf8')
const broadcast = await readFile(new URL('../public/broadcast.html', import.meta.url), 'utf8')
const flameCloth = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')

const CMS_ENDPOINT = 'https://berlayar.ai/api/experiments?limit=100&sort=-date&depth=0'
const LOCAL_COPY = './experiments.json'
const inlineScript = index.match(/<script>([\s\S]*?)<\/script>/)?.[1]
assert.ok(inlineScript, 'experiments/index.html must ship exactly one inline script')

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
  }
  const window = {
    document,
    fetch (url) {
      requested.push(url)
      return /^https?:\/\//i.test(url) ? respond(cms) : respond(local)
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
    slug: 'flame-cloth-v3',
    title: 'Flame Cloth v3',
    date: '2026-07-07T00:00:00.000Z',
    summary: 'Interactive fire-silk study.',
    url: '/',
  },
]
const localEntries = JSON.parse(rawJson)

test('experiments.json parses into a non-empty array', () => {
  const entries = JSON.parse(rawJson)
  assert.ok(Array.isArray(entries))
  assert.ok(entries.length >= 2)
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

test('the two seed experiments exist', () => {
  const entries = JSON.parse(rawJson)
  const flame = entries.find(entry => entry.title === 'Flame Cloth v3')
  assert.ok(flame, 'Flame Cloth v3 entry missing')
  assert.equal(flame.url, '/')
  const direction5 = entries.find(entry => entry.title === 'The Broadcast — Direction 5')
  assert.ok(direction5, 'The Broadcast — Direction 5 entry missing')
  assert.equal(direction5.url, '/broadcast')
})

test('the index renders one card per JSON entry from the JSON by relative path', () => {
  assert.match(index, /fetch\("\.\/experiments\.json"\)/)
  assert.match(index, /entries\.forEach\(function \(entry, index\) \{[\s\S]*?renderCard\(entry, index\)/)
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

test('both existing pages link to /experiments/ from their footers', () => {
  assert.match(broadcast, /<footer class="pf-footer">[\s\S]*?href="\/experiments\/"[\s\S]*?<\/footer>/)
  assert.match(flameCloth, /<footer[^>]*>[\s\S]*?href="\/experiments\/"[\s\S]*?<\/footer>/)
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
  assert.deepEqual(requested, [`${CMS_ENDPOINT}&locale=en`], 'only the CMS is asked when it answers')
  assert.equal(cards.length, cmsDocs.length)
  assert.ok(cardText(cards[0]).includes('The Broadcast — Direction 5'), 'CMS order is preserved (server sorts)')
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
    assert.deepEqual(requested, [`${CMS_ENDPOINT}&locale=en`, LOCAL_COPY], 'CMS first, then the local copy')
    assert.equal(cards.length, localEntries.length)
    assert.deepEqual(
      cards.map(card => cardText(card).find(text => text.startsWith('CH'))),
      ['CH 01 · flame-cloth-v3', 'CH 02 · broadcast-direction-5'],
      'the JSON renders in file order, exactly as before'
    )
    assert.equal(localCopy.hidden, false, 'the LOCAL COPY badge must show')
    assert.equal(offair.hidden, true)
  })
}

test('the LOCAL COPY badge ships hidden in the markup and is hidden by CSS', () => {
  assert.match(index, /<p id="local-copy" hidden>LOCAL COPY · 로컬 사본<\/p>/)
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
