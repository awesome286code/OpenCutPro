import { pinyin } from 'pinyin-pro'
import { wrapCaption, type AspectRatio, type Caption } from './short-video.ts'
import { CREATOR_STYLES } from './creator-styles.ts'

export type SubtitleMode = 'pinyin' | 'vietnamese' | 'both'
export type LyricRole = 'chinese' | 'pinyin' | 'vietnamese'

export function lyricRole(caption: Caption): LyricRole {
  return caption.id.endsWith('-pinyin') ? 'pinyin' : caption.id.endsWith('-vietnamese') ? 'vietnamese' : 'chinese'
}

export function lyricDisplayText(caption: Caption) {
  if (!caption.lyricStyleVersion) return caption.text
  const role = lyricRole(caption)
  const wide = CREATOR_STYLES.find(style => style.id === caption.creatorStyleId)?.ratio === '16:9'
  if (role === 'chinese') {
    const source = normalizeChineseCaption(caption.text)
    const chars = Array.from(source)
    const limit = wide ? 24 : caption.lyricPresentation ? caption.lyricViewport ? 12 : 14 : 9
    const lines = Math.ceil(chars.length / limit), balanced = Math.ceil(chars.length / Math.max(1, lines))
    return Array.from({ length: lines }, (_, index) => chars.slice(index * balanced, (index + 1) * balanced).join('')).join('\n')
  }
  return wrapCaption(caption.text.replace(/\s*\n\s*/g, ' ').trim(), wide ? 64 : caption.lyricPresentation ? 42 : role === 'pinyin' ? 31 : 30)
}

// Layout is stored in captions so the Inspector can still edit every line independently.
// Reflow only newly generated/legacy groups; don't reset user-adjusted groups on reload.
export function applyProfessionalLyricStyle(captions: Caption[]) {
  const byId = new Map(captions.map(caption => [caption.id, caption]))
  const updated = new Map<string, Caption>()
  for (const source of captions) {
    if (source.id.endsWith('-pinyin') || source.id.endsWith('-vietnamese')) continue
    const pinyinCaption = byId.get(`${source.id}-pinyin`)
    const vietnameseCaption = byId.get(`${source.id}-vietnamese`)
    if (!pinyinCaption && !vietnameseCaption) continue
    const group = [source, pinyinCaption, vietnameseCaption].filter((caption): caption is Caption => Boolean(caption))
    if (group.every(caption => caption.lyricStyleVersion === 2)) continue
    const creatorStyle = CREATOR_STYLES.find(style => style.id === source.creatorStyleId)
    const wide = creatorStyle?.ratio === '16:9'
    const scrolling = Boolean(source.lyricPresentation)
    const designHeight = wide ? 1080 : 1920
    const main = creatorStyle?.caption
    const secondary = creatorStyle?.creator
    const styles: Record<LyricRole, Pick<Caption, 'font' | 'size' | 'color' | 'stroke' | 'strokeWidth' | 'shadow' | 'background'>> = {
      chinese: { font: main?.font === 'Noto Serif TC Variable' ? main.font : 'Noto Sans TC', size: wide ? 54 : 92, color: main?.color ?? '#ffffff', stroke: main?.stroke ?? '#10121a', strokeWidth: main?.strokeWidth ?? 2, shadow: main?.shadow ?? true, background: main?.background },
      pinyin: { font: secondary?.latinFont ?? 'Inter Variable', size: wide ? 30 : 54, color: secondary?.pinyinColor ?? '#e9edc8', stroke: main?.stroke ?? '#10121a', strokeWidth: main?.strokeWidth === 0 ? 0 : 1, shadow: main?.shadow ?? true, background: undefined },
      vietnamese: { font: secondary?.latinFont ?? 'Inter Variable', size: wide ? 36 : 62, color: secondary?.translationColor ?? '#ffffff', stroke: main?.stroke ?? '#10121a', strokeWidth: main?.strokeWidth === 0 ? 0 : 1, shadow: main?.shadow ?? true, background: undefined },
    }
    const prepared = group.map(caption => ({ ...caption, ...styles[lyricRole(caption)], ...(scrolling ? { size: lyricRole(caption) === 'chinese' ? wide ? 50 : 80 : lyricRole(caption) === 'pinyin' ? wide ? 25 : 42 : wide ? 29 : 46 } : {}), x: 50, animation: 'none' as const, lyricStyleVersion: 2 as const }))
    const naturalHeight = prepared.reduce((sum, caption) => sum + lyricDisplayText(caption).split('\n').length * caption.size * 1.12, 0) + 11 * (prepared.length - 1)
    const groupScale = Math.min(1, (scrolling ? wide ? 210 : 360 : wide ? 260 : 560) / naturalHeight)
    const fitted = prepared.map(caption => ({ ...caption, size: Math.round(caption.size * groupScale) }))
    const heights = fitted.map(caption => lyricDisplayText(caption).split('\n').length * caption.size * 1.12)
    const gap = 11
    const totalHeight = heights.reduce((sum, height) => sum + height, 0) + gap * (prepared.length - 1)
    let cursor = scrolling ? designHeight * (main?.y ?? source.y) / 100 - heights[0] / 2 : designHeight * 0.87 - totalHeight
    fitted.forEach((caption, index) => {
      updated.set(caption.id, { ...caption, y: (cursor + heights[index] / 2) / designHeight * 100 })
      cursor += heights[index] + gap
    })
  }
  return captions.map(caption => updated.get(caption.id) ?? caption)
}

