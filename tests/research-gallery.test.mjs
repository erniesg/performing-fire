import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const manifestUrl = new URL('../public/research/archive-snapshot.json', import.meta.url)
const rendererUrl = new URL('../public/js/research-gallery.js', import.meta.url)
const broadcastUrl = new URL('../public/broadcast/index.html', import.meta.url)

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
    parentNode: null,
    hidden: false,
    textContent: '',
    focusCalls: 0,
    addEventListener (type, listener) { listeners.set(type, listener) },
    removeEventListener (type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
    appendChild (child) { child.parentNode = this; this.children.push(child); return child },
    getAttribute (name) { return this.attributes[name] ?? null },
    removeChild (child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; return child },
    get firstChild () { return this.children[0] ?? null },
    focus () { this.focusCalls++ },
    trigger (type, event = {}) { listeners.get(type)?.(event) },
    querySelector () { return null },
  }
}

function makeResearchDom () {
  const counts = makeNode()
  const scores = makeNode()
  const samples = makeNode({ 'data-research-group': 'a' })
  const error = makeNode()
  const reader = makeNode()
  const close = makeNode()
  const byId = {
    researchReader: reader,
    researchReaderClose: close,
    researchReaderTitle: makeNode(),
    researchReaderSource: makeNode(),
    researchReaderKind: makeNode(),
    researchReaderStatus: makeNode(),
    researchReaderNote: makeNode(),
    researchReaderLink: makeNode(),
  }
  reader.querySelector = selector => (selector === '[data-research-reader-close]' ? close : null)
  const listeners = new Map()
  const document = {
    createElement: () => makeNode(),
    getElementById: id => byId[id] ?? null,
    querySelector: selector => ({
      '[data-research-counts]': counts,
      '[data-research-scores]': scores,
      '[data-research-error]': error,
    })[selector] ?? null,
    querySelectorAll: selector => {
      if (selector === '[data-research-group]') return [samples]
      if (selector === '.research-loading') return []
      return []
    },
    addEventListener (type, listener, options = {}) {
      const entries = listeners.get(type) ?? []
      entries.push({ listener, once: Boolean(options && options.once) })
      listeners.set(type, entries)
    },
    removeEventListener (type, listener) {
      const entries = listeners.get(type) ?? []
      listeners.set(type, entries.filter(entry => entry.listener !== listener))
    },
    dispatchEvent (event) {
      const entries = [...(listeners.get(event.type) ?? [])]
      for (const entry of entries) {
        entry.listener(event)
        if (entry.once) this.removeEventListener(event.type, entry.listener)
      }
      return true
    },
  }
  return { document, counts, scores, samples, error, reader, close, byId, listeners }
}

function localizedResearchCopy (locale) {
  const copy = {
    en: {
      'bc.research.count.antieggPosts': '1,463 ANTIEGG records · observed 2026-08-03',
      'bc.research.scores.status': 'verified score candidate',
      'bc.research.openRecord': 'OPEN RECORD',
      'bc.research.sourceLink': 'OPEN ORIGINAL SOURCE →',
      'bc.research.error': 'RESEARCH UNAVAILABLE',
    },
    ko: {
      'bc.research.count.antieggPosts': 'ANTIEGG 기록 1,463건 · 2026-08-03 관찰',
      'bc.research.scores.status': '검증된 스코어 후보',
      'bc.research.openRecord': '레코드 열기',
      'bc.research.sourceLink': '원본 소스 열기 →',
      'bc.research.error': '연구 스냅샷 사용 불가',
    },
  }
  return key => copy[locale][key] ?? ''
}

test('broadcast language events re-render dynamic research chrome without translating record titles', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const broadcast = await readFile(broadcastUrl, 'utf8')
  const integration = broadcast.match(/<script src="\/js\/research-gallery\.js"><\/script>\s*<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const payload = { ...snapshot, counts: snapshot.counts.slice(0, 1), samples: snapshot.samples.slice(0, 1), scores: snapshot.scores.slice(0, 1) }
  const dom = makeResearchDom()
  let locale = 'en'
  const window = {
    fetch: async () => ({ ok: true, json: async () => payload }),
    PF_I18N: { t: key => localizedResearchCopy(locale)(key) },
  }
  const context = { window, document: dom.document, URL, console, Promise }
  vm.runInNewContext(source, context)
  vm.runInNewContext(integration, context)

  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(dom.counts.children[0].children[0].textContent, '1,463 ANTIEGG records · observed 2026-08-03')
  assert.equal(dom.scores.children[0].children[0].textContent, payload.scores[0].title)
  assert.equal(dom.scores.children[0].children[2].textContent, 'verified score candidate')
  assert.equal(dom.scores.children[0].children[3].textContent, 'OPEN ORIGINAL SOURCE →')
  assert.match(dom.samples.children[0].textContent, new RegExp(`${payload.samples[0].title}.*OPEN RECORD`))
  dom.samples.children[0].trigger('click')
  assert.equal(dom.byId.researchReaderTitle.textContent, payload.samples[0].title)
  assert.equal(dom.byId.researchReaderLink.textContent, 'OPEN ORIGINAL SOURCE →')

  locale = 'ko'
  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(dom.counts.children[0].children[0].textContent, 'ANTIEGG 기록 1,463건 · 2026-08-03 관찰')
  assert.equal(dom.scores.children[0].children[0].textContent, payload.scores[0].title)
  assert.equal(dom.scores.children[0].children[2].textContent, '검증된 스코어 후보')
  assert.equal(dom.scores.children[0].children[3].textContent, '원본 소스 열기 →')
  assert.match(dom.samples.children[0].textContent, new RegExp(`${payload.samples[0].title}.*레코드 열기`))
  assert.equal(dom.byId.researchReaderTitle.textContent, payload.samples[0].title)
  assert.equal(dom.byId.researchReaderLink.textContent, '원본 소스 열기 →')

  window.fetch = async () => { throw new Error('network failure') }
  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(dom.error.textContent, '연구 스냅샷 사용 불가')
  assert.equal(dom.error.hidden, false)
})

