// Timeline geometry must reflect time, not the space needed to display a label.
export function timelineSpan(start: number, duration: number, length: number) {
  const total = Number.isFinite(length) && length > 0 ? length : 1
  const from = Number.isFinite(start) ? start : 0
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0
  const left = Math.max(0, Math.min(total, from))
  const right = Math.max(left, Math.min(total, from + seconds))
  return { left: `${left / total * 100}%`, width: `${(right - left) / total * 100}%` }
}

export function timelineContentWidth(length: number, zoom: number) {
  const duration = Number.isFinite(length) ? Math.max(1, length) : 1
  const scale = Number.isFinite(zoom) ? Math.max(20, Math.min(400, zoom)) / 100 : 0.72
  return Math.max(920, 126 + duration * 20 * scale)
}

export function timelineCaptionLabel(text: string) {
  return text.replace(/\s+/gu, ' ').trim()
}
