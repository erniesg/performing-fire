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
