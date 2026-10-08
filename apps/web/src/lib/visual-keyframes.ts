export const VISUAL_KEYS = ['positionX', 'positionY', 'scale', 'rotation', 'opacity', 'brightness', 'contrast', 'saturation', 'hue', 'sepia', 'effectStrength'] as const
export type VisualKey = typeof VISUAL_KEYS[number]
export type VisualValues = Partial<Record<VisualKey, number>>
export type VisualKeyframe = { time: number; values: VisualValues }

const defaults: Record<VisualKey, number> = {
  positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1,
  brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0, effectStrength: 65,
}

export function visualSnapshot(values: VisualValues): Record<VisualKey, number> {
  return Object.fromEntries(VISUAL_KEYS.map(key => [key, Number.isFinite(values[key]) ? values[key] : defaults[key]])) as Record<VisualKey, number>
}

export function resolveVisualValues(base: VisualValues & { visualKeyframes?: VisualKeyframe[] }, localTime: number): Record<VisualKey, number> {
  const initial = visualSnapshot(base)
  const frames = [...(base.visualKeyframes ?? [])].filter(frame => Number.isFinite(frame.time)).sort((a, b) => a.time - b.time)
  if (!frames.length) return initial
  if (localTime <= frames[0].time) return { ...initial, ...frames[0].values }
  if (localTime >= frames[frames.length - 1].time) return { ...initial, ...frames[frames.length - 1].values }
  const right = frames.findIndex(frame => frame.time >= localTime)
  const leftFrame = frames[right - 1], rightFrame = frames[right]
  const t = (localTime - leftFrame.time) / Math.max(.000001, rightFrame.time - leftFrame.time)
  const left = { ...initial, ...leftFrame.values }, next = { ...initial, ...rightFrame.values }
  return Object.fromEntries(VISUAL_KEYS.map(key => [key, left[key] + (next[key] - left[key]) * t])) as Record<VisualKey, number>
}

export function upsertVisualKeyframe(base: VisualValues & { visualKeyframes?: VisualKeyframe[] }, localTime: number, patch: VisualValues, duration: number): VisualKeyframe[] {
  const time = Math.max(0, Math.min(duration, localTime))
  const existing = base.visualKeyframes ?? []
  const frames = existing.length ? [...existing] : [{ time: 0, values: visualSnapshot(base) }]
  const values = { ...resolveVisualValues({ ...base, visualKeyframes: frames }, time), ...patch }
  const index = frames.findIndex(frame => Math.abs(frame.time - time) < .025)
  if (index >= 0) frames[index] = { time: frames[index].time, values }
  else frames.push({ time, values })
  return frames.sort((a, b) => a.time - b.time)
}
