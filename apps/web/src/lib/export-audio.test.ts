import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportAudioGain, exportAudioTiming, exportClockTime, prepareExportAudio, scheduleExportAudio, type ExportAudioClip } from './export-audio.ts'

const clip: ExportAudioClip = { id: 'music', assetId: 'audio', url: 'data:audio/wav;base64,AAAA', name: 'Music', start: 3, trimStart: 2, trimEnd: 8, duration: 6, volume: 0.8 }

test('audio scheduling respects clip offset, source trim, speed and available samples', () => {
  assert.deepEqual(exportAudioTiming(clip, 10), { start: 3, offset: 2, sourceDuration: 6, duration: 6, speed: 1 })
  assert.deepEqual(exportAudioTiming({ ...clip, speed: 2 }, 10), { start: 3, offset: 2, sourceDuration: 6, duration: 3, speed: 2 })
  assert.deepEqual(exportAudioTiming({ ...clip, speed: 0.5 }, 10), { start: 3, offset: 2, sourceDuration: 3, duration: 6, speed: 0.5 })
  assert.equal(exportAudioTiming(clip, 4).duration, 2)
  assert.equal(exportAudioTiming(clip, 1).duration, 0)
})

test('gain keeps mute, volume, source-relative keyframes and fades', () => {
  assert.equal(exportAudioGain({ ...clip, muted: true }, 1, []), 0)
  assert.equal(exportAudioGain(clip, 1, []), 0.8)
  assert.equal(exportAudioGain({ ...clip, fadeIn: 1 }, 0.5, []), 0.4)
  assert.equal(exportAudioGain({ ...clip, fadeOut: 1 }, 5.5, []), 0.4)
  assert.equal(exportAudioGain({ ...clip, volumeKeyframes: [{ time: 0, value: 0 }, { time: 4, value: 1 }] }, 2, []), 0.4)
})

test('ducking follows timeline voice intervals, not the audio source trim time', () => {
  const voices = [{ id: 'voice', start: 5, end: 6 }]
  assert.equal(exportAudioGain(clip, 1, voices), 0.8)
  assert.ok(Math.abs(exportAudioGain(clip, 2.5, voices) - 0.8 * 0.38) < 1e-8)
  assert.equal(exportAudioGain(clip, 3.2, voices), 0.8)
  assert.equal(exportAudioGain({ ...clip, voice: true }, 2.5, voices), 0.8)
  assert.equal(exportAudioGain({ ...clip, ducking: false }, 2.5, voices), 0.8)
})

test('render clock catches up after a slow frame without seeking or replaying audio', () => {
  assert.deepEqual([10, 10.03, 10.5, 11.7, 30].map(now => Number(exportClockTime(now, 10, 6).toFixed(2))), [0, 0.03, 0.5, 1.7, 6])
  assert.equal(exportClockTime(9, 10, 6), 0)
})

test('each clip is scheduled exactly once, including gaps and simultaneous tracks', () => {
  const starts: number[][] = [], stops: number[][] = [], curves: Array<{ start: number; duration: number; first: number; last: number }> = []
  let disconnected = 0
  const context = {
    createBufferSource: () => ({ buffer: null, playbackRate: { value: 1 }, connect() {}, disconnect() { disconnected++ }, start(...args: number[]) { starts.push(args) }, stop(...args: number[]) { stops.push(args) } }),
    createGain: () => ({ connect() {}, disconnect() { disconnected++ }, gain: { setValueCurveAtTime(curve: Float32Array, start: number, duration: number) { curves.push({ start, duration, first: curve[0], last: curve.at(-1)! }) } } }),
  } as unknown as BaseAudioContext
  const buffer = { duration: 10 } as AudioBuffer
  const cleanup = scheduleExportAudio(context, {} as AudioNode, [{ clip, buffer }, { clip: { ...clip, id: 'later', start: 12, fadeIn: 1, fadeOut: 1 }, buffer }], 50)
  assert.deepEqual(starts, [[53, 2, 6], [62, 2, 6]])
  assert.deepEqual(stops, [[59], [68]])
  assert.deepEqual(curves[1], { start: 62, duration: 6, first: 0, last: 0 })
  cleanup()
  assert.equal(starts.length, 2)
  assert.equal(disconnected, 4)
})

test('decode cache reuses a source across clips and fails explicitly for unreadable audio', async () => {
  let decodes = 0
  const context = { decodeAudioData: async () => { decodes++; return { duration: 10 } } } as unknown as BaseAudioContext
  const prepared = await prepareExportAudio(context, [clip, { ...clip, id: 'copy', start: 20 }], () => false)
  assert.equal(decodes, 1)
  assert.equal(prepared.length, 2)
  assert.equal(prepared[0].buffer, prepared[1].buffer)
  await assert.rejects(prepareExportAudio(context, [clip], () => true), { name: 'AbortError' })
  const invalid = { decodeAudioData: async () => { throw new Error('Invalid audio') } } as unknown as BaseAudioContext
  await assert.rejects(prepareExportAudio(invalid, [clip], () => false), /Không giải mã được audio/)
  assert.equal((await prepareExportAudio(invalid, [{ ...clip, optionalAudio: true }], () => false)).length, 0)
})
