import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
const fixture = JSON.parse(await readFile(new URL('../public/fixtures/artist-responses.json', import.meta.url), 'utf8'))

const LOCALES = ['en', 'ko', 'zh', 'ja']
const dicts = {}
for (const locale of LOCALES) {
  dicts[locale] = JSON.parse(await readFile(new URL(`../public/i18n/${locale}.json`, import.meta.url), 'utf8'))
}

const LIST_URL = 'https://berlayar.ai/api/artist-responses?where[status][equals]=published&limit=100&depth=0'
const CREATE_URL = 'https://berlayar.ai/api/artist-responses'
// Hosts the Broadcast is allowed to name: its own canonical origin, and the shared CMS.
const ALLOWED_HOSTS = new Set(['performingfire.berlayar.ai', 'berlayar.ai'])

/**
 * The CH 02 block is inline in index.html, so there is nothing to import. Slice the real source
 * out of the page and run it under node:vm against a DOM stub — that exercises the actual fetch,
 * render, submit, and fallback paths rather than asserting on the shape of the source text.
 */
const BLOCK_START = '/* ---------- CH 02: artist responses'
const BLOCK_END = '/* ---------- CH 00: tap toggles'
const start = broadcast.indexOf(BLOCK_START)
const end = broadcast.indexOf(BLOCK_END)
assert.ok(start > 0 && end > start, 'could not locate the CH 02 block in index.html')
const CH02 = broadcast.slice(start, end)

function makeEl (tag) {
  return {
    tagName: tag,
    className: '',
    children: [],
    _text: '',
    hidden: false,
    value: '',
    listeners: {},
    set textContent (v) { this._text = v; this.children = [] },
    get textContent () { return this._text || this.children.map(c => c.textContent).join(' | ') },
    appendChild (c) { this.children.push(c); return c },
    addEventListener (type, fn) { (this.listeners[type] ||= []).push(fn) },
    reset () { this.value = '' },
    fire (type, event) { (this.listeners[type] || []).forEach(fn => fn(event)) },
  }
}

/** A fresh page + network stub. `plan` maps a URL substring to a canned response. */
function harness ({ plan = {}, lang = 'ko', storage = new Map(), storageThrows = false } = {}) {
  const nodes = {
    '#voicesList': makeEl('div'),
    '#voicesFallback': makeEl('p'),
    '#offerForm': makeEl('form'),
    '#queueConfirm': makeEl('div'),
    '#sendAnother': makeEl('button'),
    '#f-name': makeEl('input'),
    '#f-disc': makeEl('input'),
    '#f-resp': makeEl('textarea'),
  }
  const calls = []
  const ctx = {
    $: sel => nodes[sel] ?? null,
    pad2: n => String(n).padStart(2, '0'),
    tr: (key, fallback) => fallback,
    document: { createElement: makeEl },
    window: {
      PF_I18N: { current: () => lang },
      localStorage: {
        getItem: k => {
          if (storageThrows) throw new Error('storage blocked')
          return storage.has(k) ? storage.get(k) : null
        },
        setItem: (k, v) => {
          if (storageThrows) throw new Error('storage blocked')
          storage.set(k, v)
        },
      },
      fetch: (url, opts) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body, headers: opts?.headers })
        const key = Object.keys(plan).find(k => url.includes(k))
        const res = key ? plan[key] : { ok: false, status: 599 }
        if (res.down) return Promise.reject(new Error('network down'))
        return Promise.resolve({ ok: res.ok, status: res.status, json: () => Promise.resolve(res.json) })
      },
    },
  }
  ctx.window.window = ctx.window
  vm.createContext(ctx)

  const api = {
    nodes,
    calls,
    storage,
    plan,
    boot () { vm.runInContext(`(function(){ "use strict";\n${CH02}\n})()`, ctx); return api },
    // Let the fetch chains settle; every path is at most a couple of promise hops.
    async settle () { await new Promise(r => setTimeout(r, 25)); return api },
    submit ({ name = '', discipline = '', response = 'an offering' } = {}) {
      nodes['#f-name'].value = name
      nodes['#f-disc'].value = discipline
      nodes['#f-resp'].value = response
      nodes['#offerForm'].fire('submit', { preventDefault () {} })
      return api
    },
    cards: () => nodes['#voicesList'].children,
    fallbackShown: () => nodes['#voicesFallback'].hidden === false,
    queue: () => JSON.parse(storage.get('pf-response-queue') ?? 'null'),
  }
  return api
}

