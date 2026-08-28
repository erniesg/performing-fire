;(function (window, document) {
  'use strict'

  const SAMPLE_FIELDS = ['id', 'group', 'source', 'kind', 'title', 'sourceUrl', 'status', 'note']
  const SCORE_FIELDS = ['catalogueId', 'assetId', 'title', 'source', 'kind', 'displayStatus', 'provenance', 'sourceUrl', 'status']
  const SCORE_STATUS = 'collection record verified · score candidate'
  const SCORE_SOURCE = 'NJP Video Library'
  const SCORE_KIND = 'Catalogue record / image'
  const SCORE_DISPLAY_STATUS = 'Metadata and source link; score text not verified'
  const SCORE_ASSETS = {
    552: '106306', 570: '106344', 571: '106345', 588: '106366', 575: '106351', 581: '106359',
    576: '106353', 609: '106400', 578: '106355', 587: '106365', 590: '106368',
  }
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
      const trimmed = value.trim()
      const siteRootPath = /^\/(?!\/)/.test(trimmed)
      const origin = window.location && window.location.origin
      if (siteRootPath && !nonEmptyString(origin)) return ''
      if (!siteRootPath && !/^https:\/\//i.test(trimmed)) return ''
      const url = siteRootPath ? new URL(trimmed, origin) : new URL(trimmed)
      if (url.protocol !== 'https:' || url.username || url.password) return ''
      if (siteRootPath && url.origin !== new URL(origin).origin) return ''
      return url.href
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
    const publicSamples = []
    for (const score of payload.scores) {
      const assetId = score && SCORE_ASSETS[score.catalogueId]
      const expectedProvenance = assetId ? `NJP Video Library catalogue ${score.catalogueId} · asset ${assetId} · observed 2026-07-27` : ''
      const expectedUrl = assetId ? `https://njpvideo.ggcf.kr/storage/2022/01/05/${assetId}/${assetId}/Proxy/Proxy_${assetId}.jpg` : ''
      if (!score || SCORE_FIELDS.some(field => !nonEmptyString(score[field])) ||
        !assetId || score.assetId !== assetId || score.source !== SCORE_SOURCE || score.kind !== SCORE_KIND ||
        score.displayStatus !== SCORE_DISPLAY_STATUS || score.provenance !== expectedProvenance ||
        safeUrl(score.sourceUrl) !== expectedUrl || score.status !== SCORE_STATUS ||
        (score.sample !== undefined && typeof score.sample !== 'boolean')) {
        throw new TypeError('score record is incomplete')
      }
      if (score.sample === true) publicSamples.push(score)
    }
    if (publicSamples.length !== 1 || publicSamples[0].catalogueId !== '570' || publicSamples[0].assetId !== '106344') throw new TypeError('score public sample is invalid')
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
      catalogue: translated('bc.research.catalogue', 'CATALOGUE'),
      scoreSample: translated('bc.research.scores.sample', 'PUBLIC SAMPLE · CATALOGUE 570 / ASSET 106344'),
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
      card.appendChild(element('p', 'research-score__catalogue', `${copy.catalogue} ${record.catalogueId}`))
      card.appendChild(element('p', 'research-score__status', copy.scoreStatus))
      card.appendChild(element('p', 'research-score__record-source', record.source))
      card.appendChild(element('p', 'research-score__kind', record.kind))
      card.appendChild(element('p', 'research-score__display-status', record.displayStatus))
      card.appendChild(element('p', 'research-score__provenance', record.provenance))
      if (record.sample === true) card.appendChild(element('p', 'research-score__sample', copy.scoreSample))
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
    const backgroundRegions = () => Array.from(document.querySelectorAll('[data-research-modal-background]'))
    const setBackgroundInert = inert => {
      for (const region of backgroundRegions()) region.inert = inert
    }
    const isVisibleOpener = opener => {
      if (!opener || opener.hidden || !opener.parentNode || opener.isConnected === false) return false
      if (typeof opener.closest === 'function' && opener.closest('[hidden]')) return false
      return true
    }
    const restoreFocus = () => {
      const target = isVisibleOpener(controller.opener)
        ? controller.opener
        : document.querySelector('.preview-btn[data-channel="research"]')
      if (target && typeof target.focus === 'function') target.focus()
    }
    const close = () => {
      reader.hidden = true
      setBackgroundInert(false)
      restoreFocus()
      controller.opener = null
      controller.openerId = null
    }
    const closeButton = reader.querySelector('[data-research-reader-close]') || document.getElementById('researchReaderClose')
    const focusableControls = () => Array.from(reader.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(control => !control.hidden)
    const onKeydown = event => {
      if (reader.hidden) return
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab') return
      const controls = focusableControls()
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
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
      setBackgroundInert(true)
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
      setBackgroundInert(false)
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
