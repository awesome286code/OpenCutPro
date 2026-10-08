import { creatorArtworkSvg, type CreatorDirection } from './creator-styles.ts'
import { createCreatorTitles, type CreatorTitleContent } from './creator-titles.ts'

export type AspectRatio = '16:9' | '9:16' | '1:1'
export type LyricPresentation = 'scroll-fade' | 'spotlight' | 'lyric-cards'
export type Caption = {
  id: string; text: string; start: number; duration: number; color: string; font: string; size: number; x: number; y: number
  track?: number; stroke?: string; strokeWidth?: number; shadow?: boolean; background?: string
  animation?: 'none' | 'fade' | 'pop' | 'slide' | 'scroll'; sourceClipId?: string; origin?: 'auto' | 'template'
  lyricStyleVersion?: 1 | 2
  lyricPresentation?: LyricPresentation
  lyricViewport?: [number, number]
  creatorStyleId?: string
  creatorTitle?: 'heading' | 'subtitle' | 'eyebrow'
  creatorTitlePhase?: 'opening' | 'signature' | 'closing'
  creatorTitleDesignId?: string
  fontWeight?: number; letterSpacing?: number; textAlign?: 'left' | 'center' | 'right'
  opacity?: number; scale?: number; rotation?: number; animationInDuration?: number; animationOutDuration?: number
}
export type TranscriptSegment = { text: string; timestamp: [number, number | null] }
export type ShortTemplate = {
  id: string; name: string; category: string; description: string; accent: string; ratio: AspectRatio
  kind?: 'lyric'
  creator?: CreatorDirection
  scenes: Array<{ label: string; duration: number; text: string; lyrics?: string[] }>
  caption: Pick<Caption, 'color' | 'background' | 'size' | 'y' | 'animation' | 'stroke' | 'strokeWidth'> & Partial<Pick<Caption, 'font' | 'shadow'>>
  look: { brightness: number; contrast: number; saturation: number }
}
export const SHORT_TEMPLATES: ShortTemplate[] = [
  { id: 'daily-reel', name: 'Một ngày của tôi', category: 'Vlog', description: 'Mở đầu • Khoảnh khắc • Kết thúc', accent: '#c5f36b', ratio: '9:16',
    scenes: [{ label: 'Mở đầu', duration: 3, text: 'MỘT NGÀY\nCỦA TÔI' }, { label: 'Khoảnh khắc', duration: 6, text: 'Những điều nhỏ bé' }, { label: 'Kết thúc', duration: 3, text: 'Hẹn gặp lại ✨' }],
    caption: { color: '#ffffff', size: 165, y: 72, animation: 'fade', stroke: '#161616', strokeWidth: 2 }, look: { brightness: 104, contrast: 105, saturation: 110 } },
  { id: 'product-drop', name: 'Sản phẩm nổi bật', category: 'Bán hàng', description: 'Thu hút • Chi tiết • Kêu gọi hành động', accent: '#f7b76e', ratio: '9:16',
    scenes: [{ label: 'Sản phẩm', duration: 3, text: 'MỚI RA MẮT' }, { label: 'Điểm nổi bật', duration: 5, text: 'Thiết kế\ndành cho bạn' }, { label: 'Chi tiết', duration: 4, text: 'Khác biệt\ntừ chi tiết' }, { label: 'CTA', duration: 3, text: 'KHÁM PHÁ NGAY' }],
    caption: { color: '#ffffff', background: '#202020dd', size: 155, y: 70, animation: 'pop' }, look: { brightness: 102, contrast: 110, saturation: 100 } },
  { id: 'three-tips', name: '3 mẹo trong 20 giây', category: 'Kiến thức', description: 'Hook rõ ràng, từng ý dễ theo dõi', accent: '#a99cff', ratio: '9:16',
    scenes: [{ label: 'Hook', duration: 2, text: '3 MẸO BẠN\nNÊN BIẾT' }, { label: 'Mẹo 1', duration: 5, text: '01 · Bắt đầu\nđơn giản' }, { label: 'Mẹo 2', duration: 5, text: '02 · Làm đều\nmỗi ngày' }, { label: 'Mẹo 3', duration: 5, text: '03 · Theo dõi\ntiến bộ' }, { label: 'Kết', duration: 3, text: 'LƯU LẠI\nĐỂ THỬ NHÉ' }],
    caption: { color: '#f8f5ff', background: '#35285ddd', size: 145, y: 28, animation: 'slide' }, look: { brightness: 100, contrast: 103, saturation: 100 } },
  { id: 'travel-postcard', name: 'Chuyến đi đáng nhớ', category: 'Du lịch', description: 'Nhịp chậm, chữ sáng và tông ấm', accent: '#72d7df', ratio: '9:16',
    scenes: [{ label: 'Điểm đến', duration: 4, text: 'ĐI ĐỂ\nKHÁM PHÁ' }, { label: 'Phong cảnh', duration: 6, text: 'Một nơi\nthật khác' }, { label: 'Kỷ niệm', duration: 5, text: 'Mang kỷ niệm\nvề nhà' }],
    caption: { color: '#fff5da', size: 160, y: 76, animation: 'fade', stroke: '#232323', strokeWidth: 2 }, look: { brightness: 103, contrast: 105, saturation: 115 } },
  { id: 'lyric-midnight', name: 'Lời hát giữa đêm', category: 'Ca nhạc', kind: 'lyric', description: 'Dream pop · nền đêm tím · lời hát cuộn', accent: '#d5b8ff', ratio: '9:16',
    scenes: [
      { label: 'Dạo đầu', duration: 50, text: 'LỜI HÁT\nGIỮA ĐÊM', lyrics: ['Đêm chạm vào ô cửa', 'Một vì sao nghiêng qua', 'Em nghe thành phố thở', 'Trong tiếng mưa rất xa', 'Những con đường im lặng', 'Giữ dấu chân hôm qua', 'Một câu ca vừa đến', 'Làm lòng mình nở hoa'] },
      { label: 'Verse', duration: 50, text: 'CÂU CHUYỆN\nCỦA ĐÊM', lyrics: ['Ta đi qua ngày dài', 'Mang theo điều chưa nói', 'Ánh đèn như dòng sông', 'Trôi qua bờ môi vội', 'Nếu mai trời lại sáng', 'Xin giữ phút này thôi', 'Để lời ca ở lại', 'Bên hai ta không rời'] },
      { label: 'Điệp khúc', duration: 50, text: 'ĐIỆP KHÚC', lyrics: ['Cứ hát lên trong đêm', 'Cho giấc mơ còn sáng', 'Dẫu thế gian đổi thay', 'Ta vẫn nghe dịu dàng', 'Từng nhịp tim ngân lên', 'Như ánh sao lấp lánh', 'Cứ hát lên trong đêm', 'Để bình minh đến gần'] },
      { label: 'Kết', duration: 50, text: 'KHÉP LẠI\nMỘT ĐÊM', lyrics: ['Rồi mưa thôi trên mái', 'Trời hé một đường xanh', 'Những câu ca còn mãi', 'Trong ký ức an lành', 'Ta mỉm cười bước tiếp', 'Qua khúc quanh mong manh', 'Khi lời hát vừa khép', 'Ngày mới lại bắt đầu'] },
    ], caption: { color: '#fff7ff', size: 112, y: 69, animation: 'scroll', stroke: '#181025', strokeWidth: 3 }, look: { brightness: 100, contrast: 108, saturation: 115 } },
  { id: 'lyric-sunrise', name: 'Nắng qua ô cửa', category: 'Ca nhạc', kind: 'lyric', description: 'Acoustic · bình minh ấm · lời hát cuộn', accent: '#ffd18b', ratio: '9:16',
    scenes: [
      { label: 'Dạo đầu', duration: 55, text: 'NẮNG QUA\nÔ CỬA', lyrics: ['Nắng qua ô cửa nhỏ', 'Chạm nhẹ lên bàn tay', 'Một bản nhạc rất khẽ', 'Đưa em vào hôm nay', 'Lá ngoài hiên vừa thức', 'Gió mang hương mùa này', 'Mình ngồi nghe thời gian', 'Trôi dịu dàng như mây'] },
      { label: 'Verse', duration: 55, text: 'NGÀY RẤT XANH', lyrics: ['Ta đi qua phố cũ', 'Hàng cây nghiêng thật gần', 'Tiếng cười trong tách trà', 'Ấm hơn điều phân vân', 'Có đôi khi lạc hướng', 'Vẫn thấy trời trong ngần', 'Chỉ cần nghe em hát', 'Ngày bỗng hóa mùa xuân'] },
      { label: 'Điệp khúc', duration: 55, text: 'HÁT CÙNG\nBÌNH MINH', lyrics: ['Hát cùng bình minh nhé', 'Cho ánh sáng lên cao', 'Những giấc mơ bé nhỏ', 'Sẽ bay qua ngàn sao', 'Hát cùng bình minh nhé', 'Cho tim mình dạt dào', 'Mai dù xa tới mấy', 'Vẫn nhớ phút bên nhau'] },
      { label: 'Kết', duration: 55, text: 'MỘT NGÀY MỚI', lyrics: ['Chiều rơi trên vai áo', 'Nắng vẫn ở trong tim', 'Bài ca còn vang mãi', 'Qua bao mùa lặng im', 'Ta gửi lời cảm ơn', 'Cho những ngày dịu êm', 'Khi màn đêm vừa tới', 'Bình minh lại gọi tên'] },
    ], caption: { color: '#fff9e8', size: 112, y: 70, animation: 'scroll', stroke: '#30251e', strokeWidth: 3 }, look: { brightness: 104, contrast: 106, saturation: 112 } },
]

