import type { Caption } from './short-video.ts'
import { lyricDisplayText } from './bilingual-captions.ts'

export type CaptionFrame = { caption: Caption; opacity?: number; y?: number; scale?: number; clipBand?: [number, number] }
type Row = { caption: Caption; children: Caption[]; offset: number; top: number; bottom: number }
type Transition = { index: number; begin: number; end: number }
type LyricGroup = { rows: Row[]; transitions: Transition[]; height: number }
const cache = new WeakMap<Caption[], { groups: LyricGroup[]; ordinary: Caption[] }>()
const derived = (caption: Caption) => /-(?:pinyin|vietnamese)$/.test(caption.id)
const rootId = (caption: Caption) => caption.id.replace(/-(?:pinyin|vietnamese)$/, '')
const active = (caption: Caption, time: number) => time >= caption.start && time < caption.start + caption.duration
const clamp = (value: number) => Math.max(0, Math.min(1, value))
// C2 easing: no sudden change in velocity or acceleration at either end.
const smooth = (value: number) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10) }
const lerp = (a: number, b: number, progress: number) => a + (b - a) * progress
const boxCache = new WeakMap<Caption, { height: number; half: number }>()
function halfHeight(caption: Caption, height: number) {
  const existing = boxCache.get(caption)
  if (existing?.height === height) return existing.half
  const half = (lyricDisplayText(caption).split('\n').length * caption.size * (caption.lyricStyleVersion ? 1.12 : 1.08) + 10) / height * 50
  boxCache.set(caption, { height, half })
  return half
}

function lyricGroups(captions: Caption[]) {
  const existing = cache.get(captions)
  if (existing) return existing
  const roots = new Map<string, Caption[]>(), children = new Map<string, Caption[]>(), handled = new Set<string>()
  for (const caption of captions) {
    if (caption.creatorTitle || !caption.lyricPresentation || !Number.isFinite(caption.start) || !Number.isFinite(caption.duration) || caption.duration <= 0) continue
    if (derived(caption)) { const id = rootId(caption); children.set(id, [...children.get(id) ?? [], caption]); continue }
    const key = `${caption.sourceClipId ?? 'manual'}:${caption.track ?? 0}`
    roots.set(key, [...roots.get(key) ?? [], caption])
  }
  const groups = Array.from(roots.values()).map(captions => {
    captions.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))
    const height = captions[0].creatorStyleId?.endsWith('-wide') ? 1080 : 1920
    const rows: Row[] = []
    for (const caption of captions) {
      const secondary = children.get(caption.id) ?? [], group = [caption, ...secondary]
      handled.add(caption.id); secondary.forEach(child => handled.add(child.id))
      const top = Math.min(...group.map(c => c.y - caption.y - halfHeight(c, height)))
      const bottom = Math.max(...group.map(c => c.y - caption.y + halfHeight(c, height)))
      const previous = rows.at(-1)
      // Local bounds: one long line no longer inflates every stride in the song.
      const offset = previous ? previous.offset + Math.max(14, previous.bottom - top + 4) : 0
      rows.push({ caption, children: secondary, offset, top, bottom })
    }
    const transitions = rows.slice(1).map((row, i) => {
      const before = row.caption.start - rows[i].caption.start
      const after = rows[i + 2] ? rows[i + 2].caption.start - row.caption.start : row.caption.duration
      // Anticipate, then settle gently. These windows never overlap, including
      // rapid short lyrics where the old fixed tween would reset mid-motion.
      return { index: i + 1, begin: row.caption.start - Math.min(.45, before * .25), end: row.caption.start + Math.min(.8, after * .45, row.caption.duration * .65) }
    })
    return { rows, transitions, height }
  })
  const value = { groups, ordinary: captions.filter(caption => !handled.has(caption.id)) }
  cache.set(captions, value)
  return value
}

function lastBefore<T>(items: T[], time: number, timestamp: (item: T) => number) {
  let lo = 0, hi = items.length
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (timestamp(items[mid]) <= time) lo = mid + 1; else hi = mid }
  return lo - 1
}

export function lyricFocusTime(captions: Caption[], caption: Caption) {
  const id = rootId(caption)
  for (const group of lyricGroups(captions).groups) {
    const index = group.rows.findIndex(row => row.caption.id === id)
    if (index >= 0) return index ? group.transitions[index - 1].end : caption.start + Math.min(.45, caption.duration / 2)
  }
  return caption.start
}

