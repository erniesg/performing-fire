;(function (window, document) {
  'use strict'

  const SAMPLE_FIELDS = ['id', 'group', 'source', 'kind', 'title', 'sourceUrl', 'status', 'note']
  const SCORE_STATUS = 'collection record verified · score candidate'
  const COUNT_KEYS = {
    'antiegg-posts': 'bc.research.count.antieggPosts',
    'njp-center-records': 'bc.research.count.njpCenter',
    'njpvideo-catalogue': 'bc.research.count.njpCatalogue',
    'njpvideo-video': 'bc.research.count.njpVideo',
    'njpvideo-image': 'bc.research.count.njpImage',
    'njpvideo-pdf': 'bc.research.count.njpPdf',
    'njpvideo-srt': 'bc.research.count.njpSrt',
    'videoarchive-pdf': 'bc.research.count.videoArchivePdf',
    'njp-youtube': 'bc.research.count.njpYoutube',
  }
  let readerController = null
  let renderRequest = 0
  let lastSnapshot = null

  function nonEmptyString (value) {
    return typeof value === 'string' && value.trim() !== ''
  }

  function safeUrl (value) {
    if (!nonEmptyString(value) || /^\s*\/\//.test(value)) return ''
    try {
      const url = new URL(value)
      return url.protocol === 'https:' ? url.href : ''
    } catch (_) {
      return ''
    }
  }

  function assertArray (value, name) {
    if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`)
  }

  function isCalendarDate (value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }

  function normalize (payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('payload must be an object')
    if (!payload.meta || typeof payload.meta !== 'object' || Array.isArray(payload.meta)) throw new TypeError('meta must be an object')
    if (!payload.meta.observed || typeof payload.meta.observed !== 'object' || Array.isArray(payload.meta.observed)) throw new TypeError('meta.observed must be an object')
    if (!nonEmptyString(payload.meta.overlapNote)) throw new TypeError('meta.overlapNote must be a string')
    const observedDates = new Set(Object.keys(payload.meta.observed))
    for (const date of observedDates) {
      if (!isCalendarDate(date)) throw new TypeError('observed date must be YYYY-MM-DD')
    }

    assertArray(payload.counts, 'counts')
    assertArray(payload.samples, 'samples')
    assertArray(payload.scores, 'scores')
    const ids = new Set()
    for (const count of payload.counts) {
      if (!count || !nonEmptyString(count.id) || !nonEmptyString(count.label) || !Number.isInteger(count.count) || count.count < 0) throw new TypeError('count record is incomplete')
      if (!nonEmptyString(count.observed) || !isCalendarDate(count.observed) || !observedDates.has(count.observed)) throw new TypeError('count observed date must be declared YYYY-MM-DD')
      if (ids.has(count.id)) throw new TypeError('record IDs must be unique')
      ids.add(count.id)
    }
    for (const sample of payload.samples) {
      if (!sample || SAMPLE_FIELDS.some(field => !nonEmptyString(sample[field])) || !/^[abcd]$/.test(sample.group) || !safeUrl(sample.sourceUrl)) throw new TypeError('sample record is incomplete')
      if (ids.has(sample.id)) throw new TypeError('record IDs must be unique')
      ids.add(sample.id)
    }
    for (const score of payload.scores) {
      if (!score || !nonEmptyString(score.catalogueId) || !nonEmptyString(score.title) || !safeUrl(score.sourceUrl) || score.status !== SCORE_STATUS) throw new TypeError('score record is incomplete')
    }
    return payload
  }

  function clear (element) {
    while (element.firstChild) element.removeChild(element.firstChild)
  }

  function element (tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function translated (key, fallback) {
    const value = window.PF_I18N && typeof window.PF_I18N.t === 'function' ? window.PF_I18N.t(key) : ''
    return nonEmptyString(value) ? value : fallback
  }

  function localizedCopy () {
    const countLabels = {}
    for (const [id, key] of Object.entries(COUNT_KEYS)) countLabels[id] = translated(key, '')
    return {
      countLabels,
      scoreStatus: translated('bc.research.scores.status', SCORE_STATUS),
      openRecord: translated('bc.research.openRecord', 'OPEN RECORD'),
      sourceLink: translated('bc.research.sourceLink', 'OPEN ORIGINAL SOURCE →'),
      error: translated('bc.research.error', 'Research records are temporarily unavailable.'),
    }
  }

  function renderCounts (records, copy) {
    const target = document.querySelector('[data-research-counts]')
    if (!target) return
    clear(target)
    for (const record of records) {
      const item = element('li', 'research-count')
      const fallback = `${record.count} ${record.label} · ${record.observed}`
      item.appendChild(element('span', 'research-count__label', copy.countLabels[record.id] || fallback))
      target.appendChild(item)
    }
  }

  function renderScores (records, copy) {
    const target = document.querySelector('[data-research-scores]')
    if (!target) return
    clear(target)
    for (const record of records) {
      const card = element('article', 'research-score')
      card.appendChild(element('h3', 'research-score__title', record.title))
      card.appendChild(element('p', 'research-score__catalogue', `Catalogue ${record.catalogueId}`))
      card.appendChild(element('p', 'research-score__status', copy.scoreStatus))
      const link = element('a', 'research-score__source', copy.sourceLink)
      link.href = safeUrl(record.sourceUrl)
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      card.appendChild(link)
      target.appendChild(card)
    }
  }

  function readerField (name) {
    return document.getElementById(`researchReader${name}`) || document.querySelector(`[data-research-reader-${name.toLowerCase()}]`)
  }

  function disposeReader () {
    if (!readerController) return
    readerController.dispose()
    readerController = null
  }

  function wireReader (copy) {
    const reader = document.getElementById('researchReader')
    if (!reader) {
      disposeReader()
      return function () {}
    }
    if (readerController && readerController.reader === reader) {
      readerController.copy = copy
      const link = readerField('Link')
      if (!reader.hidden && link && safeUrl(link.href)) link.textContent = copy.sourceLink
      return readerController.open
    }
    disposeReader()
    const controller = {
      reader,
      copy,
      opener: null,
      openerId: null,
      open: null,
      rebind: null,
      dispose: null,
    }
    const close = () => {
      reader.hidden = true
      if (controller.opener && typeof controller.opener.focus === 'function') controller.opener.focus()
      controller.opener = null
      controller.openerId = null
    }
    const closeButton = reader.querySelector('[data-research-reader-close]') || document.getElementById('researchReaderClose')
    const onKeydown = event => { if (event.key === 'Escape' && !reader.hidden) close() }
    if (closeButton) closeButton.addEventListener('click', close)
    document.addEventListener('keydown', onKeydown)
    const open = (record, button) => {
      controller.opener = button
      controller.openerId = record.id
      for (const name of ['Title', 'Source', 'Kind', 'Status', 'Note']) {
        const field = readerField(name)
        if (field) field.textContent = record[name.toLowerCase()]
      }
      const link = readerField('Link')
      if (link) {
        const href = safeUrl(record.sourceUrl)
        link.href = href
        link.hidden = !href
        link.textContent = href ? controller.copy.sourceLink : ''
      }
      reader.hidden = false
      if (closeButton && typeof closeButton.focus === 'function') closeButton.focus()
    }
    controller.open = open
    controller.rebind = (recordId, button) => {
      if (controller.openerId === recordId) controller.opener = button
    }
    controller.dispose = () => {
      if (closeButton) closeButton.removeEventListener('click', close)
      document.removeEventListener('keydown', onKeydown)
    }
    readerController = controller
    return open
  }

  function renderSamples (records, copy) {
    const openReader = wireReader(copy)
    if (readerController && readerController.openerId) readerController.opener = null
    for (const target of document.querySelectorAll('[data-research-group]')) {
      clear(target)
      const group = target.getAttribute('data-research-group')
      for (const record of records.filter(item => item.group === group)) {
        const button = element('button', 'research-sample', `${record.title} · ${copy.openRecord}`)
        button.type = 'button'
        button.addEventListener('click', () => openReader(record, button))
        target.appendChild(button)
        if (readerController) readerController.rebind(record.id, button)
      }
    }
  }

  function renderSnapshot (snapshot, copy) {
    renderCounts(snapshot.counts, copy)
    renderScores(snapshot.scores, copy)
    renderSamples(snapshot.samples, copy)
  }

  async function init () {
    const request = ++renderRequest
    const copy = localizedCopy()
    const error = document.querySelector('[data-research-error]')
    wireReader(copy)
    if (lastSnapshot) {
      renderSnapshot(lastSnapshot, copy)
      if (error) error.hidden = true
    }
    try {
      const response = await window.fetch('/research/archive-snapshot.json')
      if (!response || !response.ok) throw new Error('Research snapshot unavailable')
      const snapshot = normalize(await response.json())
      if (request !== renderRequest) return null
      lastSnapshot = snapshot
      renderSnapshot(snapshot, copy)
      if (error) error.hidden = true
      return snapshot
    } catch (cause) {
      if (request !== renderRequest) return null
      for (const node of document.querySelectorAll('.research-loading')) node.hidden = true
      if (error) {
        error.textContent = copy.error
        error.hidden = false
      }
      return null
    }
  }

  window.PF_RESEARCH_GALLERY = { normalize, safeUrl, init }
})(window, document)
