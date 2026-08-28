import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const manifestUrl = new URL('../public/research/archive-snapshot.json', import.meta.url)
const rendererUrl = new URL('../public/js/research-gallery.js', import.meta.url)

test('research snapshot preserves verified counts without inventing a total', async () => {
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const count = id => snapshot.counts.find(item => item.id === id)?.count

  assert.equal(count('antiegg-posts'), 1463)
  assert.equal(count('njpvideo-catalogue'), 678)
  assert.equal(count('njpvideo-video'), 401)
  assert.equal(count('njpvideo-image'), 205)
  assert.equal(count('njpvideo-pdf'), 72)
  assert.equal(count('njpvideo-srt'), 38)
  assert.equal(count('videoarchive-pdf'), 8)
  assert.equal(count('njp-youtube'), 156)
  assert.equal(snapshot.samples.length, 10)
  assert.ok(snapshot.scores.some(item => item.catalogueId === '570'))
  assert.equal('total' in snapshot, false)
  assert.match(snapshot.meta.overlapNote, /overlap/i)
})

test('research snapshot uses complete, unique, safe presentation records', async () => {
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const ids = [...snapshot.counts, ...snapshot.samples].map(item => item.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(Object.keys(snapshot.meta.observed).sort(), ['2026-07-27', '2026-08-03'])

  for (const record of snapshot.samples) {
    for (const field of ['id', 'group', 'source', 'kind', 'title', 'sourceUrl', 'status', 'note']) {
      assert.equal(typeof record[field], 'string', `${record.id}.${field} must be a string`)
      assert.notEqual(record[field].trim(), '', `${record.id}.${field} must be non-empty`)
    }
    assert.match(record.group, /^[abcd]$/)
    assert.match(record.sourceUrl, /^https:/)
  }

  for (const score of snapshot.scores) {
    assert.equal(score.status, 'collection record verified · score candidate')
    assert.match(score.sourceUrl, /^https:/)
  }
})

test('gallery API normalizes complete payloads and rejects malformed data', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const context = { window: {}, document: {}, URL, console }
  vm.runInNewContext(source, context)
  const gallery = context.window.PF_RESEARCH_GALLERY
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))

  assert.deepEqual(gallery.normalize(snapshot), snapshot)
  assert.throws(() => gallery.normalize({ ...snapshot, samples: {} }), /samples/)
  assert.throws(() => gallery.normalize({ ...snapshot, samples: [{ id: 'missing' }] }), /sample/)
  assert.throws(() => gallery.normalize({
    ...snapshot,
    counts: [{ ...snapshot.counts[0], observed: 'not-a-date' }],
  }), /count.*observed/i)
  assert.throws(() => gallery.normalize({
    ...snapshot,
    meta: { ...snapshot.meta, observed: { ...snapshot.meta.observed, '2026-02-29': 'Impossible date' } },
  }), /observed date/i)
  assert.throws(() => gallery.normalize({
    ...snapshot,
    meta: { ...snapshot.meta, observed: { '2026-02-28': 'Valid date' } },
    counts: [{ ...snapshot.counts[0], observed: '2026-02-29' }],
  }), /count.*observed/i)
  assert.equal(gallery.safeUrl('https://example.com/source'), 'https://example.com/source')
  for (const unsafe of ['javascript:alert(1)', 'data:text/html,nope', '//example.com', 'http://example.com', 'not a url']) {
    assert.equal(gallery.safeUrl(unsafe), '', unsafe)
  }
})

test('gallery implementation renders through textContent only', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  assert.match(source, /textContent/)
  assert.doesNotMatch(source, /innerHTML/)
  assert.match(source, /fetch\(['"]\/research\/archive-snapshot\.json['"]\)/)
  assert.match(source, /data-research-error/)
  assert.match(source, /Escape/)
})

function makeNode (attributes = {}) {
  const listeners = new Map()
  return {
    attributes,
    children: [],
    hidden: false,
    textContent: '',
    focusCalls: 0,
    addEventListener (type, listener) { listeners.set(type, listener) },
    removeEventListener (type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
    appendChild (child) { this.children.push(child); return child },
    getAttribute (name) { return this.attributes[name] ?? null },
    removeChild (child) { this.children.splice(this.children.indexOf(child), 1); return child },
    get firstChild () { return this.children[0] ?? null },
    focus () { this.focusCalls++ },
    trigger (type, event = {}) { listeners.get(type)?.(event) },
    querySelector () { return null },
  }
}

test('repeated init keeps one reader Escape handler and restores the current opener', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const counts = makeNode()
  const scores = makeNode()
  const samples = makeNode({ 'data-research-group': 'a' })
  const error = makeNode()
  const reader = makeNode()
  const close = makeNode()
  reader.querySelector = selector => (selector === '[data-research-reader-close]' ? close : null)
  const documentListeners = new Map()
  const byId = { researchReader: reader }
  const document = {
    createElement: () => makeNode(),
    getElementById: id => byId[id] ?? null,
    querySelector: selector => ({
      '[data-research-counts]': counts,
      '[data-research-scores]': scores,
      '[data-research-error]': error,
    })[selector] ?? null,
    querySelectorAll: selector => (selector === '[data-research-group]' ? [samples] : []),
    addEventListener (type, listener) {
      const handlers = documentListeners.get(type) ?? []
      handlers.push(listener)
      documentListeners.set(type, handlers)
    },
    removeEventListener (type, listener) {
      const handlers = documentListeners.get(type) ?? []
      documentListeners.set(type, handlers.filter(handler => handler !== listener))
    },
  }
  const window = {
    fetch: async () => ({ ok: true, json: async () => snapshot }),
  }
  vm.runInNewContext(source, { window, document, URL, console })

  await window.PF_RESEARCH_GALLERY.init()
  await window.PF_RESEARCH_GALLERY.init()
  assert.equal(documentListeners.get('keydown').length, 1)

  const opener = samples.children[0]
  opener.trigger('click')
  assert.equal(reader.hidden, false)
  documentListeners.get('keydown')[0]({ key: 'Escape' })
  assert.equal(reader.hidden, true)
  assert.equal(opener.focusCalls, 1)

  opener.trigger('click')
  delete byId.researchReader
  await window.PF_RESEARCH_GALLERY.init()
  assert.equal(documentListeners.get('keydown').length, 0)
  assert.equal(reader.hidden, false)

  const replacement = makeNode()
  const replacementClose = makeNode()
  replacement.querySelector = selector => (selector === '[data-research-reader-close]' ? replacementClose : null)
  byId.researchReader = replacement
  await window.PF_RESEARCH_GALLERY.init()
  assert.equal(documentListeners.get('keydown').length, 1)
  samples.children[0].trigger('click')
  documentListeners.get('keydown')[0]({ key: 'Escape' })
  assert.equal(replacement.hidden, true)
  assert.equal(reader.hidden, false)

  const replacementOpener = samples.children[0]
  replacementOpener.trigger('click')
  assert.equal(replacement.hidden, false)
  const focusBeforeFailedInit = replacementOpener.focusCalls
  delete byId.researchReader
  window.fetch = async () => { throw new Error('network failure') }
  await window.PF_RESEARCH_GALLERY.init()
  assert.equal(documentListeners.get('keydown').length, 0)
  assert.equal(replacement.hidden, false)
  assert.equal(replacementOpener.focusCalls, focusBeforeFailedInit)
})
