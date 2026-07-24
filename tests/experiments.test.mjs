import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const rawJson = await readFile(new URL('../public/experiments/experiments.json', import.meta.url), 'utf8')
const index = await readFile(new URL('../public/experiments/index.html', import.meta.url), 'utf8')
const broadcast = await readFile(new URL('../public/broadcast.html', import.meta.url), 'utf8')
const flameCloth = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')

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
