import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = await readFile(new URL('../public/js/broadcast-content.js', import.meta.url), 'utf8')
const broadcast = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')

function loadAdapter ({ endpoint = '', href = 'https://performingfire.berlayar.ai/', response } = {}) {
  const calls = []
  const window = {
    location: new URL(href),
    setTimeout,
    clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, options })
      if (response instanceof Error) throw response
      return response ?? { ok: true, json: async () => ({}) }
    },
  }
  window.window = window
  const document = { querySelector: () => ({ getAttribute: () => endpoint }) }
  vm.runInNewContext(source, { window, document, URL, AbortController, Promise })
  return { adapter: window.PF_BROADCAST_CONTENT, calls }
}

test('the endpoint is empty by default, so bundled content requires no network', async () => {
  assert.match(broadcast, /<meta name="pf-broadcast-endpoint" content="">/)
  const { adapter, calls } = loadAdapter()
  assert.equal(await adapter.load('en'), null)
  assert.equal(calls.length, 0)
})

test('only same-origin and approved berlayar https endpoints are accepted', () => {
  const { adapter } = loadAdapter()
  assert.match(adapter.approvedEndpoint('/api/broadcast-content'), /^https:\/\/performingfire\.berlayar\.ai\//)
  assert.match(adapter.approvedEndpoint('https://berlayar.ai/api/broadcast-content'), /^https:\/\/berlayar\.ai\//)
  assert.equal(adapter.approvedEndpoint('https://example.com/api/broadcast-content'), '')
  assert.equal(adapter.approvedEndpoint('javascript:alert(1)'), '')
})

test('a configured request forwards the selected locale', async () => {
  const payload = { status: 'published', locale: 'ja', channels: { about: { transmissions: [{ heading: '方程式' }] } } }
  const { adapter, calls } = loadAdapter({
    endpoint: 'https://berlayar.ai/api/broadcast-content',
    response: { ok: true, json: async () => payload },
  })
  const result = await adapter.load('ja')
  assert.equal(new URL(calls[0].url).searchParams.get('locale'), 'ja')
  assert.equal(result.about[0].heading, '方程式')
})

test('normalization accepts copy only and rejects remote structure or unsafe links', () => {
  const { adapter } = loadAdapter()
  const result = adapter.normalize({
    status: 'published', locale: 'en',
    channels: {
      about: { renderer: 'evil', transmissions: [{
        label: '<b>text</b>', heading: 'Heading', body: '<img onerror=alert(1)>',
        linkLabel: 'bad', linkHref: 'javascript:alert(1)', layout: 'edge-to-edge', script: 'alert(1)',
      }] },
    },
  }, 'en')
  assert.deepEqual(Object.keys(result), ['about'])
  assert.deepEqual(Object.keys(result.about[0]).sort(), ['body', 'heading', 'label'])
  assert.equal(result.about[0].label, '<b>text</b>')
  assert.equal(result.about[0].body, '<img onerror=alert(1)>')
  assert.equal('linkHref' in result.about[0], false)
  assert.equal('renderer' in result.about[0], false)
  assert.equal('layout' in result.about[0], false)
  assert.equal('script' in result.about[0], false)
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|outerHTML/)
})

test('unsupported locales and malformed, empty, draft, or failed responses fall back', async () => {
  const { adapter } = loadAdapter()
  assert.equal(await adapter.load('fr'), null)
  for (const payload of [null, {}, { status: 'draft', channels: {} }, { locale: 'ko', channels: {} }, { channels: { about: { transmissions: [] } } }]) {
    assert.equal(adapter.normalize(payload, 'en'), null)
  }
  const failed = loadAdapter({ endpoint: '/api/broadcast-content', response: new Error('offline') })
  assert.equal(await failed.adapter.load('en'), null)
})