export function chineseSourceCaptions(captions: Caption[], clipIds: Set<string>) {
  return captions.filter(caption => caption.origin === 'auto' && !caption.id.endsWith('-pinyin') && !caption.id.endsWith('-vietnamese') && caption.sourceClipId && clipIds.has(caption.sourceClipId) && /[\u3400-\u9fff]/u.test(caption.text))
    .sort((a, b) => a.start - b.start)
}

export function toPinyin(text: string) {
  return pinyin(normalizeChineseCaption(text), { toneType: 'symbol' }).replace(/\s+([，。！？、；：,.!?;:])/g, '$1')
}

export function normalizeChineseCaption(text: string) {
  return text.replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, '').replace(/\s*\n\s*/g, ' ').trim()
}

export function makeBilingualCaptions(sources: Caption[], translations: string[] | null, mode: SubtitleMode, pinyinTrack: number, vietnameseTrack: number) {
  if ((mode === 'vietnamese' || mode === 'both') && (!translations || translations.length !== sources.length || translations.some(text => !text.trim()))) throw new Error('Bản dịch chưa khớp số câu gốc hoặc có câu trống.')
  const generated: Caption[] = []
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index]
    if (mode !== 'vietnamese') generated.push({ ...source, id: `${source.id}-pinyin`, text: wrapCaption(toPinyin(source.text), 34), track: pinyinTrack, size: 50, y: 77, color: '#e9f3ce', animation: 'none', origin: 'auto', lyricStyleVersion: undefined })
    if (mode !== 'pinyin') generated.push({ ...source, id: `${source.id}-vietnamese`, text: wrapCaption((translations?.[index] ?? '').trim(), 30), track: vietnameseTrack, size: 58, y: 87, color: '#ffffff', animation: 'none', origin: 'auto', lyricStyleVersion: undefined })
  }
  return generated
}

// Updating wording must not reset the user's track, colour, font or placement.
export function mergeBilingualCaptions(current: Caption[], generated: Caption[], aspectRatio: AspectRatio = '9:16') {
  const oldById = new Map(current.map(caption => [caption.id, caption]))
  const replacement = new Map(generated.map(caption => {
    const old = oldById.get(caption.id)
    return [caption.id, old ? { ...old, text: caption.text, start: caption.start, duration: caption.duration, sourceClipId: caption.sourceClipId } : caption] as const
  }))
  const merged = [...current.map(caption => replacement.get(caption.id) ?? caption), ...generated.filter(caption => !oldById.has(caption.id))]
  const styled = applyProfessionalLyricStyle(merged)
  const mergedById = new Map(merged.map(caption => [caption.id, caption]))
  // Keep old/custom positions. A newly added language must be positioned
  // against those actual positions, not a reflow that wasn't applied to them.
  const result = styled.map(caption => oldById.has(caption.id) ? mergedById.get(caption.id)! : caption)
  const byId = new Map(result.map(caption => [caption.id, caption]))
  const designHeight = aspectRatio === '16:9' ? 1080 : 1920
  const halfHeight = (caption: Caption) => {
    const scale = aspectRatio === '9:16' && !caption.lyricStyleVersion && !caption.creatorStyleId ? 1080 / 1920 : 1
    return (lyricDisplayText(caption).split('\n').length * caption.size * (caption.lyricStyleVersion ? 1.12 : 1.08) + 10) * scale / designHeight * 50
  }
  const gap = 11 / designHeight * 100
  for (const added of generated) {
    if (oldById.has(added.id)) continue
    const role = lyricRole(added)
    const rootId = added.id.replace(/-(?:pinyin|vietnamese)$/, '')
    const root = byId.get(rootId)
    if (!root || role === 'chinese') continue
    const caption = byId.get(added.id)!
    const anchor = role === 'vietnamese' ? byId.get(`${rootId}-pinyin`) ?? root : root
    const height = halfHeight(caption)
    const desired = anchor.y + halfHeight(anchor) + gap + height
    const peers = [root, byId.get(`${rootId}-pinyin`), byId.get(`${rootId}-vietnamese`)]
      .filter((peer): peer is Caption => Boolean(peer && peer.id !== caption.id))
      .filter(peer => oldById.has(peer.id) || lyricRole(peer) === 'chinese' || (lyricRole(peer) === 'pinyin' && role === 'vietnamese'))
      .map(peer => ({ start: peer.y - halfHeight(peer) - gap, end: peer.y + halfHeight(peer) + gap }))
      .sort((a, b) => a.start - b.start)
    const candidates: number[] = []
    let cursor = 4
    for (const interval of [...peers, { start: 96, end: 96 }]) {
      if (interval.start - cursor >= height * 2) candidates.push(Math.max(cursor + height, Math.min(interval.start - height, desired)))
      cursor = Math.max(cursor, interval.end)
    }
    if (!candidates.length) continue // Over-sized/custom layouts remain editable.
    const y = candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0]
    byId.set(caption.id, { ...caption, x: anchor.x, y })
  }
  return result.map(caption => byId.get(caption.id)!)
}