const ok = json => ({ ok: true, status: 200, json })
const down = { down: true }
const seeded = () => ok(structuredClone(fixture))

// ---------------------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------------------

test('on load the channel GETs published responses and renders them newest first', async () => {
  const h = harness({
    plan: {
      'artist-responses?where': ok({
        docs: [
          { id: 'a', name: 'Rin', discipline: 'sound', language: 'ja', response: 'older', createdAt: '2026-07-01T00:00:00Z' },
          { id: 'b', name: '', discipline: 'film', language: 'en', response: 'newer', createdAt: '2026-07-09T00:00:00Z' },
        ],
      }),
    },
  }).boot()
  await h.settle()

  assert.equal(h.calls[0].url, LIST_URL, 'the list request must be published-only, limit 100, depth 0')
  assert.equal(h.calls[0].method, 'GET')

  const cards = h.cards()
  assert.equal(cards.length, 2)
  assert.match(cards[0].textContent, /newer/, 'the newest response leads')
  assert.match(cards[1].textContent, /older/)
  assert.match(cards[0].children[0].textContent, /CALLER 01 — ANONYMOUS/, 'a missing name renders as anonymous')
  assert.match(cards[0].children[0].textContent, /film · EN/, 'discipline and language render')
  assert.match(cards[1].children[0].textContent, /CALLER 02 — Rin · sound · JA/, 'a supplied name renders')
  assert.equal(h.fallbackShown(), false, 'a healthy line shows no static banner')
})