export function withTemplateLyrics(template: ShortTemplate, lines: string[]): ShortTemplate {
  if (template.kind !== 'lyric') return template
  const lyrics = lines.map(line => line.trim()).filter(Boolean)
  if (lyrics.length < template.scenes.length || lyrics.length > 80) throw new Error(`Nhập từ ${template.scenes.length} đến 80 câu lời hát, mỗi câu một dòng.`)
  let cursor = 0
  return { ...template, scenes: template.scenes.map((scene, index) => {
    const count = Math.floor(lyrics.length / template.scenes.length) + (index < lyrics.length % template.scenes.length ? 1 : 0)
    const updated = { ...scene, lyrics: lyrics.slice(cursor, cursor + count) }
    cursor += count
    return updated
  }) }
}

// The poster and the imported timeline scene use the same self-contained artwork.
// SVG keeps starter projects small, works offline, and can be rendered by canvas export.
export function createTemplateSceneSvg(template: ShortTemplate, sceneIndex: number) {
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || (!template.scenes[sceneIndex] && template.kind !== 'lyric')) throw new Error('Cảnh mẫu không tồn tại.')
  if (template.creator) return creatorArtworkSvg(template.creator, sceneIndex, template.ratio)
  const index = sceneIndex + 1
  const phase = sceneIndex % template.scenes.length
  const palettes: Record<string, Array<[string, string, string]>> = {
    'daily-reel': [['#514969', '#161d38', '#ffd6a0'], ['#436f82', '#132e42', '#f9dfb7'], ['#6c4c74', '#1c203b', '#f8bca3']],
    'product-drop': [['#624831', '#201d26', '#f5c486'], ['#4d384a', '#1b1927', '#eac1aa'], ['#51493d', '#171d24', '#e4d8b0'], ['#523b35', '#1e1b25', '#f7bd8c']],
    'three-tips': [['#55427b', '#19172f', '#c5b8ff'], ['#394a87', '#171b38', '#a4beff'], ['#75507d', '#21172e', '#f2b4ef'], ['#4d467a', '#171932', '#d6c6ff'], ['#575184', '#17172e', '#c7b9ff']],
    'travel-postcard': [['#33717c', '#142e3b', '#f6d7a2'], ['#315d79', '#102b43', '#cee4dd'], ['#56747e', '#18313d', '#f6c99a']],
    'lyric-midnight': [['#352d60', '#101327', '#d5b8ff'], ['#243554', '#11172d', '#a7bfff'], ['#503461', '#1c1732', '#edb6de'], ['#243950', '#0c1629', '#b7d6ff']],
    'lyric-sunrise': [['#ad725a', '#282c43', '#ffdaa0'], ['#ca8665', '#344152', '#ffe2aa'], ['#b77774', '#302d48', '#ffd5a3'], ['#bd885f', '#253c4d', '#ffebb5']],
  }
  const [top, bottom, accent] = (palettes[template.id] ?? palettes['daily-reel'])[sceneIndex % (palettes[template.id]?.length ?? 3)]
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#sky)"/><circle cx="${230 + ((index * 127) % 650)}" cy="${330 + ((sceneIndex * 85) % 650)}" r="490" fill="url(#glow)"/>`
  let artwork: string
  if (template.id === 'lyric-midnight') {
    const stars = Array.from({ length: 28 }, (_, i) => `<circle cx="${(i * 173 + index * 89) % 1040 + 20}" cy="${(i * 251 + index * 61) % 1130 + 40}" r="${i % 4 === 0 ? 3 : 1.5}" fill="#fff" opacity="${i % 3 === 0 ? '.65' : '.3'}"/>`).join('')
    artwork = `${stars}<circle cx="${690 - phase * 95}" cy="${365 + phase * 45}" r="185" fill="${accent}" opacity=".78"/><circle cx="${730 - phase * 95}" cy="${325 + phase * 45}" r="170" fill="${top}" opacity=".94"/><path d="M0 1290Q270 1180 540 1290T1080 1290v630H0Z" fill="#13182f" opacity=".78"/><path d="M0 1440Q270 1350 540 1440T1080 1440v480H0Z" fill="${bottom}"/><path d="M0 1570Q270 1480 540 1570T1080 1570M0 1690Q270 1600 540 1690T1080 1690" fill="none" stroke="${accent}" stroke-opacity=".2" stroke-width="4"/>`
  } else if (template.id === 'lyric-sunrise') {
    artwork = `<circle cx="${260 + phase * 180}" cy="${475 - phase * 32}" r="280" fill="${accent}" opacity=".94"/><circle cx="${260 + phase * 180}" cy="${475 - phase * 32}" r="390" fill="none" stroke="${accent}" stroke-opacity=".2" stroke-width="4"/><path d="M0 1170 255 930 445 1130 735 810 1080 1160v760H0Z" fill="#48535f" opacity=".52"/><path d="M0 1300Q260 1220 540 1310T1080 1270v650H0Z" fill="${bottom}" opacity=".93"/><path d="M0 1460Q240 1370 540 1470T1080 1430v490H0Z" fill="#1e3141" opacity=".82"/><path d="M85 1690Q540 1560 995 1690M145 1770Q540 1650 935 1770" fill="none" stroke="${accent}" stroke-opacity=".25" stroke-width="6"/>`
  } else if (template.id === 'product-drop') {
    artwork = `<ellipse cx="540" cy="1515" rx="420" ry="95" fill="#000" opacity=".22"/><rect x="145" y="1320" width="790" height="170" rx="38" fill="${accent}" opacity=".18"/><rect x="235" y="1200" width="610" height="160" rx="36" fill="#fff" opacity=".12"/><rect x="${355 + sceneIndex * 12}" y="545" width="365" height="655" rx="76" fill="#f9f5ed" opacity=".94"/><rect x="${380 + sceneIndex * 12}" y="585" width="315" height="520" rx="53" fill="${top}" opacity=".82"/><circle cx="540" cy="750" r="118" fill="${accent}" opacity=".6"/><rect x="447" y="1130" width="185" height="28" rx="14" fill="${accent}" opacity=".7"/><path d="M190 340h700M240 390h600" stroke="${accent}" stroke-width="2" opacity=".35"/>`
  } else if (template.id === 'three-tips') {
    artwork = `<circle cx="540" cy="880" r="395" fill="none" stroke="${accent}" stroke-width="2" opacity=".4"/><circle cx="540" cy="880" r="290" fill="none" stroke="${accent}" stroke-width="2" opacity=".22"/><rect x="145" y="610" width="790" height="565" rx="54" fill="#fff" opacity=".065"/><text x="540" y="1080" text-anchor="middle" font-family="Arial,sans-serif" font-size="460" font-weight="800" fill="${accent}" opacity=".26">${String(index).padStart(2, '0')}</text><path d="M90 1350h900M90 1390h630M90 1430h780" stroke="${accent}" stroke-width="3" opacity=".24"/>`
  } else if (template.id === 'travel-postcard') {
    artwork = `<circle cx="${265 + sceneIndex * 245}" cy="430" r="205" fill="${accent}" opacity=".9"/><path d="M0 1150 315 730 545 1080 745 695 1080 1190v730H0Z" fill="#1d4b57" opacity=".8"/><path d="M0 1280 260 920 530 1300 840 860 1080 1240v680H0Z" fill="${top}" opacity=".82"/><path d="M0 1390Q280 1310 540 1390T1080 1390v530H0Z" fill="${bottom}"/><path d="M0 1550Q280 1470 540 1550T1080 1550M0 1630Q280 1550 540 1630T1080 1630" fill="none" stroke="${accent}" stroke-width="7" opacity=".25"/>`
  } else {
    artwork = `<circle cx="${250 + sceneIndex * 275}" cy="430" r="220" fill="${accent}" opacity=".86"/><path d="M0 1190 285 850 590 1240 820 950 1080 1200v720H0Z" fill="#273452" opacity=".8"/><path d="M0 1400 240 1210 450 1390 760 1160 1080 1350v570H0Z" fill="${bottom}" opacity=".85"/><path d="M120 1610V1390h90v220m40 0v-360h105v360m38 0v-270h96v270m225 0v-330h108v330m28 0v-190h95v190" fill="${accent}" opacity=".13"/>`
  }
  return `${base}${artwork}<rect x="52" y="56" width="976" height="1808" rx="36" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3"/></svg>`
}

