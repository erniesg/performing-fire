import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const v0Url = new URL('../public/experiments/fabric/index.html', import.meta.url)
const v1PageUrl = new URL('../public/experiments/fabric-v1/index.html', import.meta.url)
const v1AudioUrl = new URL('../public/experiments/fabric-v1/audio-engine.mjs', import.meta.url)

const expectedV0Hash = '270dea18c4df7c920b2db2e2bf566d2ba1e1a280e794766a14463e5a33509485'

function deferred () {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

async function flushUntil (predicate, message) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) return
    await Promise.resolve()
  }
  assert.fail(message)
}

class FakeNode {
  constructor (context, kind) {
    this.context = context
    this.kind = kind
    this.connections = []
  }

  connect (target) {
    this.connections.push(target)
    return target
  }

  disconnect () {
    this.connections = []
  }
}

class FakeGain extends FakeNode {
  constructor (context) {
    super(context, 'gain')
    this.gain = { value: 1 }
  }
}

class FakeOscillator extends FakeNode {
  constructor (context) {
    super(context, 'oscillator')
    this.frequency = { value: 440 }
    this.type = 'sine'
    this.startCount = 0
    this.stopCount = 0
  }

  start () { this.startCount++ }
  stop () { this.stopCount++ }
}

class FakeAudioBuffer {
  constructor (numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length))
  }

  getChannelData (channel) { return this.channels[channel] }
  copyToChannel (source, channel) { this.channels[channel].set(source) }
}

class FakeBufferSource extends FakeNode {
  constructor (context) {
    super(context, 'buffer-source')
    this.buffer = null
    this.loop = false
    this.startCount = 0
    this.stopCount = 0
  }

  start () { this.startCount++ }
  stop () { this.stopCount++ }
}

class FakeAnalyser extends FakeNode {
  constructor (context) {
    super(context, 'analyser')
    this.frequencyBinCount = 32
    this.spectrum = Uint8Array.from({ length: 32 }, (_, index) => index < 8 ? 210 : index < 20 ? 130 : 55)
  }

  getByteFrequencyData (target) {
    target.set(this.spectrum)
  }
}

class FakeBiquadFilter extends FakeNode {
  constructor (context) {
    super(context, 'biquad-filter')
    this.type = 'lowpass'
    const audioParam = value => ({
      value,
      events: [],
      cancelCalls: 0,
      holdCalls: 0,
      cancelScheduledValues () { this.cancelCalls++; this.events = [] },
      cancelAndHoldAtTime (time) { this.holdCalls++; this.events = [{ type: 'hold', time, value: this.value }] },
      setValueAtTime (nextValue, time) {
        this.value = nextValue
        this.events.push({ type: 'set', value: nextValue, time })
      },
      setTargetAtTime (nextValue, time, timeConstant) {
        this.value = nextValue
        this.events = this.events.filter(event => event.type !== 'target')
        this.events.push({ type: 'target', value: nextValue, time, timeConstant })
      }
    })
    this.frequency = audioParam(350)
    this.Q = audioParam(1)
  }
}

class FakeAudioContext {
  constructor () {
    this.destination = new FakeNode(this, 'destination')
    this.created = []
    this.suspendCalls = 0
    this.resumeCalls = 0
    this.closeCalls = 0
    this.currentTime = 0
    this.sampleRate = 48000
    this.state = 'running'
  }

  add (node) { this.created.push(node); return node }
  createGain () { return this.add(new FakeGain(this)) }
  createOscillator () { return this.add(new FakeOscillator(this)) }
  createBuffer (numberOfChannels, length, sampleRate) { return new FakeAudioBuffer(numberOfChannels, length, sampleRate) }
  createBufferSource () { return this.add(new FakeBufferSource(this)) }
  createAnalyser () { return this.add(new FakeAnalyser(this)) }
  createBiquadFilter () { return this.add(new FakeBiquadFilter(this)) }
  createMediaStreamSource (stream) {
    const node = this.add(new FakeNode(this, 'microphone'))
    node.stream = stream
    return node
  }

  async suspend () { this.suspendCalls++; this.state = 'suspended' }
  async resume () { this.resumeCalls++; this.state = 'running' }
  async close () { this.closeCalls++; this.state = 'closed' }
}

function isConnectedTo (from, target, visited = new Set()) {
  if (from === target) return true
  if (!from || !Array.isArray(from.connections) || visited.has(from)) return false
  visited.add(from)
  return from.connections.some(next => isConnectedTo(next, target, visited))
}

function makeStream () {
  const track = { stopped: false, stop () { this.stopped = true } }
  return { track, getTracks: () => [track] }
}

function makeAudioDeps (getUserMedia = async () => makeStream()) {
  const contexts = []
  class Context extends FakeAudioContext {
    constructor () {
      super()
      contexts.push(this)
    }
  }
  return { AudioContext: Context, getUserMedia, contexts }
}

