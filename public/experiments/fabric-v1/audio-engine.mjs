const SOURCE_NAMES = new Set(['off', 'microphone', 'beat'])
const EFFECT_NAMES = ['dissolve', 'explode', 'glitter', 'glitch']
export const BEAT_STYLE_NAMES = Object.freeze(['pulse', 'broken', 'club', 'scatter'])
const BEAT_STYLES = new Set(BEAT_STYLE_NAMES)
const BEAT_PATTERNS = Object.freeze({
  pulse: { bpm: 110, seed: 17, kicks: [0, 4, 8, 12], snares: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14] },
  broken: { bpm: 126, seed: 31, kicks: [0, 3, 7, 10, 14], snares: [5, 12], hats: [1, 2, 6, 9, 11, 15] },
  club: { bpm: 124, seed: 47, kicks: [0, 4, 8, 12], snares: [4, 12], hats: [2, 6, 10, 14, 15] },
  scatter: { bpm: 138, seed: 73, kicks: [0, 5, 9, 14], snares: [3, 11], hats: [1, 2, 6, 7, 10, 13, 15] }
})

function clamp01 (value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function disconnect (node) {
  if (node && typeof node.disconnect === 'function') node.disconnect()
}

function stopStream (stream) {
  if (!stream || typeof stream.getTracks !== 'function') return
  for (const track of stream.getTracks()) track.stop()
}

function noiseSample (index, seed) {
  let value = (index + 1) * 0x45d9f3b + seed * 0x27d4eb2d
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return ((value ^ (value >>> 16)) >>> 0) / 0x7fffffff - 1
}

export function renderGeneratedBeat (style = 'pulse', requestedSampleRate = 48000, requestedVariation = 0) {
  if (!BEAT_STYLES.has(style)) throw new TypeError(`Unknown beat style: ${style}`)
  const sampleRate = Math.round(Math.min(192000, Math.max(8000, Number(requestedSampleRate) || 48000)))
  const variation = Number.isFinite(requestedVariation) ? Math.abs(Math.trunc(requestedVariation)) >>> 0 : 0
  const pattern = BEAT_PATTERNS[style]
  const variationRandom = salt => (noiseSample(salt, variation || pattern.seed) + 1) * 0.5
  const noiseSeed = pattern.seed + Math.imul(variation, 101)
  const pitchScale = variation ? 0.92 + variationRandom(3) * 0.16 : 1
  const stepDuration = (60 / pattern.bpm) / 4
  const duration = stepDuration * 16
  const samples = new Float32Array(Math.ceil(duration * sampleRate))
  const startForStep = step => Math.round(step * stepDuration * sampleRate)

  const addKick = (step, gain = 1) => {
    const start = startForStep(step)
    const count = Math.min(samples.length - start, Math.round(sampleRate * 0.34))
    let phase = 0
    for (let index = 0; index < count; index++) {
      const time = index / sampleRate
      const frequency = (46 + 92 * Math.exp(-time * 24)) * pitchScale
      phase += Math.PI * 2 * frequency / sampleRate
      samples[start + index] += Math.sin(phase) * Math.exp(-time * 15) * gain
    }
  }

  const addSnare = (step, gain = 0.5) => {
    const start = startForStep(step)
    const count = Math.min(samples.length - start, Math.round(sampleRate * 0.22))
    let previousNoise = 0
    for (let index = 0; index < count; index++) {
      const time = index / sampleRate
      const noise = noiseSample(start + index, noiseSeed)
      const brightNoise = noise - previousNoise * 0.72
      previousNoise = noise
      const body = Math.sin(Math.PI * 2 * 185 * pitchScale * time) * 0.3
      samples[start + index] += (brightNoise * 0.7 + body) * Math.exp(-time * 20) * gain
    }
  }

  const addHat = (step, gain = 0.18) => {
    const start = startForStep(step)
    const count = Math.min(samples.length - start, Math.round(sampleRate * 0.075))
    let previousNoise = 0
    for (let index = 0; index < count; index++) {
      const time = index / sampleRate
      const noise = noiseSample(start + index, noiseSeed + 101)
      const edge = noise - previousNoise
      previousNoise = noise
      samples[start + index] += edge * Math.exp(-time * 62) * gain
    }
  }

  for (const step of pattern.kicks) addKick(step, style === 'club' ? 1.08 : 0.95)
  for (const step of pattern.snares) addSnare(step, style === 'broken' ? 0.62 : 0.48)
  for (const step of pattern.hats) addHat(step, style === 'scatter' ? 0.28 : style === 'club' ? 0.23 : 0.17)
  if (variation) {
    addKick(Math.floor(variationRandom(7) * 16), 0.24 + variationRandom(8) * 0.14)
    addSnare(Math.floor(variationRandom(11) * 16), 0.16 + variationRandom(12) * 0.12)
    addHat(Math.floor(variationRandom(17) * 16), 0.18 + variationRandom(18) * 0.12)
    addHat(Math.floor(variationRandom(23) * 16), 0.14 + variationRandom(24) * 0.10)
  }

  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  const scale = peak > 0 ? Math.min(1, 0.92 / peak) : 1
  if (scale !== 1) {
    for (let index = 0; index < samples.length; index++) samples[index] *= scale
  }
  return { style, variation, bpm: pattern.bpm, duration, samples }
}

export function createEffectState () {
  return { dissolve: false, explode: false, glitter: false, glitch: false }
}

export function toggleEffect (effects, effect) {
  if (!effects || !EFFECT_NAMES.includes(effect)) return false
  effects[effect] = !effects[effect]
  return effects[effect]
}

export function deriveEffectModulation (signals = {}, effects = {}) {
  const bass = clamp01(signals.bass)
  const mid = clamp01(signals.mid)
  const high = clamp01(signals.high)
  const onset = clamp01(signals.onset)

  return {
    dissolve: effects.dissolve ? mid : 0,
    explode: effects.explode ? bass : 0,
    glitter: effects.glitter ? high : 0,
    glitch: effects.glitch ? onset : 0
  }
}

export function deriveEffectIntensity (modulation = {}, amounts = {}) {
  const intensity = {}
  for (const name of EFFECT_NAMES) {
    const raw = clamp01(modulation[name])
    const requestedAmount = Number(amounts[name])
    const amount = Number.isFinite(requestedAmount) ? Math.min(2, Math.max(0, requestedAmount)) : 1
    const lifted = 1 - Math.pow(1 - raw, 3)
    intensity[name] = Math.min(2, lifted * amount)
  }
  return intensity
}

export function deriveExplosionImpulse (signals = {}, modulation = 0) {
  return clamp01(modulation) * clamp01(clamp01(signals.onset) * 3.5)
}

export function createAudioEngine (provided = {}) {
  const AudioContext = provided.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext
  const getUserMedia = provided.getUserMedia || globalThis.navigator?.mediaDevices?.getUserMedia?.bind(globalThis.navigator.mediaDevices)
  const random = typeof provided.random === 'function' ? provided.random : Math.random

  let context = null
  let analyser = null
  let analyserData = null
  let source = 'off'
  let desiredSource = 'off'
  let requestSequence = 0
  let pendingMicrophoneRequest = 0
  let microphoneStream = null
  let microphoneNode = null
  let beatNodes = []
  let beatStyle = 'pulse'
  let beatVariation = 0
  let appliedBeatStyle = null
  let appliedBeatVariation = null
  let beatOutputGain = null
  let beatVolume = 0.3
  let membraneFilter = null
  let occlusion = 0
  let muffleEnabled = false
  let appliedOcclusion = null
  let destroyed = false
  let hidden = false
  let contextTransition = Promise.resolve()
  let signals = { bass: 0, mid: 0, high: 0, onset: 0, level: 0 }
  let priorLevel = 0

  function ensureGraph () {
    if (context) return context
    if (!AudioContext) throw new Error('Web Audio is unavailable in this browser')
    const candidateContext = new AudioContext()
    let candidateAnalyser = null
    try {
      candidateAnalyser = candidateContext.createAnalyser()
      candidateAnalyser.fftSize = 256
      candidateAnalyser.smoothingTimeConstant = 0
      const candidateData = new Uint8Array(candidateAnalyser.frequencyBinCount)
      context = candidateContext
      analyser = candidateAnalyser
      analyserData = candidateData
      return context
    } catch (error) {
      disconnect(candidateAnalyser)
      if (candidateContext.state !== 'closed' && typeof candidateContext.close === 'function') {
        try {
          const closing = candidateContext.close()
          if (closing && typeof closing.catch === 'function') closing.catch(() => {})
        } catch (_) {}
      }
      throw error
    }
  }

  function releaseMicrophone () {
    disconnect(microphoneNode)
    microphoneNode = null
    stopStream(microphoneStream)
    microphoneStream = null
  }

  function disposeBeatNodes (nodes) {
    for (const node of nodes) {
      if (node && typeof node.stop === 'function') {
        try { node.stop() } catch (_) {}
      }
      disconnect(node)
    }
  }

  function releaseBeat () {
    disposeBeatNodes(beatNodes)
    beatNodes = []
    appliedBeatStyle = null
    appliedBeatVariation = null
    beatOutputGain = null
    membraneFilter = null
    appliedOcclusion = null
  }

  function releaseActiveInput () {
    releaseMicrophone()
    releaseBeat()
  }

  function shouldContextRun () {
    return !destroyed && !hidden && desiredSource !== 'off'
  }

  function reconcileContext () {
    if (!context || destroyed) return Promise.resolve()
    const ctx = context
    const transition = async () => {
      if (destroyed || ctx !== context) return
      if (shouldContextRun()) {
        if (ctx.state !== 'running' && ctx.state !== 'closed' && typeof ctx.resume === 'function') await ctx.resume()
      } else if (ctx.state !== 'suspended' && ctx.state !== 'closed' && typeof ctx.suspend === 'function') {
        await ctx.suspend()
      }
    }
    contextTransition = contextTransition.then(transition, transition)
    return contextTransition
  }

  function closeContext () {
    if (!context) return Promise.resolve()
    const ctx = context
    const close = async () => {
      if (ctx.state !== 'closed' && typeof ctx.close === 'function') await ctx.close()
    }
    contextTransition = contextTransition.then(close, close)
    return contextTransition
  }

  function setParam (param, value, now) {
    if (!param) return
    if (typeof param.setValueAtTime === 'function') param.setValueAtTime(value, now)
    else param.value = value
  }

  function setParamSmooth (param, value) {
    if (!param) return
    const now = context?.currentTime || 0
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now)
    } else if (typeof param.cancelScheduledValues === 'function') {
      const heldValue = param.value
      param.cancelScheduledValues(0)
      if (typeof param.setValueAtTime === 'function') param.setValueAtTime(heldValue, now)
      else param.value = heldValue
    }
    if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(value, now, 0.035)
    else setParam(param, value, now)
  }

  function setFilterOcclusion (filter, effectiveOcclusion) {
    const cutoff = 380 * Math.pow(22, 1 - effectiveOcclusion)
    setParamSmooth(filter.frequency, cutoff)
    setParamSmooth(filter.Q, 0.7 + effectiveOcclusion * 6.5)
  }

  function applyOcclusion (force = false) {
    if (!membraneFilter) return
    const effectiveOcclusion = muffleEnabled ? occlusion : 0
    if (!force && appliedOcclusion !== null && Math.abs(effectiveOcclusion - appliedOcclusion) < 0.01) return
    setFilterOcclusion(membraneFilter, effectiveOcclusion)
    appliedOcclusion = effectiveOcclusion
  }

  function setOcclusion (amount) {
    occlusion = clamp01(amount)
    applyOcclusion()
    return occlusion
  }

  function setMuffleEnabled (enabled) {
    muffleEnabled = Boolean(enabled)
    applyOcclusion(true)
    return muffleEnabled
  }

  function buildBeatGraph (style, variation) {
    const ctx = ensureGraph()
    const nodes = []
    try {
      const output = ctx.createGain()
      nodes.push(output)
      setParam(output.gain, beatVolume, ctx.currentTime || 0)
      output.connect(analyser)
      output.connect(ctx.destination)

      const filter = ctx.createBiquadFilter()
      nodes.push(filter)
      filter.type = 'lowpass'
      const effectiveOcclusion = muffleEnabled ? occlusion : 0
      setFilterOcclusion(filter, effectiveOcclusion)
      filter.connect(output)

      const rendered = renderGeneratedBeat(style, ctx.sampleRate, variation)
      const buffer = ctx.createBuffer(1, rendered.samples.length, ctx.sampleRate)
      if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(rendered.samples, 0)
      else buffer.getChannelData(0).set(rendered.samples)
      const loop = ctx.createBufferSource()
      nodes.push(loop)
      loop.buffer = buffer
      loop.loop = true
      loop.connect(filter)
      loop.start()
      return { nodes: [loop, filter, output], filter, output, effectiveOcclusion, style, variation }
    } catch (error) {
      disposeBeatNodes(nodes)
      throw error
    }
  }

  function createBeat (style = beatStyle, variation = beatVariation) {
    const graph = buildBeatGraph(style, variation)
    const previousNodes = beatNodes
    beatNodes = graph.nodes
    membraneFilter = graph.filter
    beatOutputGain = graph.output
    appliedOcclusion = graph.effectiveOcclusion
    appliedBeatStyle = graph.style
    appliedBeatVariation = graph.variation
    disposeBeatNodes(previousNodes)
  }

  function setBeatStyle (nextStyle) {
    if (!BEAT_STYLES.has(nextStyle)) throw new TypeError(`Unknown beat style: ${nextStyle}`)
    if (beatStyle === nextStyle) return beatStyle
    if (!destroyed && !hidden && source === 'beat' && desiredSource === 'beat') {
      createBeat(nextStyle, beatVariation)
    }
    beatStyle = nextStyle
    return beatStyle
  }

  function setBeatVolume (value) {
    beatVolume = clamp01(Number(value))
    if (beatOutputGain) setParamSmooth(beatOutputGain.gain, beatVolume)
    return beatVolume
  }

  function randomizeBeat () {
    const sampled = clamp01(Number(random()))
    let nextVariation = (Math.floor(sampled * 0xffffffff) >>> 0) || 1
    if (nextVariation === beatVariation) nextVariation = (nextVariation + 0x9e3779b9) >>> 0 || 1
    if (!destroyed && !hidden && source === 'beat' && desiredSource === 'beat') {
      createBeat(beatStyle, nextVariation)
    }
    beatVariation = nextVariation
    return beatVariation
  }

  async function setSource (nextSource) {
    if (!SOURCE_NAMES.has(nextSource)) throw new TypeError(`Unknown audio source: ${nextSource}`)
    if (destroyed) return

    const request = ++requestSequence
    desiredSource = nextSource
    pendingMicrophoneRequest = 0
    releaseActiveInput()
    source = 'off'
    if (nextSource === 'off') {
      await reconcileContext()
      return
    }

    if (hidden) {
      desiredSource = 'off'
      await reconcileContext()
      return
    }

    let ctx
    try {
      ctx = ensureGraph()
      await reconcileContext()
    } catch (error) {
      source = 'off'
      desiredSource = 'off'
      await reconcileContext()
      throw error
    }
    if (destroyed || hidden || request !== requestSequence || desiredSource !== nextSource) return

    if (nextSource === 'beat') {
      try {
        createBeat()
        source = 'beat'
        return
      } catch (error) {
        releaseBeat()
        source = 'off'
        desiredSource = 'off'
        await reconcileContext()
        throw error
      }
    }

    if (typeof getUserMedia !== 'function') {
      desiredSource = 'off'
      await reconcileContext()
      throw new Error('Microphone input is unavailable in this browser')
    }
    pendingMicrophoneRequest = request
    let stream
    try {
      stream = await getUserMedia({ audio: true, video: false })
    } catch (error) {
      if (pendingMicrophoneRequest === request) pendingMicrophoneRequest = 0
      if (destroyed || request !== requestSequence) return
      source = 'off'
      desiredSource = 'off'
      await reconcileContext()
      throw error
    }
    if (pendingMicrophoneRequest === request) pendingMicrophoneRequest = 0

    if (destroyed || hidden || request !== requestSequence || desiredSource !== 'microphone') {
      stopStream(stream)
      if (!destroyed && request === requestSequence) {
        source = 'off'
        desiredSource = 'off'
        await reconcileContext()
      }
      return
    }

    try {
      microphoneStream = stream
      microphoneNode = ctx.createMediaStreamSource(stream)
      microphoneNode.connect(analyser)
      source = 'microphone'
    } catch (error) {
      releaseMicrophone()
      source = 'off'
      desiredSource = 'off'
      await reconcileContext()
      throw error
    }
  }

  function sample (dt = 1 / 60) {
    if (!analyser || !analyserData || source === 'off') {
      const release = clamp01(Number.isFinite(dt) ? dt * 9 : 0.15)
      for (const name of Object.keys(signals)) signals[name] *= 1 - release
      priorLevel = signals.level
      return { ...signals }
    }

    analyser.getByteFrequencyData(analyserData)
    const count = analyserData.length || 1
    const average = (from, to) => {
      let total = 0
      let peak = 0
      const start = Math.max(0, Math.floor(from * count))
      const end = Math.max(start + 1, Math.min(count, Math.ceil(to * count)))
      for (let index = start; index < end; index++) {
        const value = analyserData[index] || 0
        total += value
        peak = Math.max(peak, value)
      }
      const mean = total / ((end - start) * 255)
      return clamp01(mean * 0.72 + peak / 255 * 0.28)
    }

    const nyquist = Math.max(1, (context?.sampleRate || 48000) * 0.5)
    const hz = frequency => clamp01(frequency / nyquist)

    const raw = {
      bass: average(0, hz(250)),
      mid: average(hz(250), hz(2400)),
      high: average(hz(2400), hz(12000)),
      level: average(0, hz(12000))
    }
    const frame = Math.max(0, Number.isFinite(dt) ? dt : 1 / 60)
    for (const name of ['bass', 'mid', 'high', 'level']) {
      const rate = raw[name] > signals[name] ? 15 : 5
      const amount = 1 - Math.exp(-rate * frame)
      signals[name] = clamp01(signals[name] + (raw[name] - signals[name]) * amount)
    }
    const rawOnset = clamp01((raw.level - priorLevel) * 7)
    const onsetAmount = 1 - Math.exp(-18 * frame)
    signals.onset = clamp01(signals.onset + (rawOnset - signals.onset) * onsetAmount)
    priorLevel = raw.level
    return { ...signals }
  }

  async function setSuspended (isHidden) {
    hidden = Boolean(isHidden)
    if (hidden && (source === 'microphone' || desiredSource === 'microphone' || pendingMicrophoneRequest)) {
      requestSequence++
      pendingMicrophoneRequest = 0
      releaseMicrophone()
      source = 'off'
      desiredSource = 'off'
    } else if (hidden && source === 'off' && desiredSource !== 'off') {
      requestSequence++
      pendingMicrophoneRequest = 0
      desiredSource = 'off'
    }
    if (!hidden && source === 'beat' && (appliedBeatStyle !== beatStyle || appliedBeatVariation !== beatVariation)) {
      const previousStyle = appliedBeatStyle
      const previousVariation = appliedBeatVariation
      try {
        createBeat(beatStyle, beatVariation)
      } catch (error) {
        if (previousStyle) beatStyle = previousStyle
        if (previousVariation !== null) beatVariation = previousVariation
        await reconcileContext()
        throw error
      }
    }
    await reconcileContext()
  }

  async function destroy () {
    if (destroyed) return
    destroyed = true
    requestSequence++
    pendingMicrophoneRequest = 0
    source = 'off'
    desiredSource = 'off'
    releaseActiveInput()
    disconnect(analyser)
    await closeContext()
  }

  return {
    get source () { return source },
    get beatStyle () { return beatStyle },
    get beatVariation () { return beatVariation },
    get beatVolume () { return beatVolume },
    get muffleEnabled () { return muffleEnabled },
    setSource,
    setBeatStyle,
    setBeatVolume,
    randomizeBeat,
    sample,
    setOcclusion,
    setMuffleEnabled,
    setSuspended,
    destroy
  }
}