export function templateSceneDataUrl(template: ShortTemplate, sceneIndex: number) {
  if (template.creator?.artworkImage) return template.creator.artworkImage
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createTemplateSceneSvg(template, sceneIndex))}`
}

// Import the actual generated raster into IndexedDB, never an external-image SVG.
// Blob media remains usable after reload or exporting a project with its files.
export async function loadTemplateSceneBlob(template: ShortTemplate, sceneIndex: number) {
  const image = template.creator?.artworkImage
  if (!image) return new Blob([createTemplateSceneSvg(template, sceneIndex)], { type: 'image/svg+xml' })
  if (!/^\/creator-artwork\/[a-z-]+\.png$/.test(image)) throw new Error('Đường dẫn ảnh template không hợp lệ.')
  const response = await fetch(image)
  if (!response.ok) throw new Error(`Không tải được ảnh nền ${template.name}. Project hiện tại chưa thay đổi.`)
  const blob = await response.blob()
  if (!blob.size || !blob.type.startsWith('image/')) throw new Error('File ảnh nền template không hợp lệ.')
  return blob
}

export function isAspectRatio(value: unknown): value is AspectRatio { return value === '16:9' || value === '9:16' || value === '1:1' }
export function exportDimensions(preset: string, ratio: AspectRatio) {
  const edge = preset === '2k' ? 1440 : preset === '1080p' ? 1080 : preset === '720p' ? 720 : 540
  return ratio === '9:16' ? { width: edge, height: Math.round(edge * 16 / 9) } : ratio === '1:1' ? { width: edge, height: edge } : { width: Math.round(edge * 16 / 9), height: edge }
}

export function createTemplateSequence(template: ShortTemplate, media: Array<{ id: string; type: string; duration: number }>, start: number, track: number, textTrack: number, id: string) {
  if (media.length !== template.scenes.length || media.some(asset => !asset || !['VIDEO', 'IMAGE'].includes(asset.type) || !Number.isFinite(asset.duration) || asset.duration <= 0)) throw new Error('Chọn video hoặc ảnh cho tất cả các cảnh.')
  let cursor = start
  const captions: Caption[] = []
  const clips = template.scenes.map((scene, index) => {
    const asset = media[index]
    const duration = asset.type === 'IMAGE' ? scene.duration : Math.min(scene.duration, asset.duration)
    const clip = { id: `${id}-clip-${index}`, assetId: asset.id, trimStart: 0, trimEnd: duration, start: cursor, track, fit: 'cover' as const, ...template.look }
    if (scene.lyrics?.length) {
      const lineStep = duration / scene.lyrics.length
      scene.lyrics.forEach((line, lineIndex) => {
        const lineStart = cursor + lineIndex * lineStep
        captions.push({ id: `${id}-text-${index}-${lineIndex}`, text: line, start: lineStart, duration: Math.min(lineStep + 1, cursor + duration - lineStart), font: 'Inter', x: 50, ...template.caption, track: textTrack, origin: 'template' })
      })
    } else captions.push({ id: `${id}-text-${index}`, text: scene.text, start: cursor, duration, font: 'Inter', x: 50, ...template.caption, track: textTrack, origin: 'template' })
    cursor += duration
    return clip
  })
  return { clips, captions, duration: cursor - start }
}

// Build an editable timeline from real ASR timestamps. The template contributes
// artwork/style only; its sample lyrics must never appear in this workflow.
export function getIntelligenceSceneCount(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error('Audio cần dài từ 0 đến 10 phút.')
  return Math.min(16, Math.max(1, Math.ceil(duration / 40)))
}

export function suggestAudioLanguage(fileName: string) {
  if (/[\u3040-\u30ff]/u.test(fileName)) return 'japanese'
  if (/[\uac00-\ud7af]/u.test(fileName)) return 'korean'
  if (/[\u3400-\u9fff]/u.test(fileName)) return 'chinese'
  if (/[ăâêôơưđ]/iu.test(fileName) || /[a-z][\u0300\u0301\u0303\u0309\u0323]/iu.test(fileName.normalize('NFD'))) return 'vietnamese'
  return 'auto'
}

export function cleanAudioTranscript(segments: TranscriptSegment[], language: string) {
  let omitted = 0
  let previous = ''
  let streak = 0
  let longestStreak = 0
  const cleaned = segments.flatMap(segment => {
    const text = segment.text.replace(/\[[^\]]{1,48}\]/g, '').replace(/[♪♫]+/g, '').replace(/\s+/g, ' ').trim()
    const repeated = /(.)\1{9,}|(.{2,28})\2{4,}/u.test(text)
    if (!text || Array.from(text).length > 140 || repeated) { omitted++; return [] }
    const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    streak = normalized === previous ? streak + 1 : 1
    previous = normalized
    longestStreak = Math.max(longestStreak, streak)
    if (streak > 2) { omitted++; return [] }
    return [{ ...segment, text }]
  })
  const content = cleaned.map(segment => segment.text).join('')
  const han = (content.match(/[\u3400-\u9fff]/gu) ?? []).length
  const latin = (content.match(/[a-z]/giu) ?? []).length
  if (language === 'chinese' && han < Math.max(4, (han + latin) * 0.25)) throw new Error('Nhận diện không ra lời tiếng Trung đáng tin cậy. Hãy thử file có giọng rõ hơn hoặc chọn ngôn ngữ khác.')
  if (language === 'auto' && longestStreak >= 5) throw new Error('Kết quả tự nhận diện lặp cùng một câu nhiều lần, có thể đã chọn sai ngôn ngữ. Hãy chọn tiếng Việt, Anh hoặc Trung rồi thử lại.')
  if (!cleaned.length || (segments.length >= 8 && cleaned.length < segments.length * 0.4)) throw new Error('Phần lớn kết quả là nhạc nền hoặc lời lặp bất thường. Chưa thêm phụ đề để tránh sai nội dung; hãy thử chọn ngôn ngữ cụ thể.')
  return { segments: cleaned, omitted }
}

export function createIntelligenceSequence(template: ShortTemplate, imageIds: string[], audioAssetId: string, duration: number, segments: TranscriptSegment[], videoTrack: number, audioTrack: number, textTrack: number, id: string, titleContent?: CreatorTitleContent) {
  if (template.kind !== 'lyric' || !Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error('Audio cần dài từ 0 đến 10 phút.')
  const sceneCount = getIntelligenceSceneCount(duration)
  if (imageIds.length !== sceneCount || imageIds.some(assetId => !assetId)) throw new Error('Không đủ ảnh nền cho video.')
  const audioClipId = `${id}-audio`
  const visualClips = imageIds.map((assetId, index) => {
    const start = duration * index / sceneCount
    const end = duration * (index + 1) / sceneCount
    const visualKeyframes = createSceneMotion(template, index, end - start)
    return { id: `${id}-scene-${index}`, assetId, trimStart: 0, trimEnd: end - start, start, track: videoTrack, fit: 'cover' as const, ...template.look, ...(visualKeyframes ? { visualKeyframes, creatorMotion: true } : {}) }
  })
  const audioClip = { id: audioClipId, assetId: audioAssetId, trimStart: 0, trimEnd: duration, start: 0, audioTrack }
  const captions = transcriptToCaptions(segments, { clipId: audioClipId, start: 0, sourceDuration: duration, speed: 1, timelineDuration: duration, track: textTrack, style: 'clean', id: `${id}-caption` })
    .map(caption => styleIntelligenceCaption(caption, template))
  if (!captions.length) throw new Error('Không nhận diện được lời trong audio. Hãy thử file có giọng rõ hơn.')
  const titles = titleContent ? createCreatorTitles(template, titleContent, duration, audioClipId, textTrack + 1) : []
  return { clips: [...visualClips, audioClip], captions: [...captions, ...titles], captionCount: captions.length, duration, sceneCount }
}

export function createSceneMotion(template: ShortTemplate, index: number, duration: number) {
  const motion = template.creator?.motion
  if (!motion || !Number.isFinite(duration) || duration <= 0) return undefined
  return [
    { time: 0, values: { scale: motion === 'push' ? 1.04 : 1.08, positionX: motion === 'drift' ? index % 2 ? -28 : 28 : 0, positionY: -12 } },
    { time: duration, values: { scale: motion === 'push' ? 1.15 : 1.11, positionX: motion === 'drift' ? index % 2 ? 28 : -28 : 0, positionY: 12 } },
  ]
}

export function styleIntelligenceCaption(caption: Caption, template: ShortTemplate): Caption {
  const isChinese = /[\u3400-\u9fff]/u.test(caption.text)
  const content = caption.text.replace(/\n/g, ' ').replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, '')
  return { ...caption, text: wrapCaption(content, template.ratio === '16:9' ? isChinese ? 24 : 60 : isChinese ? template.creator?.lyricPresentation ? 14 : 18 : template.creator?.lyricPresentation ? 42 : 30),
    ...template.caption, font: isChinese && template.caption.font !== 'Noto Serif TC Variable' ? 'Noto Sans TC' : template.caption.font ?? 'Inter Variable',
    x: 50, background: template.caption.background, shadow: template.caption.shadow ?? true,
    creatorStyleId: template.creator ? template.id : undefined, lyricStyleVersion: undefined, lyricPresentation: template.creator?.lyricPresentation, lyricViewport: template.creator?.lyricViewport,
    animation: template.creator ? template.caption.animation ?? 'fade' : 'scroll' }
}

// Inference timestamps are relative to the trimmed source, not the timeline.
export function transcriptToCaptions(segments: TranscriptSegment[], options: { clipId: string; start: number; sourceDuration: number; speed: number; timelineDuration: number; track: number; style: 'clean' | 'bold' | 'boxed'; id: string }): Caption[] {
  const speed = Math.max(0.1, options.speed)
  const limit = Math.min(options.sourceDuration / speed, options.timelineDuration)
  return segments.flatMap((segment, index) => {
    const text = segment.text.trim()
    const from = Math.max(0, segment.timestamp[0] / speed)
    const to = Math.min(limit, (segment.timestamp[1] ?? options.sourceDuration) / speed)
    if (!text || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
    return [{ id: `${options.id}-${index}`, text: wrapCaption(text), start: options.start + from, duration: to - from,
      font: 'Inter', size: options.style === 'bold' ? 90 : 76, x: 50, y: 80, track: options.track,
      color: options.style === 'bold' ? '#f7f56a' : '#ffffff', stroke: '#101012', strokeWidth: 2, shadow: true,
      background: options.style === 'boxed' ? '#101012dd' : '', animation: 'none' as const, origin: 'auto' as const, sourceClipId: options.clipId }]
  })
}
export function wrapCaption(text: string, maxChars = 32) {
  const limit = /[\u3400-\u9fff]/u.test(text) ? Math.min(8, maxChars) : maxChars
  const lines: string[] = []
  for (const word of text.trim().split(/\s+/)) {
    const chars = Array.from(word)
    for (let index = 0; index < chars.length; index += limit) {
      const chunk = chars.slice(index, index + limit).join('')
      const last = lines.at(-1)
      if (!last || Array.from(last).length + chunk.length + 1 > limit) lines.push(chunk)
      else lines[lines.length - 1] = `${last} ${chunk}`
    }
  }
  return lines.join('\n')
}
export function captionsToSrt(captions: Caption[]) {
  const timestamp = (time: number) => {
    const ms = Math.round(Math.max(0, time) * 1000)
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
  }
  return [...captions].filter(c => c.text.trim() && Number.isFinite(c.start) && Number.isFinite(c.duration) && c.duration > 0).sort((a, b) => a.start - b.start)
    .map((c, i) => `${i + 1}\n${timestamp(c.start)} --> ${timestamp(c.start + c.duration)}\n${c.text.replace(/\n{2,}/g, '\n')}\n`).join('\n')
}