test('closing an open reader after a language render restores focus to the current record button', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const broadcast = await readFile(broadcastUrl, 'utf8')
  const integration = broadcast.match(/<script src="\/js\/research-gallery\.js"><\/script>\s*<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const payload = { ...snapshot, counts: snapshot.counts.slice(0, 1), samples: snapshot.samples.slice(0, 1), scores: snapshot.scores.slice(0, 1) }
  const dom = makeResearchDom()
  let locale = 'en'
  const window = {
    fetch: async () => ({ ok: true, json: async () => payload }),
    PF_I18N: { t: key => localizedResearchCopy(locale)(key) },
  }
  const context = { window, document: dom.document, URL, console, Promise }
  vm.runInNewContext(source, context)
  vm.runInNewContext(integration, context)

  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  const detachedOpener = dom.samples.children[0]
  detachedOpener.trigger('click')

  locale = 'ko'
  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  const currentOpener = dom.samples.children[0]
  assert.notEqual(currentOpener, detachedOpener)
  assert.equal(detachedOpener.parentNode, null)
  assert.equal(currentOpener.parentNode, dom.samples)

  dom.close.trigger('click')
  assert.equal(currentOpener.focusCalls, 1)
  assert.equal(detachedOpener.focusCalls, 0)
})

test('a failed language fetch repaints the cached snapshot with current locale chrome', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const broadcast = await readFile(broadcastUrl, 'utf8')
  const integration = broadcast.match(/<script src="\/js\/research-gallery\.js"><\/script>\s*<script>([\s\S]*?)<\/script>/)?.[1] ?? ''
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const payload = { ...snapshot, counts: snapshot.counts.slice(0, 1), samples: snapshot.samples.slice(0, 1), scores: snapshot.scores.slice(0, 1) }
  const dom = makeResearchDom()
  let locale = 'en'
  const window = {
    fetch: async () => ({ ok: true, json: async () => payload }),
    PF_I18N: { t: key => localizedResearchCopy(locale)(key) },
  }
  const context = { window, document: dom.document, URL, console, Promise }
  vm.runInNewContext(source, context)
  vm.runInNewContext(integration, context)

  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))
  dom.samples.children[0].trigger('click')
  assert.equal(dom.byId.researchReaderLink.textContent, 'OPEN ORIGINAL SOURCE →')

  locale = 'ko'
  window.fetch = async () => { throw new Error('network failure') }
  dom.document.dispatchEvent({ type: 'pf:lang' })
  await new Promise(resolve => setImmediate(resolve))

  assert.equal(dom.counts.children[0].children[0].textContent, 'ANTIEGG 기록 1,463건 · 2026-08-03 관찰')
  assert.equal(dom.scores.children[0].children[2].textContent, '검증된 스코어 후보')
  assert.equal(dom.scores.children[0].children[3].textContent, '원본 소스 열기 →')
  assert.match(dom.samples.children[0].textContent, /레코드 열기/)
  assert.doesNotMatch(dom.samples.children[0].textContent, /OPEN RECORD/)
  assert.equal(dom.byId.researchReaderLink.textContent, '원본 소스 열기 →')
  assert.equal(dom.error.textContent, '연구 스냅샷 사용 불가')
  assert.equal(dom.error.hidden, false)
})

test('a stale research response cannot overwrite a newer language render', async () => {
  const source = await readFile(rendererUrl, 'utf8')
  const snapshot = JSON.parse(await readFile(manifestUrl, 'utf8'))
  const payload = { ...snapshot, counts: snapshot.counts.slice(0, 1), samples: snapshot.samples.slice(0, 1), scores: snapshot.scores.slice(0, 1) }
  const dom = makeResearchDom()
  const pending = []
  let locale = 'en'
  const window = {
    fetch: () => new Promise(resolve => pending.push(resolve)),
    PF_I18N: { t: key => localizedResearchCopy(locale)(key) },
  }
  vm.runInNewContext(source, { window, document: dom.document, URL, console })

  const english = window.PF_RESEARCH_GALLERY.init()
  locale = 'ko'
  const korean = window.PF_RESEARCH_GALLERY.init()
  pending[1]({ ok: true, json: async () => payload })
  await korean
  pending[0]({ ok: true, json: async () => payload })
  await english

  assert.equal(dom.counts.children[0].children[0].textContent, 'ANTIEGG 기록 1,463건 · 2026-08-03 관찰')
  assert.equal(dom.scores.children[0].children[2].textContent, '검증된 스코어 후보')
})

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
