export type ExportAudioClip = {
  id: string; assetId: string; url: string; name: string; start: number
  trimStart: number; trimEnd: number; duration: number; speed?: number; volume?: number
  muted?: boolean; fadeIn?: number; fadeOut?: number; ducking?: boolean; voice?: boolean; optionalAudio?: boolean
  volumeKeyframes?: Array<{ time: number; value: number }>
}
export type PreparedExportAudio = { clip: ExportAudioClip; buffer: AudioBuffer }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function exportAudioTiming(clip: ExportAudioClip, bufferDuration: number) {
  const speed = Number.isFinite(clip.speed) ? clamp(clip.speed!, 0.1, 8) : 1
  const offset = clamp(clip.trimStart, 0, bufferDuration)
  const sourceDuration = Math.max(0, Math.min(clip.trimEnd - offset, bufferDuration - offset, clip.duration * speed))
  return { start: Math.max(0, clip.start), offset, sourceDuration, duration: sourceDuration / speed, speed }
}

function gainEvaluator(clip: ExportAudioClip, voices: Array<{ id: string; start: number; end: number }>) {
  const duration = Math.max(0.1, clip.trimEnd - clip.trimStart)
  const fadeIn = Math.min(Math.max(0, clip.fadeIn ?? 0), duration / 2)
  const fadeOut = Math.min(Math.max(0, clip.fadeOut ?? 0), duration / 2)
  const keys = [...(clip.volumeKeyframes ?? [])].filter(key => Number.isFinite(key.time) && Number.isFinite(key.value)).sort((a, b) => a.time - b.time)
  return (elapsed: number) => {
    if (clip.muted) return 0
    const relative = Math.max(0, elapsed * (clip.speed ?? 1))
    const envelope = clamp(Math.min(fadeIn ? relative / fadeIn : 1, fadeOut ? (duration - relative) / fadeOut : 1), 0, 1)
    let keyVolume = 1
    if (keys.length) {
      const right = keys.findIndex(key => key.time >= relative)
      if (right === 0) keyVolume = keys[0].value
      else if (right < 0) keyVolume = keys[keys.length - 1].value
      else {
        const a = keys[right - 1], b = keys[right]
        keyVolume = a.value + (b.value - a.value) * clamp((relative - a.time) / Math.max(0.001, b.time - a.time), 0, 1)
      }
    }
    let duck = 1
    if (!clip.voice && clip.ducking !== false) {
      const timelineTime = clip.start + elapsed
      for (const voice of voices) {
        if (voice.id === clip.id || timelineTime < voice.start || timelineTime >= voice.end + 0.1) continue
        const attack = clamp((timelineTime - voice.start) / 0.03, 0, 1)
        const release = timelineTime < voice.end ? 1 : clamp(1 - (timelineTime - voice.end) / 0.1, 0, 1)
        duck = Math.min(duck, 1 - 0.62 * attack * release)
      }
    }
    return clamp(clip.volume ?? 1, 0, 1) * clamp(keyVolume, 0, 1) * envelope * duck
  }
}

export function exportAudioGain(clip: ExportAudioClip, elapsed: number, voices: Array<{ id: string; start: number; end: number }>) {
  return gainEvaluator(clip, voices)(elapsed)
}

export async function prepareExportAudio(context: BaseAudioContext, clips: ExportAudioClip[], cancelled: () => boolean, onWarning?: (message: string) => void) {
  const cache = new Map<string, AudioBuffer | null>()
  const prepared: PreparedExportAudio[] = []
  for (const clip of clips) {
    if (cancelled()) throw new DOMException('Export cancelled', 'AbortError')
    if (clip.muted) continue
    if (!cache.has(clip.assetId)) {
      try {
        const response = await fetch(clip.url)
        if (!response.ok) throw new Error('Media could not be read')
        cache.set(clip.assetId, await context.decodeAudioData(await response.arrayBuffer()))
      } catch (error) {
        // A video container may legitimately have no audio stream.
        if (clip.optionalAudio) { cache.set(clip.assetId, null); onWarning?.(`Không đọc được audio trong video “${clip.name}” (file có thể không có tiếng).`) }
        else throw new Error(`Không giải mã được audio “${clip.name}”. Hãy thử WAV, MP3 hoặc M4A khác.`, { cause: error })
      }
    }
    const buffer = cache.get(clip.assetId)
    if (buffer && exportAudioTiming(clip, buffer.duration).duration > 0) prepared.push({ clip, buffer })
  }
  if (cancelled()) throw new DOMException('Export cancelled', 'AbortError')
  return prepared
}

// All audio and gain changes are scheduled before drawing any video frames.
// Neither a slow canvas frame nor a delayed JS timer can seek/restart these nodes.
export function scheduleExportAudio(context: BaseAudioContext, destination: AudioNode, prepared: PreparedExportAudio[], epoch: number) {
  const nodes: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = []
  const voices = prepared.filter(({ clip }) => clip.voice && !clip.muted).map(({ clip, buffer }) => {
    const timing = exportAudioTiming(clip, buffer.duration)
    return { id: clip.id, start: timing.start, end: timing.start + timing.duration }
  })
  try {
    for (const { clip, buffer } of prepared) {
      const timing = exportAudioTiming(clip, buffer.duration)
      if (!timing.duration || clip.muted) continue
      const source = context.createBufferSource()
      const gain = context.createGain()
      nodes.push({ source, gain })
      source.buffer = buffer
      source.playbackRate.value = timing.speed
      source.connect(gain); gain.connect(destination)
      const count = Math.max(2, Math.ceil(timing.duration * 100) + 1)
      const gainAt = gainEvaluator(clip, voices)
      const curve = Float32Array.from({ length: count }, (_, index) => gainAt(index / (count - 1) * timing.duration))
      gain.gain.setValueCurveAtTime(curve, epoch + timing.start, timing.duration)
      source.start(epoch + timing.start, timing.offset, timing.sourceDuration)
      source.stop(epoch + timing.start + timing.duration)
    }
  } catch (error) {
    nodes.forEach(({ source, gain }) => { try { source.stop() } catch { /* Not started yet. */ }; source.disconnect(); gain.disconnect() })
    throw error
  }
  return () => nodes.forEach(({ source, gain }) => { try { source.stop() } catch { /* Already ended. */ }; source.disconnect(); gain.disconnect() })
}

export function exportClockTime(now: number, epoch: number, duration: number) {
  return clamp(now - epoch, 0, duration)
}