test('when the CMS is unreachable the seeded fixture drives the render behind the static banner', async () => {
  const h = harness({
    plan: { 'artist-responses?where': down, 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()

  assert.equal(h.cards().length, fixture.docs.length, 'the seed reel renders offline')
  assert.equal(h.fallbackShown(), true, 'the transmission-static fallback is raised')
  assert.match(h.cards()[0].textContent, /그림을 기계가 이해하는/, 'the newest seed leads')
})

test('an empty collection also falls back to the fixture rather than an empty channel', async () => {
  const h = harness({
    plan: { 'artist-responses?where': ok({ docs: [] }), 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()

  assert.equal(h.cards().length, fixture.docs.length)
  assert.equal(h.fallbackShown(), true)
})

test('a total outage raises the banner instead of throwing or blanking the channel', async () => {
  const h = harness({ plan: { 'artist-responses': down, 'fixtures/': down } }).boot()
  await h.settle()

  assert.equal(h.fallbackShown(), true, 'the banner stands in when even the fixture is gone')
  assert.equal(h.cards().length, 0, 'no card is invented')
  // An unhandled rejection anywhere in the load path fails this test outright.
})

test('submitting POSTs JSON to the CMS in the current locale and keeps the on-air confirm', async () => {
  const h = harness({
    lang: 'ko',
    plan: { 'artist-responses?where': ok({ docs: [] }), 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()
  h.plan['artist-responses'] = { ok: true, status: 201, json: { id: 'new' } }
  h.calls.length = 0

  h.submit({ name: '  Mira  ', discipline: 'ceramics', response: 'a question' })

  assert.equal(h.nodes['#offerForm'].hidden, true, 'the form hides')
  assert.equal(h.nodes['#queueConfirm'].hidden, false, 'the queue confirm shows immediately, without awaiting the POST')

  const post = h.calls.find(c => c.method === 'POST')
  assert.equal(post.url, CREATE_URL)
  assert.equal(post.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(post.body), {
    name: 'Mira', discipline: 'ceramics', response: 'a question', language: 'ko',
  }, 'the payload is {name, discipline, response, language} with the field values trimmed')

  assert.match(h.cards()[0].textContent, /PENDING REVIEW/, 'the new response appends locally as pending review')
  assert.match(h.cards()[0].textContent, /a question/)
  assert.equal(h.cards()[0].className, 'caller caller-pending')

  await h.settle()
  assert.equal(h.queue(), null, 'a successful POST queues nothing')
})

test('the submitted language follows the site locale', async () => {
  const h = harness({
    lang: 'ja',
    plan: { 'artist-responses?where': ok({ docs: [] }), 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()
  h.plan['artist-responses'] = { ok: true, status: 201, json: { id: 'new' } }

  h.submit({ response: 'いつか' })
  assert.equal(JSON.parse(h.calls.find(c => c.method === 'POST').body).language, 'ja')
})

test('a failed submit still confirms on air and queues the offering in localStorage', async () => {
  const h = harness({
    plan: { 'artist-responses?where': down, 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()
  h.plan['artist-responses'] = down

  h.submit({ discipline: 'poetry', response: 'offline offering' })
  assert.equal(h.nodes['#queueConfirm'].hidden, false, 'the confirm fires even with the line down')

  await h.settle()
  assert.equal(h.queue().length, 1, 'the offering is queued for retry')
  assert.equal(h.queue()[0].response, 'offline offering')
  assert.equal(h.fallbackShown(), true)
})

test('the next load replays the queue, keeps it visible, and clears it once the line is back', async () => {
  const storage = new Map([['pf-response-queue', JSON.stringify([
    { name: '', discipline: 'poetry', response: 'offline offering', language: 'en' },
  ])]])
  const h = harness({
    storage,
    plan: {
      'artist-responses?where': ok({ docs: [] }),
      'fixtures/artist-responses.json': seeded(),
      'artist-responses': { ok: true, status: 201, json: { id: 'flushed' } },
    },
  }).boot()
  await h.settle()

  assert.match(h.cards()[0].textContent, /offline offering/, 'the unsent offering stays visible')
  assert.match(h.cards()[0].textContent, /PENDING REVIEW/)
  assert.deepEqual(h.queue(), [], 'the queue drains once the POST lands')
})

test('a still-dead line leaves the queued offering queued', async () => {
  const storage = new Map([['pf-response-queue', JSON.stringify([
    { name: '', discipline: 'x', response: 'still stuck', language: 'en' },
  ])]])
  const h = harness({
    storage,
    plan: { 'artist-responses?where': down, 'fixtures/artist-responses.json': seeded(), 'artist-responses': down },
  }).boot()
  await h.settle()

  assert.equal(h.queue().length, 1, 'nothing is dropped while the line is down')
  assert.equal(h.queue()[0].response, 'still stuck')
})

test('blocked localStorage (private mode) still renders and submits', async () => {
  const h = harness({
    storageThrows: true,
    plan: { 'artist-responses?where': ok({ docs: [] }), 'fixtures/artist-responses.json': seeded() },
  }).boot()
  await h.settle()

  h.submit({ response: 'private mode' })
  await h.settle()
  assert.equal(h.cards().length, fixture.docs.length + 1, 'the channel survives storage throwing on read and write')
})

test('response text from the CMS is rendered as text, never as markup', async () => {
  const h = harness({
    plan: {
      'artist-responses?where': ok({
        docs: [{
          id: 'x',
          name: '<img src=x onerror=alert(1)>',
          discipline: '<b>d</b>',
          language: 'en',
          response: '<script>alert(1)<\/script>',
          createdAt: '2026-07-09T00:00:00Z',
        }],
      }),
    },
  }).boot()
  await h.settle()

  const card = h.cards()[0]
  assert.equal(card.children[1].textContent, '<script>alert(1)<\/script>', 'the raw text is preserved verbatim as a text node')
  assert.match(card.children[0].textContent, /<img src=x onerror=alert\(1\)>/)
  const source = broadcast.slice(start, broadcast.indexOf('function newestFirst'))
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|outerHTML/, 'untrusted CMS text must only reach the DOM via textContent')
})

test('a malformed CMS payload degrades to the fixture instead of throwing', async () => {
  for (const body of [null, {}, { docs: null }]) {
    const h = harness({
      plan: { 'artist-responses?where': ok(body), 'fixtures/artist-responses.json': seeded() },
    }).boot()
    await h.settle()
    assert.equal(h.cards().length, fixture.docs.length, `payload ${JSON.stringify(body)} must fall back cleanly`)
  }
})

test('a non-2xx list response is treated as a failure, not as data', async () => {
  for (const status of [404, 500]) {
    const h = harness({
      plan: { 'artist-responses?where': { ok: false, status, json: { errors: [] } }, 'fixtures/artist-responses.json': seeded() },
    }).boot()
    await h.settle()
    assert.equal(h.fallbackShown(), true, `HTTP ${status} must raise the fallback`)
    assert.equal(h.cards().length, fixture.docs.length)
  }
})

// ---------------------------------------------------------------------------------------
// Page and fixture contract
// ---------------------------------------------------------------------------------------

test('the Voices channel renders into a container instead of hard-coded callers', () => {
  assert.match(broadcast, /<div class="callers" id="voicesList"/, 'the channel must expose a render container')
  assert.doesNotMatch(broadcast, /<article class="caller">/, 'the callers must come from the CMS or the fixture, not the markup')
})

test('the fallback banner is localized in all four dictionaries', () => {
  assert.match(broadcast, /id="voicesFallback"[^>]*hidden[^>]*data-i18n="bc\.ch02\.fallback"/)
  for (const key of ['bc.ch02.fallback', 'bc.ch02.pending', 'bc.ch02.anonymous']) {
    for (const locale of LOCALES) {
      assert.equal(typeof dicts[locale][key], 'string', `${locale}.json is missing ${key}`)
      assert.notEqual(dicts[locale][key].trim(), '', `${locale}.json ${key} must be non-empty`)
    }
  }
})

test('no host other than the site origin and the shared CMS appears in the page', () => {
  const hosts = new Set([...broadcast.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)].map(m => m[1]))
  for (const host of hosts) {
    assert.ok(ALLOWED_HOSTS.has(host), `index.html must not reference ${host}`)
  }
  assert.ok(hosts.has('berlayar.ai'), 'the CMS host must be wired up')
})

test('the page embeds no credential, API key, or admin URL', () => {
  assert.doesNotMatch(broadcast, /\/admin\b/, 'the Payload admin must not be linked from the page')
  assert.doesNotMatch(broadcast, /Authorization|Bearer |api[_-]?key|apiKey|payload-token/i)
  const post = broadcast.match(/function postResponse\([\s\S]*?\n {2}\}/)[0]
  assert.doesNotMatch(post, /credentials:/, 'the create must not carry cookies or credentials')
})

test('the seeded fixture is Payload-shaped and complete', () => {
  assert.ok(Array.isArray(fixture.docs), 'the fixture must expose a docs array like the CMS list response')
  assert.ok(fixture.docs.length > 0, 'the fixture must seed at least one response')
  assert.equal(fixture.totalDocs, fixture.docs.length, 'totalDocs must match the seeded docs')
  const ids = new Set()
  for (const doc of fixture.docs) {
    assert.equal(typeof doc.id, 'string', 'every doc needs an id')
    assert.ok(!ids.has(doc.id), `duplicate fixture id ${doc.id}`)
    ids.add(doc.id)
    assert.equal(typeof doc.name, 'string', `${doc.id} name must be a string (empty means anonymous)`)
    assert.equal(typeof doc.discipline, 'string', `${doc.id} discipline must be a string`)
    assert.equal(doc.status, 'published', `${doc.id} must be published — the fixture mirrors a published-only read`)
    assert.ok(LOCALES.includes(doc.language), `${doc.id} language ${doc.language} is not a supported locale`)
    assert.notEqual(String(doc.response).trim(), '', `${doc.id} must carry response text`)
    assert.ok(!Number.isNaN(Date.parse(doc.createdAt)), `${doc.id} createdAt must be an ISO timestamp`)
  }
})

test('the fixture carries no contact details or remote references', () => {
  // Scoped to docs: the top-level _note documents the endpoint the fixture mirrors.
  const source = JSON.stringify(fixture.docs)
  assert.doesNotMatch(source, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'the seeded docs must not contain email addresses')
  assert.doesNotMatch(source, /https?:\/\//, 'the seeded docs must not reference remote resources')
})
