export type VisualEffect = 'none' | 'glow' | 'vintage' | 'neon' | 'noir' | 'dream' | 'arctic' | 'ember'
export type VisualLook = { brightness?: number; contrast?: number; saturation?: number; hue?: number; sepia?: number; effect?: VisualEffect; effectStrength?: number }

export const FILTER_PRESETS = [
  { name: 'Original', look: { brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0 } },
  { name: 'Cinema', look: { brightness: 94, contrast: 122, saturation: 86, hue: -5, sepia: 9 } },
  { name: 'Warm', look: { brightness: 104, contrast: 108, saturation: 118, hue: -8, sepia: 12 } },
  { name: 'Mono', look: { brightness: 100, contrast: 118, saturation: 0, hue: 0, sepia: 0 } },
  { name: 'Golden Hour', look: { brightness: 107, contrast: 105, saturation: 124, hue: -12, sepia: 17 } },
  { name: 'Cool Blue', look: { brightness: 99, contrast: 112, saturation: 114, hue: 18, sepia: 0 } },
  { name: 'Soft Pastel', look: { brightness: 108, contrast: 88, saturation: 82, hue: 4, sepia: 5 } },
  { name: 'Analog', look: { brightness: 97, contrast: 112, saturation: 91, hue: -4, sepia: 28 } },
  { name: 'Midnight', look: { brightness: 78, contrast: 139, saturation: 77, hue: 16, sepia: 4 } },
  { name: 'Pearl', look: { brightness: 113, contrast: 89, saturation: 68, hue: 5, sepia: 4 } },
  { name: 'Emerald', look: { brightness: 97, contrast: 119, saturation: 112, hue: 37, sepia: 5 } },
  { name: 'Rose Film', look: { brightness: 104, contrast: 104, saturation: 105, hue: -22, sepia: 14 } },
] as const

export const EFFECT_PRESETS: Array<{ id: VisualEffect; name: string; description: string }> = [
  { id: 'none', name: 'None', description: 'Tắt hiệu ứng' },
  { id: 'glow', name: 'Soft Glow', description: 'Sáng nhẹ · rực rỡ' },
  { id: 'vintage', name: 'Vintage Film', description: 'Màu phim hoài cổ' },
  { id: 'neon', name: 'Neon Night', description: 'Màu đậm · tương phản' },
  { id: 'noir', name: 'Noir', description: 'Đen trắng điện ảnh' },
  { id: 'dream', name: 'Dream Haze', description: 'Mềm, sáng, màu pastel' },
  { id: 'arctic', name: 'Arctic', description: 'Sắc lạnh, rõ chi tiết' },
  { id: 'ember', name: 'Ember', description: 'Đỏ ấm, tương phản sâu' },
]

export function visualFilter(look: VisualLook) {
  const strength = Math.max(0, Math.min(100, look.effectStrength ?? 65)) / 100
  const effect = look.effect ?? 'none'
  const brightness = (look.brightness ?? 100) * (effect === 'glow' ? 1 + .15 * strength : effect === 'neon' ? 1 + .05 * strength : effect === 'dream' ? 1 + .13 * strength : effect === 'arctic' ? 1 + .03 * strength : effect === 'ember' ? 1 - .06 * strength : 1)
  const contrast = (look.contrast ?? 100) * (effect === 'vintage' ? 1 - .08 * strength : effect === 'neon' ? 1 + .3 * strength : effect === 'noir' ? 1 + .23 * strength : effect === 'dream' ? 1 - .12 * strength : effect === 'arctic' ? 1 + .15 * strength : effect === 'ember' ? 1 + .19 * strength : 1)
  const saturation = (look.saturation ?? 100) * (effect === 'glow' ? 1 + .12 * strength : effect === 'vintage' ? 1 - .3 * strength : effect === 'neon' ? 1 + .55 * strength : effect === 'noir' ? 1 - strength : effect === 'dream' ? 1 - .13 * strength : effect === 'arctic' ? 1 - .1 * strength : effect === 'ember' ? 1 + .16 * strength : 1)
  const sepia = Math.max(0, Math.min(100, (look.sepia ?? 0) + (effect === 'vintage' ? 50 * strength : effect === 'ember' ? 22 * strength : 0)))
  const hue = (look.hue ?? 0) + (effect === 'neon' ? 10 * strength : effect === 'arctic' ? 18 * strength : effect === 'ember' ? -13 * strength : 0)
  return `brightness(${brightness.toFixed(2)}%) contrast(${contrast.toFixed(2)}%) saturate(${saturation.toFixed(2)}%) sepia(${sepia.toFixed(2)}%) hue-rotate(${hue.toFixed(2)}deg)`
}

export type TransitionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
export type TransitionDirection = 'left' | 'right' | 'up' | 'down'
export type TransitionVisual = { incomingOpacity: number; outgoingOpacity: number; incomingOffset: number; incomingOffsetY: number }
export function transitionVisual(type: 'none' | 'fade' | 'dissolve' | 'slide', progress: number, easing: TransitionEasing = 'linear', direction: TransitionDirection = 'right'): TransitionVisual {
  const raw = Math.max(0, Math.min(1, progress))
  const p = easing === 'ease-in' ? raw * raw : easing === 'ease-out' ? 1 - (1 - raw) ** 2 : easing === 'ease-in-out' ? raw * raw * (3 - 2 * raw) : raw
  if (type === 'slide') return { incomingOpacity: 1, outgoingOpacity: 1, incomingOffset: direction === 'left' ? p - 1 : direction === 'right' ? 1 - p : 0, incomingOffsetY: direction === 'up' ? p - 1 : direction === 'down' ? 1 - p : 0 }
  if (type === 'fade') return { incomingOpacity: p, outgoingOpacity: Math.max(0, 1 - 2 * p), incomingOffset: 0, incomingOffsetY: 0 }
  // Source-over alpha already multiplies the underlying frame by (1 - p).
  // Dimming it here would produce a dark dip halfway through the dissolve.
  if (type === 'dissolve') return { incomingOpacity: p, outgoingOpacity: 1, incomingOffset: 0, incomingOffsetY: 0 }
  return { incomingOpacity: 1, outgoingOpacity: 0, incomingOffset: 0, incomingOffsetY: 0 }
}
