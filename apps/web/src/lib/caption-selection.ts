import type { Caption } from './short-video.ts'

export const CAPTION_STYLE_KEYS = ['size', 'font', 'color', 'fontWeight', 'letterSpacing', 'textAlign', 'stroke', 'strokeWidth', 'shadow', 'background', 'animation', 'opacity', 'scale', 'rotation', 'animationInDuration', 'animationOutDuration'] as const
export type CaptionStyleKey = typeof CAPTION_STYLE_KEYS[number]

export function selectedCaptions(captions: Caption[], ids: string[], focusedId: string | null) {
  const selected = new Set(ids.length ? ids : focusedId ? [focusedId] : [])
  return captions.filter(caption => selected.has(caption.id))
}

export function subtitleSelection(captions: Caption[], track?: number) {
  return captions.filter(caption => !caption.creatorTitle && (track === undefined || (caption.track ?? 0) === track)).map(caption => caption.id)
}

export function captionStyleValue(caption: Caption, key: CaptionStyleKey) {
  const defaults = { fontWeight: 700, letterSpacing: 0, textAlign: 'center', stroke: '#000000', strokeWidth: 0, shadow: true, background: '', animation: 'none', opacity: 1, scale: 1, rotation: 0, animationInDuration: .35, animationOutDuration: 0 }
  return caption[key] ?? defaults[key as keyof typeof defaults]
}

export function mixedCaptionStyles(captions: Caption[]) {
  return Object.fromEntries(CAPTION_STYLE_KEYS.map(key => [key, captions.length > 1 && captions.some(caption => captionStyleValue(caption, key) !== captionStyleValue(captions[0], key))])) as Record<CaptionStyleKey, boolean>
}

// Only visual properties can be changed as a batch. Content/timing/position
// remain individual to protect lyric wording, synchronization and bilingual layout.
export function updateCaptionSelection(captions: Caption[], ids: string[], key: keyof Caption, value: string | number | boolean): Caption[] {
  const existing = new Set(captions.map(caption => caption.id))
  const selected = new Set(ids.filter(id => existing.has(id)))
  if (!selected.size || (selected.size > 1 && !CAPTION_STYLE_KEYS.includes(key as CaptionStyleKey))) return captions
  const bounds: Partial<Record<keyof Caption, [number, number]>> = { size: [10, 240], fontWeight: [300, 900], letterSpacing: [-8, 30], strokeWidth: [0, 12], opacity: [0, 1], scale: [.1, 4], rotation: [-180, 180], animationInDuration: [.01, 10], animationOutDuration: [0, 10], x: [0, 100], y: [0, 100], start: [0, Infinity], duration: [0.1, Infinity] }
  if (bounds[key]) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return captions
    const [min, max] = bounds[key]!
    value = Math.max(min, Math.min(max, value))
  }
  if (key === 'textAlign' && !['left', 'center', 'right'].includes(String(value))) return captions
  if (key === 'animation' && !['none', 'fade', 'pop', 'slide', 'scroll'].includes(String(value))) return captions
  if ((key === 'shadow' && typeof value !== 'boolean') || (key === 'font' && (typeof value !== 'string' || !value.trim()))) return captions
  if (['color', 'stroke', 'background'].includes(key) && (typeof value !== 'string' || !(key === 'background' && value === '') && !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value))) return captions
  let changed = false
  const result = captions.map(caption => {
    if (!selected.has(caption.id) || caption[key] === value) return caption
    changed = true
    return { ...caption, [key]: value }
  })
  return changed ? result : captions
}