// Stateless timestamp-driven ribbon: playback, seeks and export are identical.
// Neighbors are virtual frames, never extra clips or altered source timestamps.
export function resolveCaptionFrames(captions: Caption[], time: number, hidden: (caption: Caption) => boolean = () => false): CaptionFrame[] {
  if (!Number.isFinite(time)) return []
  const frames: CaptionFrame[] = [], { groups, ordinary } = lyricGroups(captions)
  for (const { rows, transitions, height } of groups) {
    const first = rows[0].caption, last = rows.at(-1)!.caption, songEnd = last.start + last.duration
    const mode = first.lyricPresentation
    const viewport = first.lyricViewport
    const [bandTop, bandBottom] = Array.isArray(viewport) && viewport.length === 2 && viewport.every(v => Number.isFinite(v) && v >= 0 && v <= 100) && viewport[0] < viewport[1] ? viewport : [24, 88]
    if (time < first.start - .45 || time >= songEnd) continue
    const transition = transitions[lastBefore(transitions, time, t => t.begin)]
    const index = transition?.index ?? 0
    const progress = transition ? smooth((time - transition.begin) / Math.max(.001, transition.end - transition.begin)) : 1
    const previous = rows[Math.max(0, index - 1)], current = rows[index]
    const anchor = transition ? index - 1 + progress : 0
    const offset = transition ? lerp(previous.offset, current.offset, progress) : 0
    const center = transition ? lerp(previous.caption.y, current.caption.y, progress) : first.y
    const sungIndex = Math.max(0, lastBefore(rows, time, row => row.caption.start))
    const sung = rows[sungIndex].caption, next = rows[sungIndex + 1]?.caption, before = rows[sungIndex - 1]?.caption
    const end = sung.start + sung.duration
    const tail = !next || next.start > end + .02 ? .2 + .8 * smooth((end - time) / Math.min(.55, sung.duration * .3)) : 1
    const entryDuration = Math.min(.45, sung.duration * .65, next ? Math.max(.01, (next.start - sung.start) * .65) : .45)
    const entrance = !before || sung.start > before.start + before.duration + .02 ? .2 + .8 * smooth((time - sung.start) / entryDuration) : 1
    const master = (time < first.start ? .2 * smooth((time - first.start + .45) / .45) : tail * entrance) * smooth((songEnd - time) / Math.min(.35, last.duration * .35))
    const push = (caption: Caption, y: number, opacity: number, scale = 1) => {
      const half = halfHeight(caption, height)
      // Fade while the text box leaves the band, not while it is still fully
      // inside; otherwise the previous line becomes nearly invisible too soon.
      const edge = smooth((y + half - bandTop) / 8) * smooth((bandBottom - y + half) / 8)
      if (opacity * edge > .001 && !hidden(caption)) frames.push({ caption, y, opacity: opacity * edge, scale, clipBand: [bandTop, bandBottom] })
    }
    for (let i = Math.max(0, Math.floor(anchor) - 2); i <= Math.min(rows.length - 1, Math.ceil(anchor) + 2); i++) {
      const row = rows[i], distance = i - anchor
      const y = center + (row.offset - offset) * (mode === 'lyric-cards' ? .12 : mode === 'spotlight' ? .75 : 1)
      const reach = mode === 'lyric-cards' ? 1 - smooth(Math.abs(distance)) : 1 - smooth((Math.abs(distance) - 1.65) / 1.1)
      const emphasis = mode === 'lyric-cards' ? smooth(1 - Math.abs(distance)) : mode === 'spotlight' ? .055 + .945 * Math.exp(-distance * distance * 3.3) : .08 + .92 * Math.exp(-distance * distance * 2.6)
      const scale = mode === 'spotlight' ? .82 + .18 * Math.exp(-distance * distance * 2.2) : mode === 'lyric-cards' ? .94 + .06 * smooth(1 - Math.abs(distance)) : 1
      push(row.caption, y, emphasis * reach * master, scale)
      // Outgoing/incoming secondary text crossfades with its original row.
      // No hard unmount at the boundary; local strides avoid baseline overlap.
      const focus = smooth(1 - Math.abs(distance))
      if (focus > .001) for (const child of row.children) {
        const lead = .45, trail = .8
        const envelope = time < child.start ? smooth((time - child.start + lead) / lead) : time >= child.start + child.duration ? smooth((child.start + child.duration + trail - time) / trail) : 1
        push(child, y + child.y - row.caption.y, focus * envelope * master, scale)
      }
    }
  }
  for (const caption of ordinary) if (active(caption, time) && !hidden(caption)) frames.push({ caption })
  return frames.sort((a, b) => (a.opacity ?? 1) - (b.opacity ?? 1))
}
