import type { Caption, ShortTemplate } from './short-video.ts'

export type CreatorTitlePresetId = 'auto' | 'cinema' | 'editorial' | 'ink' | 'minimal' | 'pop' | 'outlined' | 'album' | 'studio'
export type CreatorTitleContent = { enabled: boolean; title: string; subtitle: string; design?: CreatorTitlePresetId }
type TitleDesign = {
  sample: string; label: string; font: string; weight: number; size: number; spacing: number
  align: 'left' | 'center'; x: number; y: number; color?: string; animation?: Caption['animation']
  background?: string; stroke?: string; strokeWidth?: number; eyebrowY?: number; subtitleY?: number
}
const serif = 'Noto Serif TC Variable'
export const CREATOR_TITLE_PRESETS: Array<{ id: CreatorTitlePresetId; name: string; description: string; design?: TitleDesign }> = [
  { id: 'auto', name: 'Theo phong cách', description: 'Đồng bộ với thiết kế video' },
  { id: 'cinema', name: 'Cinema Serif', description: 'Điện ảnh · thanh lịch', design: { sample: 'A Quiet Film', label: 'AN ORIGINAL LYRIC FILM', font: serif, weight: 500, size: 164, spacing: 5, align: 'center', x: 50, y: 41, animation: 'fade' } },
  { id: 'editorial', name: 'Editorial Cover', description: 'Bìa tạp chí · tối giản', design: { sample: 'After Hours', label: 'SOUND JOURNAL / VOL. 01', font: 'Manrope Variable', weight: 800, size: 162, spacing: -4, align: 'left', x: 12, y: 42, animation: 'slide' } },
  { id: 'ink', name: 'Ink Poetry · 墨', description: 'Hoa ngữ · thơ ca', design: { sample: '声之旅', label: '听见 / A JOURNEY IN SOUND', font: serif, weight: 400, size: 174, spacing: 14, align: 'center', x: 50, y: 42, animation: 'fade' } },
  { id: 'minimal', name: 'Quiet Minimal', description: 'Chữ mảnh · khoảng thở', design: { sample: 'Still / Here', label: 'A MOMENT IN MUSIC', font: 'Inter Variable', weight: 300, size: 136, spacing: 7, align: 'center', x: 50, y: 42, animation: 'fade' } },
  { id: 'pop', name: 'Bold Pop', description: 'Nổi bật · nhịp hiện đại', design: { sample: 'NEW WAVE', label: 'TURN UP / FEEL EVERYTHING', font: 'Montserrat Variable', weight: 900, size: 174, spacing: -4, align: 'left', x: 12, y: 42, animation: 'pop' } },
  { id: 'outlined', name: 'Outline Contrast', description: 'Nét viền · đồ họa', design: { sample: 'NIGHT DRIVE', label: 'SOUND / AFTER DARK', font: 'Sora Variable', weight: 800, size: 164, spacing: 1, align: 'center', x: 50, y: 42, strokeWidth: 3, animation: 'slide' } },
  { id: 'album', name: 'Album Label', description: 'Nhãn album · gọn đẹp', design: { sample: 'SIDE A', label: 'RECORDS / ORIGINAL SESSION', font: 'Plus Jakarta Sans Variable', weight: 700, size: 146, spacing: 2, align: 'left', x: 12, y: 43, background: '#10141ed9', color: '#f6f2e9', animation: 'fade' } },
  { id: 'studio', name: 'Studio Session', description: 'Live session · chuyên nghiệp', design: { sample: 'Live Sessions', label: 'STUDIO / LIVE TAKE', font: 'Be Vietnam Pro', weight: 600, size: 150, spacing: -1, align: 'center', x: 50, y: 42, animation: 'fade' } },
]
export function isCreatorTitlePreset(value: unknown): value is CreatorTitlePresetId { return CREATOR_TITLE_PRESETS.some(preset => preset.id === value) }
const DESIGNS: Record<string, TitleDesign> = {
  'creator-handmade-pressed-botanical': { sample: 'Pressed Flowers', label: 'BOTANICAL / HANDMADE SESSION', font: serif, weight: 500, size: 150, spacing: 6, align: 'center', x: 50, y: 49 },
  'creator-handmade-indigo-cyanotype': { sample: 'Indigo Memory', label: 'CYANOTYPE / AN ANALOG SONG', font: serif, weight: 500, size: 148, spacing: 5, align: 'center', x: 50, y: 49 },
  'creator-handmade-embroidered-starlight': { sample: 'Starlight', label: 'THREAD & MOON / LYRIC FILM', font: serif, weight: 500, size: 152, spacing: 7, align: 'center', x: 50, y: 49 },
  'creator-handmade-torn-paper-sunset': { sample: 'Golden Paper', label: 'PAPER SUNSET / HANDMADE STORIES', font: 'Be Vietnam Pro', weight: 600, size: 150, spacing: 2, align: 'center', x: 50, y: 49 },
  'creator-handmade-ceramic-mosaic': { sample: 'Sea of Tiles', label: 'MOSAIC / A HANDMADE MELODY', font: 'Manrope Variable', weight: 650, size: 148, spacing: 3, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-tianshan': { sample: '天山 / Thiên Sơn', label: 'TIANSHAN / A PAINTED JOURNEY', font: serif, weight: 500, size: 154, spacing: 6, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-ili': { sample: '伊犁 / Ili', label: 'ILI / SONGS FROM THE STEPPE', font: serif, weight: 500, size: 150, spacing: 5, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-kanas': { sample: '喀纳斯 / Kanas', label: 'KANAS / AUTUMN WATERCOLOR', font: serif, weight: 500, size: 152, spacing: 7, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-turpan': { sample: '吐鲁番 / Turpan', label: 'TURPAN / OASIS SKETCHBOOK', font: serif, weight: 500, size: 150, spacing: 6, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-girl-ili': { sample: '伊犁 / A Quiet Song', label: 'ILI / A HAND-PAINTED PORTRAIT', font: serif, weight: 500, size: 150, spacing: 6, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-girl-kashgar': { sample: '喀什 / Old Town', label: 'KASHGAR / WATERCOLOR STORIES', font: serif, weight: 500, size: 148, spacing: 5, align: 'center', x: 50, y: 49 },
  'creator-xinjiang-girl-kanas': { sample: '喀纳斯 / Autumn', label: 'KANAS / BESIDE THE BLUE LAKE', font: serif, weight: 500, size: 152, spacing: 7, align: 'center', x: 50, y: 49 },
  'creator-prism-rain': { sample: 'PRISM / RAIN', label: 'AFTER DARK / LYRIC SESSION', font: 'Sora Variable', weight: 800, size: 150, spacing: 1, align: 'center', x: 50, y: 13, animation: 'slide' },
  'creator-paper-moon': { sample: '紙月 / Paper Moon', label: 'PAPER MOON / SOUND IN LIGHT', font: serif, weight: 450, size: 156, spacing: 8, align: 'center', x: 50, y: 13, animation: 'fade' },
  'creator-metro-nocturne': { sample: '夜行 / Nocturne', label: 'METRO / A NIGHT SONG', font: serif, weight: 500, size: 148, spacing: 4, align: 'center', x: 50, y: 13, animation: 'fade' },
  'creator-marine-ink': { sample: '海墨 / Marine Ink', label: 'THE BLUE / A LYRIC FILM', font: serif, weight: 500, size: 150, spacing: 6, align: 'center', x: 50, y: 13, animation: 'fade' },
  'creator-moonlit-muse': { sample: '月影 / Moonlit', label: 'MOONLIT / A SILVER SESSION', font: serif, weight: 400, size: 150, spacing: 8, align: 'center', x: 50, y: 46 },
  'creator-jade-silk-muse': { sample: '翠 / Jade Silk', label: 'JADE SILK / LYRIC PORTRAITS', font: serif, weight: 500, size: 150, spacing: 10, align: 'center', x: 50, y: 46 },
  'creator-burgundy-muse': { sample: 'Velvet Nights', label: 'BURGUNDY / THE VELVET SESSION', font: serif, weight: 600, size: 150, spacing: 3, align: 'center', x: 50, y: 46 },
  'creator-rose-haze-muse': { sample: 'Rose Haze', label: 'ROSE HAZE / SOFT MELODIES', font: 'Manrope Variable', weight: 500, size: 150, spacing: -1, align: 'center', x: 50, y: 46 },
  'creator-noir-film-muse': { sample: '黑白 / Noir Film', label: 'NOIR FILM / ANALOG MEMORIES', font: serif, weight: 400, size: 150, spacing: 5, align: 'center', x: 50, y: 46 },
  'creator-pearl-muse': { sample: 'Pearl Atelier', label: 'PEARL ATELIER / A QUIET RECORD', font: 'Inter Variable', weight: 300, size: 150, spacing: 7, align: 'center', x: 50, y: 46 },
  'creator-copper-muse': { sample: 'Copper Dusk', label: 'COPPER DUSK / AUTUMN JOURNAL', font: 'Manrope Variable', weight: 600, size: 150, spacing: -3, align: 'center', x: 50, y: 46 },
  'creator-lilac-muse': { sample: 'Lilac Dream', label: 'LILAC DREAM / SOUND IN SATIN', font: 'Plus Jakarta Sans Variable', weight: 600, size: 150, spacing: 2, align: 'center', x: 50, y: 46 },
  'creator-midnight-muse': { sample: '夜色 / Midnight', label: 'MUSE / THE MIDNIGHT SESSION', font: serif, weight: 500, size: 150, spacing: 6, align: 'center', x: 50, y: 46 },
  'creator-riviera-muse': { sample: 'Golden Hour', label: 'RIVIERA / ACOUSTIC JOURNAL', font: 'Manrope Variable', weight: 600, size: 148, spacing: -2, align: 'center', x: 50, y: 46 },
  'creator-neon-muse': { sample: 'NEON / 霓虹', label: 'MUSE / AFTER DARK', font: 'Sora Variable', weight: 750, size: 152, spacing: 1, align: 'center', x: 50, y: 46 },
  'creator-celestial-opera': { sample: '月光 / Moonlight', label: 'CELESTIAL / SPECIAL EDITION', font: serif, weight: 400, size: 160, spacing: 9, align: 'center', x: 50, y: 13 },
  'creator-botanical-nocturne': { sample: 'Nocturne', label: 'BOTANICAL / SOUND IN BLOOM', font: serif, weight: 500, size: 148, spacing: 4, align: 'center', x: 50, y: 13 },
  'creator-chrome-dream': { sample: 'CHROME DREAM', label: 'CHROME / EXPERIMENTAL SESSION', font: 'Plus Jakarta Sans Variable', weight: 700, size: 146, spacing: -1, align: 'center', x: 50, y: 13 },
  'creator-jade': { sample: '北方', label: '玉色 / LYRIC ATELIER', font: serif, weight: 500, size: 174, spacing: 12, align: 'center', x: 50, y: 41 },
  'creator-vermilion': { sample: '光与声', label: 'SOUND IN COLOR / 朱', font: 'Sora Variable', weight: 750, size: 160, spacing: -3, align: 'left', x: 13, y: 42, animation: 'slide' },
  'creator-porcelain': { sample: '听见风', label: '瓷 / A QUIET MELODY', font: serif, weight: 500, size: 156, spacing: 8, align: 'center', x: 50, y: 41 },
  'creator-noir': { sample: 'After Hours', label: 'AN EDITORIAL LYRIC FILM', font: serif, weight: 500, size: 144, spacing: 3, align: 'center', x: 50, y: 42 },
  'creator-terracotta': { sample: 'Soft Forms', label: 'GALLERY / SOUND & FORM', font: 'Manrope Variable', weight: 600, size: 146, spacing: -3, align: 'left', x: 13, y: 43 },
  'creator-mist': { sample: 'Stillwater', label: 'NORDIC / SOUND JOURNAL', font: 'Inter Variable', weight: 400, size: 142, spacing: 4, align: 'center', x: 50, y: 41 },
  'creator-aurora': { sample: 'In Bloom', label: 'AURORA / MUSIC IN MOTION', font: 'Plus Jakarta Sans Variable', weight: 650, size: 154, spacing: -2, align: 'center', x: 50, y: 42 },
  'creator-cobalt': { sample: 'New Wave', label: 'VOLUME / COBALT', font: 'Montserrat Variable', weight: 800, size: 160, spacing: -3, align: 'left', x: 13, y: 40, animation: 'slide' },
  'lyric-midnight': { sample: 'Giữa đêm', label: 'MIDNIGHT / A LYRIC FILM', font: 'Sora Variable', weight: 600, size: 150, spacing: -2, align: 'center', x: 50, y: 42 },
  'lyric-sunrise': { sample: 'Ngày mới', label: 'SUNRISE / A LYRIC FILM', font: serif, weight: 500, size: 152, spacing: 3, align: 'center', x: 50, y: 42 },
}
export function creatorTitleDesign(template: ShortTemplate, preset: CreatorTitlePresetId = 'auto'): TitleDesign {
  const selected = CREATOR_TITLE_PRESETS.find(item => item.id === preset)?.design
  const design = selected ?? DESIGNS[template.id] ?? DESIGNS[template.id.replace(/-wide$/, '')] ?? DESIGNS[template.creator?.baseStyleId ?? template.id] ?? DESIGNS['lyric-midnight']
  if (template.creator?.lyricPresentation) {
    const portrait = template.creator.collection === 'portrait'
    const painted = template.creator.collection === 'handmade' || template.creator.collection === 'xinjiang'
    return { ...design, size: template.ratio === '16:9' ? 44 : 56, spacing: design.spacing * .4, x: 50, align: 'center', y: painted ? 49 : portrait ? 46 : 13, eyebrowY: painted ? 43 : portrait ? 41 : 6, subtitleY: painted ? 56 : portrait ? 50 : 20 }
  }
  return template.ratio === '16:9' ? { ...design, size: Math.round(design.size * 0.84), spacing: design.spacing * 0.8, x: design.align === 'left' ? 10 : 50, y: 42, eyebrowY: 21, subtitleY: 63 } : design
}
export function audioTitle(filename: string) {
  return filename.replace(/\.(mp3|m4a|wav|flac|ogg|aac|aiff|opus|wma)$/i, '').replace(/_/g, ' ').trim() || 'Untitled'
}
export function resolveCreatorTitle(content: CreatorTitleContent, filename: string): CreatorTitleContent {
  return { enabled: content.enabled, title: (content.title.trim() || audioTitle(filename)).slice(0, 100), subtitle: content.subtitle.trim().slice(0, 100), ...(isCreatorTitlePreset(content.design) ? { design: content.design } : {}) }
}

// Conservative advance estimates keep long titles inside the safe area without
// depending on a browser or font loading. Real drawing uses identical text below.
export function fitCreatorTitle(text: string, preferredSize: number, spacing: number, width = 790) {
  const tokens = text.trim().replace(/\s+/g, ' ').match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+| /gu) ?? []
  const advance = (value: string, size: number) => Array.from(value).reduce((sum, char) => sum + (/[\u3400-\u9fff]/u.test(char) ? 1.05 : char === ' ' ? 0.34 : /[MW@]/u.test(char) ? 1 : 0.78) * size + spacing, 0)
  let size = preferredSize
  // Keep ordinary words whole (e.g. Stillwater), reducing their display size
  // before resorting to character breaks for exceptionally long filenames.
  while (size > 18 && tokens.some(token => token.trim() && advance(token, size) > width)) size = Math.max(18, size - 4)
  let lines: string[] = []
  for (;;) {
    lines = ['']
    for (const token of tokens) {
      // Break an unspaced filename/word as a last resort, never cut its content.
      const parts = advance(token, size) > width ? Array.from(token) : [token]
      for (const part of parts) {
        const current = lines.at(-1)!
        if (current && advance(current + part, size) > width) lines.push(part.trimStart())
        else lines[lines.length - 1] = current + part
      }
    }
    lines = lines.map(line => line.trim()).filter(Boolean)
    if (lines.length <= 3 || size <= 18) break
    size = Math.max(18, size - 4)
  }
  return { text: lines.join('\n'), size }
}

export const TITLE_ROLES = ['heading', 'subtitle', 'eyebrow'] as const
export function createCreatorTitles(template: ShortTemplate, content: CreatorTitleContent, duration: number, audioClipId: string, firstTrack: number, start = 0): Caption[] {
  if (!content.enabled || !content.title.trim() || !Number.isFinite(duration) || duration <= 0) return []
  const design = creatorTitleDesign(template, content.design)
  const wide = template.ratio === '16:9'
  const width = wide ? 1450 : 790
  const title = fitCreatorTitle(content.title, design.size, design.spacing, width)
  title.size = Math.min(title.size, (wide ? 250 : 430) / (title.text.split('\n').length * 1.08))
  const scrolling = Boolean(template.creator?.lyricPresentation)
  const detail = fitCreatorTitle(content.subtitle, scrolling ? wide ? 18 : 22 : wide ? 28 : 32, 1.8, width)
  const hasHan = /[\u3400-\u9fff]/u.test(content.title)
  const font = hasHan && design.font !== serif ? 'Noto Sans TC' : design.font
  const opening = Math.min(6, duration / 3)
  const closing = Math.min(4, duration / 3)
  const align = design.align
  const caption = (role: Caption['creatorTitle'], phase: Caption['creatorTitlePhase'], from: number, length: number, text: string, options: Partial<Caption>): Caption => ({
    id: `${audioClipId}-title-${phase}-${role}`, text, start: start + from, duration: length,
    track: firstTrack + TITLE_ROLES.indexOf(role!), font, fontWeight: design.weight, letterSpacing: design.spacing,
    textAlign: align, size: title.size, color: design.color ?? template.caption.color, x: design.x, y: design.y,
    shadow: template.caption.shadow ?? true, background: design.background, stroke: design.stroke ?? template.accent, strokeWidth: design.strokeWidth ?? 0, animation: design.animation ?? 'fade',
    origin: 'template', sourceClipId: audioClipId, creatorStyleId: template.id, creatorTitleDesignId: content.design ?? 'auto', creatorTitle: role, creatorTitlePhase: phase, ...options,
  })
  const result: Caption[] = []
  for (const [phase, from, length] of [['opening', 0, opening], ['closing', duration - closing, closing]] as const) {
    result.push(caption('heading', phase, from, length, title.text, {}))
    result.push(caption('eyebrow', phase, from, length, design.label, { font: template.creator?.latinFont ?? 'Inter Variable', size: 22, fontWeight: 600, letterSpacing: 2.8, y: design.eyebrowY ?? 22, color: template.id === 'creator-vermilion' ? template.caption.color : template.accent, background: undefined, strokeWidth: 0 }))
    if (detail.text) result.push(caption('subtitle', phase, from, length, detail.text, { font: template.creator?.latinFont ?? 'Inter Variable', size: detail.size, fontWeight: 500, letterSpacing: 1.8, y: design.subtitleY ?? 58, color: template.caption.color, background: undefined, strokeWidth: 0 }))
  }
  if (duration > opening + closing) {
    const signature = fitCreatorTitle(content.title, wide ? 32 : 44, 1.5, width)
    result.push(caption('heading', 'signature', opening, duration - opening - closing, signature.text, { size: signature.size, fontWeight: 500, letterSpacing: 1.5, y: template.creator?.collection === 'portrait' ? 46 : template.creator?.collection === 'handmade' || template.creator?.collection === 'xinjiang' ? 49 : wide ? 10 : 13, animation: 'fade', background: undefined, strokeWidth: 0, color: template.caption.color }))
  }
  return result
}

export function restyleCreatorTitles(template: ShortTemplate, content: CreatorTitleContent, duration: number, audioClipId: string, firstTrack: number, start: number, previous: Caption[]) {
  const old = previous.filter(caption => caption.creatorTitle && caption.sourceClipId === audioClipId)
  const oldTitle = old.find(caption => caption.creatorTitle === 'heading' && caption.creatorTitlePhase === 'opening')?.text.replace(/\n/g, ' ')
  const oldSubtitle = old.find(caption => caption.creatorTitle === 'subtitle')?.text.replace(/\n/g, ' ')
  const normalize = (value: string | undefined) => value?.replace(/\s+/g, '')
  return createCreatorTitles(template, content, duration, audioClipId, firstTrack, start).map(caption => {
    const existing = old.find(item => item.id === caption.id)
    if (!existing) return caption
    const unchanged = caption.creatorTitle === 'heading' ? normalize(oldTitle) === normalize(content.title) : caption.creatorTitle === 'subtitle' ? normalize(oldSubtitle) === normalize(content.subtitle) : false
    return { ...caption, start: existing.start, duration: existing.duration, track: existing.track,
      // Refit opening/closing line breaks to the new design and aspect ratio.
      // A hand-edited signature is separate from the song title; keep its words.
      ...(unchanged && caption.creatorTitlePhase === 'signature' ? { text: existing.text } : {}) }
  })
}

// Use per-grapheme advances and disabled kerning for designed titles in both DOM
// and canvas. This also provides a fallback without Canvas letterSpacing support.
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
export function trackedTextLayout(text: string, measure: (glyph: string) => number, spacing: number) {
  const glyphs = Array.from(segmenter.segment(text), entry => entry.segment)
  let cursor = 0
  const positions = glyphs.map(glyph => { const x = cursor; cursor += measure(glyph) + spacing; return { glyph, x } })
  // CSS letter-spacing includes the final advance in the inline box. Keeping it
  // here makes center/right anchors line up with the preview's actual box.
  return { positions, width: Math.max(0, cursor) }
}