function failNextBeatBuild (context, failure) {
  if (failure === 'connect') {
    const createGain = context.createGain.bind(context)
    context.createGain = () => {
      const node = createGain()
      const connect = node.connect.bind(node)
      let connectCount = 0
      node.connect = target => {
        const result = connect(target)
        connectCount++
        if (connectCount === 2) throw new Error('beat graph failed')
        return result
      }
      return node
    }
  } else if (failure === 'buffer') {
    context.createBuffer = () => { throw new Error('beat graph failed') }
  } else if (failure === 'start') {
    const createBufferSource = context.createBufferSource.bind(context)
    context.createBufferSource = () => {
      const node = createBufferSource()
      node.start = () => { node.startCount++; throw new Error('beat graph failed') }
      return node
    }
  }
}

async function loadAudioModule () {
  return import(v1AudioUrl.href)
}

test('Fabric v0 remains byte-for-byte intact while v1 is developed beside it', async () => {
  const v0 = await readFile(v0Url)
  assert.equal(createHash('sha256').update(v0).digest('hex'), expectedV0Hash)
})

test('bug: v1 could accidentally omit its canonical, accessible control surface', async () => {
  const page = await readFile(v1PageUrl, 'utf8')
  assert.match(page, /<link[^>]+rel=["']canonical["'][^>]+href=["']\/experiments\/fabric-v1\/["']/i)
  assert.match(page, /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+/i)
  for (const source of ['off', 'microphone', 'beat']) {
    assert.match(page, new RegExp(`<button[^>]+data-audio-source=["']${source}["'][^>]+aria-pressed=["']false["']`, 'i'))
  }
  for (const effect of ['dissolve', 'explode', 'glitter', 'glitch']) {
    assert.match(page, new RegExp(`<button[^>]+data-effect=["']${effect}["'][^>]+aria-pressed=["']false["']`, 'i'))
  }
  assert.match(page, /data-audio-source=["']beat["'][^>]*>\s*Generated Beats\s*</i)
  for (const style of ['pulse', 'broken', 'club', 'scatter']) {
    assert.match(page, new RegExp(`<button[^>]+data-beat-style=["']${style}["'][^>]+aria-pressed=["']false["']`, 'i'))
  }
  assert.doesNotMatch(page, /id=["']beat-row["'][^>]*\shidden(?:\s|>|=)/i, 'beat types should remain discoverable before Beat is selected')
  assert.match(page, /<button[^>]+data-beat-randomize[^>]*>\s*Randomize\s*</i)
  assert.match(page, /<label[^>]+for=["']beat-volume["'][^>]*>[\s\S]*?<input[^>]+id=["']beat-volume["'][^>]+data-beat-volume[^>]+type=["']range["'][^>]+min=["']0["'][^>]+max=["']100["']/i)
  assert.match(page, /data-mapping=["']muffle["'][^>]+aria-pressed=["']false["'][^>]*>\s*Fabric\s*→\s*Muffle\s*</i)
  for (const mapping of ['explode', 'dissolve', 'glitter', 'glitch', 'muffle']) {
    assert.match(page, new RegExp(`<input[^>]+data-(?:effect|mapping)-amount=["']${mapping}["'][^>]+type=["']range["'][^>]+min=["']25["'][^>]+max=["']200["'][^>]+value=["']150["']`, 'i'))
  }
  assert.match(page, /<script[^>]+type=["']module["'][^>]+src=["']\.\/audio-engine\.mjs["']/i)
})

test('bug: desktop status text could sit underneath the centered persona chips', async () => {
  const page = await readFile(v1PageUrl, 'utf8')
  assert.match(page, /#status\s*\{[^}]*max-width\s*:\s*min\(410px,\s*calc\(50vw\s*-\s*306px\)\)/i)
  assert.match(page, /@media\s*\(min-width\s*:\s*721px\)\s*and\s*\(max-width\s*:\s*1120px\)\s*\{[\s\S]*?#status\s*\{[^}]*bottom\s*:\s*58px[^}]*max-width\s*:\s*410px/i)
  assert.match(page, /@media\s*\(min-width\s*:\s*721px\)\s*and\s*\(max-width\s*:\s*1120px\)\s*\{[\s\S]*?#chips\s*\{[^}]*left\s*:\s*22px[^}]*right\s*:\s*210px[^}]*transform\s*:\s*none[^}]*overflow-x\s*:\s*auto/i)
})

test('bug: visible mixer controls could be disconnected from engine and render state', async () => {
  const page = await readFile(v1PageUrl, 'utf8')
  assert.match(page, /\[data-beat-randomize\][\s\S]{0,250}randomizeBeat\(\)/)
  assert.match(page, /\[data-beat-volume\][\s\S]{0,400}setBeatVolume\(/)
  assert.match(page, /\[data-effect-amount\][\s\S]{0,900}effectAmounts\[effect\]/)
  assert.match(page, /deriveEffectIntensity\(effectMod,\s*effectAmounts\)/)
  assert.match(page, /deriveExplosionImpulse\(audioSignals,\s*effectMod\.explode\)\s*\*\s*effectAmounts\.explode/)
  assert.match(page, /setOcclusion\(membraneOcclusion\s*\*\s*effectAmounts\.muffle\)/)
})

test('bug: creating an idle v1 engine could allocate microphone/audio resources before the user chooses a driver', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  assert.equal(engine.source, 'off')
  assert.equal(deps.contexts.length, 0)
  await engine.setSource('off')
  assert.equal(deps.contexts.length, 0)
})

test('bug: a transient analyser setup failure could poison all later audio retries', async () => {
  const contexts = []
  let failAnalyser = true
  let microphoneCalls = 0
  class FlakyContext extends FakeAudioContext {
    constructor () { super(); contexts.push(this) }
    createAnalyser () {
      if (failAnalyser) {
        failAnalyser = false
        throw new Error('analyser setup failed')
      }
      return super.createAnalyser()
    }
  }
  const { createAudioEngine } = await loadAudioModule()
  const engine = createAudioEngine({
    AudioContext: FlakyContext,
    getUserMedia: async () => { microphoneCalls++; return makeStream() }
  })

  await assert.rejects(engine.setSource('microphone'), /analyser setup failed/)
  assert.equal(microphoneCalls, 0, 'failed graph provisioning must not request microphone permission')
  assert.equal(contexts[0].state, 'closed', 'the partial AudioContext must be closed')

  await engine.setSource('beat')
  assert.equal(contexts.length, 2, 'a retry must provision a fresh context')
  assert.equal(engine.source, 'beat')
})

test('bug: generated beats could be silent or use a non-looping placeholder', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  await engine.setSource('beat')
  assert.equal(engine.source, 'beat')
  assert.equal(deps.contexts.length, 1)
  const context = deps.contexts[0]
  const generated = context.created.filter(node => node.kind === 'buffer-source')
  assert.equal(generated.length, 1, 'Beat selection must create one generated loop source')
  assert.equal(generated[0].loop, true, 'generated beat must keep playing as a loop')
  assert.equal(generated[0].startCount, 1)
  assert.ok(generated[0].buffer.getChannelData(0).some(sample => Math.abs(sample) > 0.1), 'generated loop must contain audible PCM')
  assert.ok(isConnectedTo(generated[0], context.destination), 'selected Beat must reach audible output')

  await engine.setSource('off')
  assert.equal(deps.contexts.length, 1, 'switching source must reuse the one lazy context')
})

test('bug: microphone monitoring could feed live input to speakers or leave its track running after switching source', async () => {
  const stream = makeStream()
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(async () => stream)
  const engine = createAudioEngine(deps)

  await engine.setSource('microphone')
  const context = deps.contexts[0]
  const microphone = context.created.find(node => node.kind === 'microphone')
  assert.ok(microphone, 'Microphone selection must create an analyser input')
  assert.equal(isConnectedTo(microphone, context.destination), false, 'microphone input must never be monitored to destination')

  await engine.setSource('beat')
  assert.equal(stream.track.stopped, true, 'switching away from microphone must release the live track')
})

test('bug: microphone graph construction failures could leave an approved capture track live', async () => {
  const { createAudioEngine } = await loadAudioModule()
  for (const failure of ['create', 'connect']) {
    const stream = makeStream()
    const deps = makeAudioDeps(async () => stream)
    deps.AudioContext.prototype.createMediaStreamSource = function () {
      if (failure === 'create') throw new Error('graph construction failed')
      const node = this.add(new FakeNode(this, 'microphone'))
      node.connect = () => { throw new Error('graph construction failed') }
      return node
    }
    const engine = createAudioEngine(deps)

    await assert.rejects(engine.setSource('microphone'), /graph construction failed/)

    assert.equal(stream.track.stopped, true, `${failure} failure must release its granted stream`)
    assert.equal(engine.source, 'off')
    assert.equal(deps.contexts[0].state, 'suspended', `${failure} failure must leave the engine fail-closed`)
  }
})

test('bug: a stale getUserMedia approval could revive microphone after the user has already turned audio off', async () => {
  const permission = deferred()
  let permissionCalls = 0
  const stream = makeStream()
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(() => { permissionCalls++; return permission.promise })
  const engine = createAudioEngine(deps)

  const micRequest = engine.setSource('microphone')
  await flushUntil(() => permissionCalls === 1, 'microphone request should reach getUserMedia')
  await engine.setSource('off')
  permission.resolve(stream)
  await micRequest

  assert.equal(engine.source, 'off')
  assert.equal(stream.track.stopped, true, 'stale microphone streams must be stopped instead of retained')
  assert.equal(deps.contexts[0].created.some(node => node.kind === 'microphone'), false, 'stale approval must not attach an input graph')
})

test('bug: hidden tabs could keep an audio graph awake and destroy could leak it', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)
  await engine.setSource('beat')
  const context = deps.contexts[0]

  await engine.setSuspended(true)
  await engine.setSuspended(false)
  await engine.destroy()

  assert.equal(context.suspendCalls, 1)
  assert.equal(context.resumeCalls, 1)
  assert.equal(context.closeCalls, 1)
})

test('bug: hiding a tab could leave active microphone capture running', async () => {
  const stream = makeStream()
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(async () => stream)
  const engine = createAudioEngine(deps)

  await engine.setSource('microphone')
  await engine.setSuspended(true)

  assert.equal(stream.track.stopped, true, 'hiding must release the live microphone track')
  assert.equal(engine.source, 'off')
  await engine.setSuspended(false)
  assert.equal(deps.contexts[0].resumeCalls, 0, 'showing an Off engine must not resume an empty context')
})

test('bug: a microphone grant resolving after the tab hides could attach a hidden capture', async () => {
  const permission = deferred()
  let permissionCalls = 0
  const stream = makeStream()
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(() => { permissionCalls++; return permission.promise })
  const engine = createAudioEngine(deps)

  const micRequest = engine.setSource('microphone')
  await flushUntil(() => permissionCalls === 1, 'microphone request should reach getUserMedia')
  await engine.setSuspended(true)
  permission.resolve(stream)
  await micRequest

  assert.equal(engine.source, 'off')
  assert.equal(stream.track.stopped, true, 'late hidden grants must be stopped immediately')
  assert.equal(deps.contexts[0].created.some(node => node.kind === 'microphone'), false)
})

test('bug: hiding during AudioContext resume could start a microphone request afterward', async () => {
  const resumeGate = deferred()
  let microphoneCalls = 0
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(async () => {
    microphoneCalls++
    return makeStream()
  })
  const engine = createAudioEngine(deps)

  await engine.setSource('beat')
  await engine.setSource('off')
  const context = deps.contexts[0]
  context.resume = async () => {
    context.resumeCalls++
    await resumeGate.promise
    context.state = 'running'
  }

  const micRequest = engine.setSource('microphone')
  await Promise.resolve()
  const hide = engine.setSuspended(true)
  resumeGate.resolve()
  await Promise.all([micRequest, hide])

  assert.equal(microphoneCalls, 0, 'a hidden tab must not begin getUserMedia after resume')
  assert.equal(engine.source, 'off')
  assert.equal(context.state, 'suspended')
})

test('bug: direct microphone selection while hidden could request permission', async () => {
  let microphoneCalls = 0
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps(async () => { microphoneCalls++; return makeStream() })
  const engine = createAudioEngine(deps)

  await engine.setSuspended(true)
  await engine.setSource('microphone')

  assert.equal(microphoneCalls, 0)
  assert.equal(deps.contexts.length, 0, 'hidden selection should keep Web Audio lazy')
  assert.equal(engine.source, 'off')
})

test('bug: Off could leave an empty context running or visibility could resume it', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  await engine.setSource('beat')
  const context = deps.contexts[0]
  const firstVoices = context.created.filter(node => node.kind === 'buffer-source')
  await engine.setSource('off')

  assert.equal(context.suspendCalls, 1)
  assert.ok(firstVoices.every(node => node.stopCount === 1), 'Off must stop every generated loop')
  assert.ok(firstVoices.every(node => node.connections.length === 0), 'Off must disconnect every generated loop')
  await engine.setSuspended(false)
  assert.equal(context.resumeCalls, 0, 'visibility restoration must keep an Off graph suspended')

  await engine.setSource('beat')
  assert.equal(deps.contexts.length, 1, 'Beat restart should reuse the existing context')
  assert.equal(context.resumeCalls, 1, 'Beat restart should resume the suspended context')
})

test('bug: stale context transitions could override the newest source or visibility state', async () => {
  const { createAudioEngine } = await loadAudioModule()

  {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    const context = deps.contexts[0]
    const suspendGate = deferred()
    context.suspend = async () => {
      context.suspendCalls++
      await suspendGate.promise
      context.state = 'suspended'
    }
    const off = engine.setSource('off')
    await Promise.resolve()
    const beat = engine.setSource('beat')
    suspendGate.resolve()
    await Promise.all([off, beat])
    assert.equal(engine.source, 'beat', 'newer Beat selection should win over stale Off')
    assert.equal(context.state, 'running')
  }

  {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    await engine.setSource('off')
    const context = deps.contexts[0]
    const resumeGate = deferred()
    context.resume = async () => {
      context.resumeCalls++
      await resumeGate.promise
      context.state = 'running'
    }
    const beat = engine.setSource('beat')
    await Promise.resolve()
    const off = engine.setSource('off')
    resumeGate.resolve()
    await Promise.all([beat, off])
    assert.equal(engine.source, 'off', 'newer Off selection should win over stale Beat')
    assert.equal(context.state, 'suspended')
  }

  {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    await engine.setSuspended(true)
    const context = deps.contexts[0]
    const resumeGate = deferred()
    context.resume = async () => {
      context.resumeCalls++
      await resumeGate.promise
      context.state = 'running'
    }
    const show = engine.setSuspended(false)
    await Promise.resolve()
    const hide = engine.setSuspended(true)
    resumeGate.resolve()
    await Promise.all([show, hide])
    assert.equal(context.state, 'suspended', 'newer hidden state should win over stale resume')
  }

  {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    const context = deps.contexts[0]
    const suspendGate = deferred()
    context.suspend = async () => {
      context.suspendCalls++
      await suspendGate.promise
      context.state = 'suspended'
    }
    const hide = engine.setSuspended(true)
    await Promise.resolve()
    const show = engine.setSuspended(false)
    suspendGate.resolve()
    await Promise.all([hide, show])
    assert.equal(context.state, 'running', 'newer visible state should win over stale suspend')
  }
})

test('bug: BFCache navigation could permanently destroy Fabric v1 audio controls', async () => {
  const page = await readFile(v1PageUrl, 'utf8')
  assert.match(page, /pagehide[\s\S]{0,300}persisted/)
  assert.match(page, /pageshow[\s\S]{0,180}document\.hidden/, 'BFCache restoration must preserve hidden state')
  assert.doesNotMatch(page, /pageshow[\s\S]{0,180}setPageSuspended\(false\)/)
})

test('bug: a pending source could leave Off visually selected during microphone permission', async () => {
  const page = await readFile(v1PageUrl, 'utf8')
  assert.match(page, /pendingAudioSource\s*\|\|\s*audioEngine\.source/)
  assert.match(page, /pendingAudioSource\s*=\s*source;[\s\S]{0,500}syncAudioSourceButtons\(\)/)
})

test('bug: inactive effects could bleed into Fabric modulation or audio values could exceed render-safe bounds', async () => {
  const { createEffectState, toggleEffect, deriveEffectModulation } = await loadAudioModule()
  const effects = createEffectState()
  assert.deepEqual(effects, { dissolve: false, explode: false, glitter: false, glitch: false })

  toggleEffect(effects, 'glitter')
  assert.deepEqual(effects, { dissolve: false, explode: false, glitter: true, glitch: false })
  const modulation = deriveEffectModulation({ bass: 1.5, mid: -0.2, high: 0.8, onset: 2, level: 0.7 }, effects)
  assert.equal(modulation.dissolve, 0)
  assert.equal(modulation.explode, 0)
  assert.equal(modulation.glitch, 0)
  assert.ok(modulation.glitter > 0, 'enabled glitter must react to high-frequency energy')
  for (const [name, value] of Object.entries(modulation)) {
    assert.equal(typeof value, 'number', `${name} modulation must be numeric`)
    assert.ok(value >= 0 && value <= 1, `${name} modulation must remain within 0..1`)
  }
})

test('bug: named mapping controls could react to unrelated sonic properties', async () => {
  const { deriveEffectModulation } = await loadAudioModule()
  const effects = { dissolve: true, explode: true, glitter: true, glitch: true }

  assert.deepEqual(deriveEffectModulation({ bass: 1 }, effects), { dissolve: 0, explode: 1, glitter: 0, glitch: 0 })
  assert.deepEqual(deriveEffectModulation({ mid: 1 }, effects), { dissolve: 1, explode: 0, glitter: 0, glitch: 0 })
  assert.deepEqual(deriveEffectModulation({ high: 1 }, effects), { dissolve: 0, explode: 0, glitter: 1, glitch: 0 })
  assert.deepEqual(deriveEffectModulation({ onset: 1 }, effects), { dissolve: 0, explode: 0, glitter: 0, glitch: 1 })
})

test('effect amount controls amplify visible response without changing normalized sonic routing', async () => {
  const { deriveEffectIntensity } = await loadAudioModule()
  const raw = { dissolve: 0.25, explode: 0.4, glitter: 0.1, glitch: 0.2 }
  const intensity = deriveEffectIntensity(raw, { dissolve: 0.25, explode: 1, glitter: 2, glitch: 0 })

  assert.ok(intensity.dissolve > 0 && intensity.dissolve < raw.dissolve)
  assert.ok(intensity.explode > raw.explode, 'mid amount should lift the raw audio response')
  assert.ok(intensity.glitter > 0.5, 'maximum glitter amount should make quiet treble visibly obvious')
  assert.equal(intensity.glitch, 0)
  assert.deepEqual(raw, { dissolve: 0.25, explode: 0.4, glitter: 0.1, glitch: 0.2 }, 'raw routing must remain unchanged')
})

test('bug: Explode could apply continuous bass pressure between actual onsets', async () => {
  const { deriveExplosionImpulse } = await loadAudioModule()

  assert.equal(deriveExplosionImpulse({ bass: 1, onset: 0 }, 1), 0)
  const impulse = deriveExplosionImpulse({ bass: 1, onset: 0.4 }, 0.8)
  assert.ok(impulse > 0 && impulse <= 1)
})

test('bug: an effect button could serialize an object instead of its new pressed boolean', async () => {
  const { createEffectState, toggleEffect } = await loadAudioModule()
  const effects = createEffectState()

  assert.equal(toggleEffect(effects, 'glitter'), true)
  assert.equal(toggleEffect(effects, 'glitter'), false)
})

test('bug: generated beat styles could all render the same sound', async () => {
  const { BEAT_STYLE_NAMES, renderGeneratedBeat } = await loadAudioModule()
  assert.deepEqual(BEAT_STYLE_NAMES, ['pulse', 'broken', 'club', 'scatter'])

  const fingerprints = new Set()
  for (const style of BEAT_STYLE_NAMES) {
    const rendered = renderGeneratedBeat(style, 8000)
    assert.ok(rendered.samples.length > 8000, `${style} should render more than one second`)
    assert.ok(rendered.samples.some(sample => Math.abs(sample) > 0.1), `${style} should contain audible transients`)
    assert.ok(rendered.samples.every(Number.isFinite), `${style} samples should be finite`)
    assert.ok(rendered.samples.every(sample => sample >= -1 && sample <= 1), `${style} samples should be normalized`)
    fingerprints.add(createHash('sha256').update(Buffer.from(rendered.samples.buffer)).digest('hex'))
  }
  assert.equal(fingerprints.size, 4, 'each beat style should produce a distinct loop')
})

test('generated beat randomization keeps a type recognizable while producing deterministic variations', async () => {
  const { renderGeneratedBeat } = await loadAudioModule()
  const canonical = renderGeneratedBeat('club', 8000, 0)
  const first = renderGeneratedBeat('club', 8000, 101)
  const repeated = renderGeneratedBeat('club', 8000, 101)
  const second = renderGeneratedBeat('club', 8000, 202)
  const hash = rendered => createHash('sha256').update(Buffer.from(rendered.samples.buffer)).digest('hex')

  assert.equal(hash(first), hash(repeated), 'a chosen variation must be reproducible')
  assert.notEqual(hash(first), hash(second), 'randomizing again must change the generated loop')
  assert.notEqual(hash(first), hash(canonical))
  for (const rendered of [first, second]) {
    assert.equal(rendered.style, 'club')
    assert.ok(rendered.samples.some(sample => Math.abs(sample) > 0.1))
    assert.ok(rendered.samples.every(Number.isFinite))
  }
})

test('bug: changing generated beat style could leak the previous loop or leave the wrong style active', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  assert.equal(engine.beatStyle, 'pulse')
  engine.setBeatStyle('club')
  assert.equal(deps.contexts.length, 0, 'choosing an idle style must keep Web Audio lazy')
  await engine.setSource('beat')
  const context = deps.contexts[0]
  const firstLoop = context.created.find(node => node.kind === 'buffer-source')

  engine.setBeatStyle('scatter')
  const loops = context.created.filter(node => node.kind === 'buffer-source')
  const secondLoop = loops.at(-1)
  assert.equal(engine.source, 'beat')
  assert.equal(engine.beatStyle, 'scatter')
  assert.equal(firstLoop.stopCount, 1, 'style switch must stop the previous generated loop')
  assert.equal(firstLoop.connections.length, 0, 'style switch must disconnect the previous generated loop')
  assert.equal(secondLoop.startCount, 1)
  assert.notDeepEqual(firstLoop.buffer.getChannelData(0), secondLoop.buffer.getChannelData(0))
  assert.throws(() => engine.setBeatStyle('unknown'), /Unknown beat style/)
})

test('generated beat volume and randomization remain lazy until Beat is selected', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine({ ...deps, random: () => 0.25 })

  assert.equal(engine.setBeatVolume(2), 1)
  assert.equal(engine.setBeatVolume(-1), 0)
  assert.equal(engine.setBeatVolume(0.62), 0.62)
  const variation = engine.randomizeBeat()
  assert.ok(variation > 0)
  assert.equal(deps.contexts.length, 0)

  await engine.setSource('beat')
  const context = deps.contexts[0]
  const output = context.created.find(node => node.kind === 'gain')
  assert.equal(output.gain.value, 0.62)
  assert.equal(engine.beatVariation, variation)
  assert.equal(engine.beatVolume, 0.62)
})

test('active generated Beat can change volume and randomize without changing type or leaking the old loop', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine({ ...deps, random: () => 0.375 })
  await engine.setSource('beat')
  const context = deps.contexts[0]
  const oldLoop = context.created.find(node => node.kind === 'buffer-source')
  const oldBuffer = oldLoop.buffer.getChannelData(0).slice()

  engine.setBeatVolume(0.74)
  const variation = engine.randomizeBeat()

  const newLoop = context.created.filter(node => node.kind === 'buffer-source').at(-1)
  const output = context.created.filter(node => node.kind === 'gain').at(-1)
  assert.equal(engine.source, 'beat')
  assert.equal(engine.beatStyle, 'pulse')
  assert.equal(engine.beatVariation, variation)
  assert.equal(output.gain.value, 0.74)
  assert.equal(oldLoop.stopCount, 1)
  assert.equal(oldLoop.connections.length, 0)
  assert.notDeepEqual(newLoop.buffer.getChannelData(0), oldBuffer)
})

test('failed beat randomization preserves the existing style, variation, loop, and volume', async () => {
  const { createAudioEngine } = await loadAudioModule()
  for (const failure of ['connect', 'buffer', 'start']) {
    const deps = makeAudioDeps()
    const engine = createAudioEngine({ ...deps, random: () => 0.5 })
    engine.setBeatVolume(0.58)
    await engine.setSource('beat')
    const context = deps.contexts[0]
    const liveLoop = context.created.find(node => node.kind === 'buffer-source')
    const createdBefore = context.created.length
    failNextBeatBuild(context, failure)

    assert.throws(() => engine.randomizeBeat(), /beat graph failed/)

    assert.equal(engine.beatVariation, 0)
    assert.equal(engine.beatVolume, 0.58)
    assert.equal(liveLoop.stopCount, 0)
    assert.ok(liveLoop.connections.length > 0)
    assert.ok(context.created.slice(createdBefore).every(node => node.connections.length === 0))
    await engine.destroy()
  }
})

test('randomizing while hidden defers exactly one transactional loop replacement until visible', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine({ ...deps, random: () => 0.625 })
  await engine.setSource('beat')
  const context = deps.contexts[0]
  const firstLoop = context.created.find(node => node.kind === 'buffer-source')
  await engine.setSuspended(true)
  const createdBefore = context.created.length

  const variation = engine.randomizeBeat()
  assert.ok(variation > 0)
  assert.equal(context.created.length, createdBefore)

  await engine.setSuspended(false)
  const loops = context.created.filter(node => node.kind === 'buffer-source')
  assert.equal(loops.length, 2)
  assert.equal(firstLoop.stopCount, 1)
  assert.equal(engine.beatVariation, variation)
})

test('bug: failed beat style replacement could discard the live loop and leak a partial graph', async () => {
  const { createAudioEngine } = await loadAudioModule()
  for (const failure of ['connect', 'buffer', 'start']) {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    const context = deps.contexts[0]
    const liveLoop = context.created.find(node => node.kind === 'buffer-source')
    const createdBefore = context.created.length
    failNextBeatBuild(context, failure)

    assert.throws(() => engine.setBeatStyle('club'), /beat graph failed/)

    assert.equal(engine.source, 'beat', `${failure} failure must keep the existing Beat truthful`)
    assert.equal(engine.beatStyle, 'pulse', `${failure} failure must roll back the rejected style`)
    assert.equal(liveLoop.stopCount, 0, `${failure} failure must not stop the working loop`)
    assert.ok(liveLoop.connections.length > 0, `${failure} failure must leave the working loop connected`)
    const partialNodes = context.created.slice(createdBefore)
    assert.ok(partialNodes.every(node => node.connections.length === 0), `${failure} failure must disconnect every partial node`)

    await engine.destroy()
    assert.equal(liveLoop.stopCount, 1)
  }
})

test('bug: failed Beat selection could report an active source or keep partial nodes connected', async () => {
  const { createAudioEngine } = await loadAudioModule()
  for (const failure of ['connect', 'buffer', 'start']) {
    const deps = makeAudioDeps()
    const engine = createAudioEngine(deps)
    await engine.setSource('beat')
    const context = deps.contexts[0]
    await engine.setSource('off')
    const createdBefore = context.created.length
    failNextBeatBuild(context, failure)

    await assert.rejects(engine.setSource('beat'), /beat graph failed/)

    assert.equal(engine.source, 'off', `${failure} failure must leave the engine Off`)
    assert.equal(context.state, 'suspended', `${failure} failure must suspend the empty context`)
    const partialNodes = context.created.slice(createdBefore)
    assert.ok(partialNodes.every(node => node.connections.length === 0), `${failure} failure must disconnect every partial node`)
    await engine.destroy()
  }
})

test('bug: membrane motion could look occluded without audibly filtering the generated Beat', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  engine.setOcclusion(2)
  engine.setMuffleEnabled(true)
  assert.equal(deps.contexts.length, 0, 'setting idle occlusion must keep Web Audio lazy')
  await engine.setSource('beat')

  const membrane = deps.contexts[0].created.find(node => node.kind === 'biquad-filter')
  assert.ok(membrane, 'Beat should pass through a membrane filter')
  assert.equal(membrane.type, 'lowpass')
  assert.ok(membrane.frequency.value >= 300 && membrane.frequency.value <= 500)
  assert.ok(membrane.Q.value > 5)

  engine.setOcclusion(0)
  assert.ok(membrane.frequency.value > 7000, 'an open membrane should restore bright frequencies')
})

test('bug: Fabric muffle mapping could filter generated beats even while its toggle is off', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)

  engine.setOcclusion(1)
  assert.equal(engine.muffleEnabled, false)
  assert.equal(deps.contexts.length, 0)
  await engine.setSource('beat')
  const membrane = deps.contexts[0].created.find(node => node.kind === 'biquad-filter')
  assert.ok(membrane.frequency.value > 7000, 'disabled Fabric mapping should leave generated beats open')

  engine.setMuffleEnabled(true)
  assert.ok(membrane.frequency.value < 500, 'enabled Fabric mapping should muffle the generated beat')
  engine.setMuffleEnabled(false)
  assert.ok(membrane.frequency.value > 7000, 'turning Fabric mapping off should reopen the sound')
})

test('bug: disabled Fabric muffle could still schedule filter work every animation frame', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)
  await engine.setSource('beat')
  const membrane = deps.contexts[0].created.find(node => node.kind === 'biquad-filter')
  const initialUpdates = membrane.frequency.cancelCalls + membrane.frequency.holdCalls

  for (let frame = 0; frame < 120; frame++) engine.setOcclusion(frame % 2)

  assert.equal(membrane.frequency.cancelCalls + membrane.frequency.holdCalls, initialUpdates, 'disabled mapping should ignore cloth occlusion updates')
})

test('bug: per-frame occlusion could retain active automation or snap a filter ramp', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)
  await engine.setSource('beat')
  engine.setMuffleEnabled(true)
  const membrane = deps.contexts[0].created.find(node => node.kind === 'biquad-filter')

  for (let frame = 0; frame < 240; frame++) {
    deps.contexts[0].currentTime = frame / 60
    engine.setOcclusion(frame % 2)
  }

  assert.ok(membrane.frequency.holdCalls > 0, 'updated occlusion should hold the live ramp before retargeting')
  assert.equal(membrane.frequency.cancelCalls, 0, 'an intrinsic AudioParam value must not be mistaken for the live ramp value')
  assert.equal(membrane.frequency.events[0]?.type, 'hold', 'the live ramp must be held before retargeting')
  assert.ok(membrane.frequency.events[0]?.value > 7000, 'the previous bright target should be held without resetting')
  assert.ok(membrane.frequency.events[1]?.value < 500, 'the final closed target should follow the held value')
  assert.ok(membrane.frequency.events.length <= 2, 'frequency automation should stay coalesced')
  assert.ok(membrane.Q.events.length <= 2, 'resonance automation should stay coalesced')
})

test('bug: analyser data could escape the 0..1 signal contract consumed by Fabric physics', async () => {
  const { createAudioEngine } = await loadAudioModule()
  const deps = makeAudioDeps()
  const engine = createAudioEngine(deps)
  await engine.setSource('beat')

  const signals = engine.sample(1 / 60)
  for (const name of ['bass', 'mid', 'high', 'onset', 'level']) {
    assert.equal(typeof signals[name], 'number', `${name} must be numeric`)
    assert.ok(signals[name] >= 0 && signals[name] <= 1, `${name} must remain within 0..1`)
  }
})

test('bug: musical treble around 3 kHz could be misclassified as midrange', async () => {
  class MusicalAnalyser extends FakeAnalyser {
    constructor (context) {
      super(context)
      this.frequencyBinCount = 128
      this.spectrum = new Uint8Array(128)
      this.spectrum.fill(255, 16, 21)
    }
  }
  const contexts = []
  class MusicalContext extends FakeAudioContext {
    constructor () { super(); contexts.push(this) }
    createAnalyser () { return this.add(new MusicalAnalyser(this)) }
  }
  const { createAudioEngine } = await loadAudioModule()
  const engine = createAudioEngine({ AudioContext: MusicalContext })
  await engine.setSource('beat')

  const signals = engine.sample(1 / 60)
  assert.ok(signals.high > signals.mid, '3–4 kHz energy should drive the high band')
})
