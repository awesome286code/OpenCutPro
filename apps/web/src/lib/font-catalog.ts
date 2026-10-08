export const EDITOR_FONTS = [
  { family: 'Noto Sans TC', label: 'Noto Sans TC', category: 'Chữ Trung · hiện đại' },
  { family: 'Noto Serif TC Variable', label: 'Noto Serif TC', category: 'Chữ Trung · thanh lịch' },
  { family: 'Inter Variable', label: 'Inter', category: 'Việt/Anh · tối giản' },
  { family: 'Be Vietnam Pro', label: 'Be Vietnam Pro', category: 'Tiếng Việt · rõ nét' },
  { family: 'Manrope Variable', label: 'Manrope', category: 'Việt/Anh · hiện đại' },
  { family: 'Montserrat Variable', label: 'Montserrat', category: 'Việt/Anh · nổi bật' },
  { family: 'Plus Jakarta Sans Variable', label: 'Plus Jakarta Sans', category: 'Việt/Anh · mềm mại' },
  { family: 'Sora Variable', label: 'Sora', category: 'Việt/Anh · cá tính' },
] as const

export function captionFontStack(family: string) {
  if (family === 'monospace') return 'monospace, "Noto Sans TC", "Inter Variable", sans-serif'
  const safeFamily = family.replace(/["'\\]/g, '').trim() || 'Inter Variable'
  return `"${safeFamily}", "Noto Sans TC", "Inter Variable", sans-serif`
}

export function fontLoadRequests(captions: Array<{ font: string; text: string; size: number; weight: number }>) {
  const groups = new Map<string, { font: string; weight: number; size: number; text: string }>()
  for (const caption of captions) {
    const key = `${caption.font}:${caption.weight}`
    const group = groups.get(key)
    if (group) { group.text += caption.text; group.size = Math.max(group.size, caption.size) }
    else groups.set(key, { font: caption.font, weight: caption.weight, size: caption.size, text: caption.text })
  }
  return [...groups.values()].map(group => ({ css: `${group.weight} ${Math.max(12, Math.round(group.size))}px ${captionFontStack(group.font)}`, text: group.text }))
}
