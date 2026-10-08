import type { AspectRatio, LyricPresentation, ShortTemplate } from './short-video.ts'

export type CreatorCollection = 'chinese' | 'european' | 'global' | 'music' | 'portrait' | 'special' | 'handmade' | 'xinjiang'
export type CreatorArtwork = 'jade' | 'vermilion' | 'porcelain' | 'noir' | 'terracotta' | 'mist' | 'aurora' | 'cobalt'
export type CreatorDirection = {
  baseStyleId?: string
  lyricPresentation?: LyricPresentation
  lyricViewport?: [number, number]
  artworkImage?: string
  motion?: 'drift' | 'push'
  collection: CreatorCollection; artwork: CreatorArtwork; palette: [string, string, string]
  tags: string[]; latinFont: string; pinyinColor: string; translationColor: string
  sample: { original: string; pinyin?: string; translation: string }
}

const scenes = ['Opening', 'Verse', 'Chorus', 'Outro'].map(label => ({ label, duration: 50, text: label }))
const look = { brightness: 100, contrast: 100, saturation: 100 }
const chineseSample = { original: '风经过，光留下', pinyin: 'Fēng jīngguò, guāng liúxià', translation: 'Gió đi qua, ánh sáng ở lại' }
const englishSample = { original: 'A moment, made timeless.', translation: 'Một khoảnh khắc, mãi còn.' }

// These styles contribute visual direction only. All actual subtitles come from audio.
const PORTRAIT_STYLES: ShortTemplate[] = [
  { id: 'creator-jade', name: 'Jade Atelier · 玉色', category: 'Hoa ngữ hiện đại', kind: 'lyric', ratio: '9:16', accent: '#b8d6b6', description: 'Ngọc xanh, nét mực mềm và chữ serif tinh tế.', scenes, look,
    caption: { font: 'Noto Serif TC Variable', color: '#f1efe1', size: 92, y: 76, animation: 'fade', stroke: '#102f2d', strokeWidth: 1, shadow: true },
    creator: { collection: 'chinese', artwork: 'jade', palette: ['#123835', '#071a1d', '#b8d6b6'], tags: ['Ballad', 'Poetry'], latinFont: 'Manrope Variable', pinyinColor: '#ccdcc3', translationColor: '#f1efe1', sample: chineseSample } },
  { id: 'creator-vermilion', name: 'Vermilion Studio · 朱', category: 'Hoa ngữ hiện đại', kind: 'lyric', ratio: '9:16', accent: '#f47d64', description: 'Đỏ chu sa, hình khối táo bạo và nhịp pop.', scenes, look,
    caption: { font: 'Noto Sans TC', color: '#fff3e7', size: 96, y: 77, animation: 'pop', stroke: '#231a20', strokeWidth: 1, shadow: true },
    creator: { collection: 'chinese', artwork: 'vermilion', palette: ['#272128', '#141016', '#ed7259'], tags: ['C-pop', 'Fashion'], latinFont: 'Sora Variable', pinyinColor: '#ffc3a6', translationColor: '#fff3e7', sample: chineseSample } },
  { id: 'creator-porcelain', name: 'Porcelain Light · 瓷', category: 'Hoa ngữ hiện đại', kind: 'lyric', ratio: '9:16', accent: '#3b6096', description: 'Trắng sứ, xanh cobalt và không gian nhẹ.', scenes, look,
    caption: { font: 'Noto Serif TC Variable', color: '#1e3859', size: 92, y: 77, animation: 'fade', strokeWidth: 0, shadow: false },
    creator: { collection: 'chinese', artwork: 'porcelain', palette: ['#f1eee5', '#dcded6', '#3b6096'], tags: ['Acoustic', 'Lifestyle'], latinFont: 'Plus Jakarta Sans Variable', pinyinColor: '#4d6280', translationColor: '#1e3859', sample: chineseSample } },
  { id: 'creator-noir', name: 'Editorial Noir', category: 'Editorial châu Âu', kind: 'lyric', ratio: '9:16', accent: '#dbc8aa', description: 'Đơn sắc điện ảnh, ánh sáng gallery và chữ serif.', scenes, look,
    caption: { font: 'Noto Serif TC Variable', color: '#f2e8d7', size: 90, y: 76, animation: 'fade', stroke: '#111112', strokeWidth: 1, shadow: true },
    creator: { collection: 'european', artwork: 'noir', palette: ['#262627', '#0c0d0f', '#dbc8aa'], tags: ['Jazz', 'Luxury'], latinFont: 'Inter Variable', pinyinColor: '#cfc4b3', translationColor: '#f2e8d7', sample: englishSample } },
  { id: 'creator-terracotta', name: 'Gallery Terracotta', category: 'Editorial châu Âu', kind: 'lyric', ratio: '9:16', accent: '#9d5946', description: 'Đất nung, vòm kiến trúc và bảng màu ấm.', scenes, look,
    caption: { font: 'Manrope Variable', color: '#342d2a', size: 90, y: 77, animation: 'fade', strokeWidth: 0, shadow: false },
    creator: { collection: 'european', artwork: 'terracotta', palette: ['#ece0cf', '#d8c5b0', '#9d5946'], tags: ['Indie', 'Design'], latinFont: 'Manrope Variable', pinyinColor: '#715f55', translationColor: '#342d2a', sample: englishSample } },
  { id: 'creator-mist', name: 'Nordic Mist', category: 'Editorial châu Âu', kind: 'lyric', ratio: '9:16', accent: '#547986', description: 'Sương xanh xám, đường chân trời và chữ gọn.', scenes, look,
    caption: { font: 'Inter Variable', color: '#243c48', size: 90, y: 77, animation: 'fade', strokeWidth: 0, shadow: false },
    creator: { collection: 'european', artwork: 'mist', palette: ['#e4eceb', '#bbcbd0', '#547986'], tags: ['Ambient', 'Travel'], latinFont: 'Inter Variable', pinyinColor: '#4d6872', translationColor: '#243c48', sample: englishSample } },
  { id: 'creator-aurora', name: 'Aurora Glass', category: 'Tối giản quốc tế', kind: 'lyric', ratio: '9:16', accent: '#cbbeff', description: 'Dải sáng tím, lớp kính và cảm giác dream pop.', scenes, look,
    caption: { font: 'Plus Jakarta Sans Variable', color: '#faf7ff', size: 92, y: 77, animation: 'fade', stroke: '#231a3d', strokeWidth: 1, shadow: true },
    creator: { collection: 'global', artwork: 'aurora', palette: ['#292344', '#11172b', '#cbbeff'], tags: ['Dream pop', 'Digital'], latinFont: 'Plus Jakarta Sans Variable', pinyinColor: '#e0d7ff', translationColor: '#faf7ff', sample: englishSample } },
  { id: 'creator-cobalt', name: 'Cobalt Motion', category: 'Tối giản quốc tế', kind: 'lyric', ratio: '9:16', accent: '#a0caff', description: 'Cobalt, lưới thiết kế và hình học đương đại.', scenes, look,
    caption: { font: 'Montserrat Variable', color: '#f4f8ff', size: 92, y: 77, animation: 'slide', stroke: '#0c2157', strokeWidth: 1, shadow: true },
    creator: { collection: 'global', artwork: 'cobalt', palette: ['#25499c', '#0c2157', '#a0caff'], tags: ['Electronic', 'Creative'], latinFont: 'Montserrat Variable', pinyinColor: '#c7dcff', translationColor: '#f4f8ff', sample: englishSample } },
]

const wideStyles = [
  { base: 'creator-jade', id: 'creator-jade-wide', name: 'Jade Panorama · 山水', description: 'Sơn thủy trải ngang, ngọc xanh và lời ca Hoa ngữ.', tags: ['16:9', 'Chinese ballad'] },
  { base: 'creator-porcelain', id: 'creator-porcelain-wide', name: 'Porcelain Gallery', description: 'Bố cục gallery ngang, trắng sứ và vòm xanh.', tags: ['16:9', 'Acoustic'] },
  { base: 'creator-noir', id: 'creator-noir-wide', name: 'Noir Cinema', description: 'Khung điện ảnh rộng, đơn sắc và title tinh tế.', tags: ['16:9', 'Jazz film'] },
  { base: 'creator-mist', id: 'creator-mist-wide', name: 'Nordic Horizon', description: 'Đường chân trời Bắc Âu, khoảng thở cho video dài.', tags: ['16:9', 'Ambient'] },
  { base: 'creator-aurora', id: 'creator-aurora-wide', name: 'Aurora Music Film', description: 'Dải sáng trải ngang cho dream pop và lyric film.', tags: ['16:9', 'Dream pop'] },
  { base: 'creator-cobalt', id: 'creator-cobalt-wide', name: 'Cobalt Studio', description: 'Lưới đồ họa ngang, hình học và nhạc hiện đại.', tags: ['16:9', 'Electronic'] },
]
export const LANDSCAPE_CREATOR_STYLES: ShortTemplate[] = wideStyles.map(preset => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  return { ...base, id: preset.id, name: preset.name, description: preset.description, ratio: '16:9', caption: { ...base.caption, size: 56, y: 79 }, creator: { ...base.creator!, baseStyleId: base.id, tags: preset.tags } }
})
const abstractDirections = [
  { base: 'creator-aurora', id: 'aurora-silk', name: 'Aurora Silk', description: 'Lụa cực quang tím xanh · dream pop · lời cuộn mờ dần.', accent: '#d4c3ff' },
  { base: 'creator-jade', id: 'ink-tides', name: 'Ink Tides · 墨潮', description: 'Mực ngọc và ánh vàng · ballad Hoa ngữ · lời cuộn mờ dần.', accent: '#d7d9a0' },
  { base: 'creator-noir', id: 'amber-resonance', name: 'Amber Resonance', description: 'Sóng kính hổ phách · acoustic điện ảnh · lời cuộn mờ dần.', accent: '#ffd2a2' },
]
export const SCROLL_CREATOR_STYLES: ShortTemplate[] = abstractDirections.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  return { ...base, id: `creator-${preset.id}${ratio === '16:9' ? '-wide' : ''}`, name: `${preset.name} · ${ratio === '16:9' ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: 'Karaoke · Scroll lyrics', description: preset.description,
    caption: { ...base.caption, size: ratio === '16:9' ? 50 : 80, y: 46, animation: 'none' as const, color: '#fff7ef', shadow: true },
    creator: { ...base.creator!, baseStyleId: base.id, collection: 'music' as const, artworkImage: `/creator-artwork/${preset.id}.png`, lyricPresentation: 'scroll-fade' as const, tags: ['Scroll & fade', 'AI artwork', ratio], pinyinColor: preset.accent, translationColor: '#f4f2ee' } }
}))
const editorialDirections: Array<{ base: string; id: string; name: string; description: string; accent: string; collection: 'portrait' | 'special'; tags: string[] }> = [
  { base: 'creator-noir', id: 'midnight-muse', name: 'Midnight Muse · 夜色', description: 'Chân dung thời trang Hoa ngữ, lụa đen và ánh champagne · cinematic ballad.', accent: '#e8bfa4', collection: 'portrait', tags: ['Cinematic', 'Ballad'] },
  { base: 'creator-terracotta', id: 'riviera-muse', name: 'Riviera Muse', description: 'Chân dung châu Âu, gallery Địa Trung Hải và ánh vàng · acoustic editorial.', accent: '#e7ca9d', collection: 'portrait', tags: ['Acoustic', 'Editorial'] },
  { base: 'creator-cobalt', id: 'neon-muse', name: 'Neon Muse · 霓虹', description: 'Chân dung hiện đại, ánh hồng cyan và silver couture · future pop.', accent: '#e6b8f5', collection: 'portrait', tags: ['Future pop', 'Fashion'] },
  { base: 'creator-jade', id: 'celestial-opera', name: 'Celestial Opera · 月光', description: 'Mặt trăng ngọc, quỹ đạo champagne và chiều sâu điện ảnh · special edition.', accent: '#ead8b7', collection: 'special', tags: ['Moonlight', 'Orchestral'] },
  { base: 'creator-noir', id: 'botanical-nocturne', name: 'Botanical Nocturne', description: 'Lan hồng nghệ thuật, lá ngọc và velvet đen · romantic luxury.', accent: '#e9b9aa', collection: 'special', tags: ['Romantic', 'Fine art'] },
  { base: 'creator-aurora', id: 'chrome-dream', name: 'Chrome Dream', description: 'Điêu khắc chrome, kính ánh tím và không gian midnight · experimental edition.', accent: '#cbd2ff', collection: 'special', tags: ['Electronic', 'Sculpture'] },
]
export const EDITORIAL_CREATOR_STYLES: ShortTemplate[] = editorialDirections.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  const portrait = preset.collection === 'portrait'
  return { ...base, id: `creator-${preset.id}${ratio === '16:9' ? '-wide' : ''}`, name: `${preset.name} · ${ratio === '16:9' ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: portrait ? 'Chân dung · Muse' : 'Special Edition', description: preset.description,
    caption: { ...base.caption, size: ratio === '16:9' ? 50 : 80, y: portrait ? 66 : 54, animation: 'none', color: '#fff7ef', strokeWidth: 0, shadow: true },
    creator: { ...base.creator!, baseStyleId: base.id, collection: preset.collection, artworkImage: `/creator-artwork/${preset.id}.png`, lyricPresentation: 'scroll-fade', lyricViewport: portrait ? [52, 94] : [32, 94], tags: [...preset.tags, 'AI artwork', ratio], pinyinColor: preset.accent, translationColor: '#f4f2ee', sample: preset.base === 'creator-jade' || preset.id === 'midnight-muse' || preset.id === 'neon-muse' ? chineseSample : englishSample } }
}))
// A reference-led editorial series: one real artwork per direction, shared by
// both formats. The center-safe composition preserves the face in a 9:16 crop.
const museVariants: Array<{ id: string; name: string; description: string; palette: [string, string, string]; font: string; latinFont: string; tags: string[] }> = [
  { id: 'moonlit-muse', name: 'Moonlit Muse · 月影', description: 'Lụa xanh đêm, ánh trăng bạc và không gian điện ảnh trầm.', palette: ['#192b42', '#080e18', '#c4d9f2'], font: 'Noto Serif TC Variable', latinFont: 'Inter Variable', tags: ['Moonlight', 'Cinematic'] },
  { id: 'jade-silk-muse', name: 'Jade Silk Muse · 翠', description: 'Lụa ngọc lục bảo, viền vàng nhẹ và vẻ đẹp Hoa ngữ hiện đại.', palette: ['#163b35', '#080f0d', '#c4ddbd'], font: 'Noto Serif TC Variable', latinFont: 'Manrope Variable', tags: ['Jade silk', 'Chinese ballad'] },
  { id: 'burgundy-muse', name: 'Burgundy Velvet', description: 'Nhung đỏ rượu, ánh rose-gold và cảm xúc jazz lãng mạn.', palette: ['#421c2b', '#140b10', '#efb7c4'], font: 'Noto Serif TC Variable', latinFont: 'Plus Jakarta Sans Variable', tags: ['Velvet', 'Jazz romance'] },
  { id: 'rose-haze-muse', name: 'Rose Haze', description: 'Satin hồng bụi, ánh đào mềm và chất ảnh thời trang mơ màng.', palette: ['#50303f', '#170f16', '#f2c0b8'], font: 'Manrope Variable', latinFont: 'Manrope Variable', tags: ['Romantic', 'Soft editorial'] },
  { id: 'noir-film-muse', name: 'Noir Film · 黑白', description: 'Chân dung đen trắng, hạt film tinh tế và ánh bạc cổ điển.', palette: ['#303033', '#09090b', '#dfddd7'], font: 'Noto Serif TC Variable', latinFont: 'Inter Variable', tags: ['Monochrome', 'Analog film'] },
  { id: 'pearl-muse', name: 'Pearl Atelier', description: 'Lụa ivory, ánh ngọc trai và bố cục tối giản kiểu Paris.', palette: ['#34373b', '#111215', '#efe7d7'], font: 'Inter Variable', latinFont: 'Be Vietnam Pro', tags: ['Pearl couture', 'Minimal'] },
  { id: 'copper-muse', name: 'Copper Dusk', description: 'Lụa espresso, ánh hoàng hôn đồng ấm và cảm xúc indie mùa thu.', palette: ['#4c3022', '#130d09', '#eec09a'], font: 'Manrope Variable', latinFont: 'Manrope Variable', tags: ['Autumn', 'Indie ballad'] },
  { id: 'lilac-muse', name: 'Lilac Dream', description: 'Satin thạch anh tím, viền bạc và ánh lavender cho dream pop.', palette: ['#352840', '#110e1b', '#d9c5f2'], font: 'Plus Jakarta Sans Variable', latinFont: 'Sora Variable', tags: ['Dream pop', 'Lilac satin'] },
]
export const MUSE_VARIANT_CREATOR_STYLES: ShortTemplate[] = museVariants.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = EDITORIAL_CREATOR_STYLES.find(style => style.id === 'creator-midnight-muse')!
  return { ...base, id: `creator-${preset.id}${ratio === '16:9' ? '-wide' : ''}`, name: `${preset.name} · ${ratio === '16:9' ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.palette[2], description: preset.description,
    caption: { ...base.caption, font: preset.font, size: ratio === '16:9' ? 50 : 80 },
    creator: { ...base.creator!, artworkImage: `/creator-artwork/${preset.id}.png`, palette: preset.palette, latinFont: preset.latinFont, pinyinColor: preset.palette[2], tags: [...preset.tags, 'Muse Collection', 'AI artwork', ratio] } }
}))
const nextWaveDirections: Array<{ id: string; base: string; name: string; description: string; accent: string; ink: string; pinyin: string; translation: string; mode: LyricPresentation; viewport: [number, number]; y: number; collection: CreatorCollection; motion: 'drift' | 'push'; tags: string[] }> = [
  { id: 'prism-rain', base: 'creator-cobalt', name: 'Prism Rain', description: 'Kính mưa cyan–violet, câu hát đổi như thẻ ánh sáng trên nền đêm.', accent: '#8de9f5', ink: '#f7faff', pinyin: '#9de9ff', translation: '#ecf2ff', mode: 'lyric-cards', viewport: [55, 94], y: 74, collection: 'music', motion: 'push', tags: ['Prism', 'Future pop', 'Lyric cards'] },
  { id: 'paper-moon', base: 'creator-porcelain', name: 'Paper Moon · 紙月', description: 'Sân khấu giấy và trăng sáng; spotlight chữ mực thanh lịch.', accent: '#806a53', ink: '#282624', pinyin: '#665746', translation: '#34312d', mode: 'spotlight', viewport: [56, 94], y: 75, collection: 'special', motion: 'drift', tags: ['Paper art', 'Spotlight', 'Ballad'] },
  { id: 'metro-nocturne', base: 'creator-noir', name: 'Metro Nocturne · 夜行', description: 'Chân dung phố mưa điện ảnh, lời hát trượt mờ ở vùng nền tối.', accent: '#f0bc8a', ink: '#fff4e7', pinyin: '#f0bc8a', translation: '#f7e8db', mode: 'scroll-fade', viewport: [68, 95], y: 78, collection: 'portrait', motion: 'push', tags: ['Night portrait', 'Cinematic', 'Scroll lyrics'] },
  { id: 'marine-ink', base: 'creator-jade', name: 'Marine Ink · 海墨', description: 'Dòng mực biển siêu thực, chữ nổi như tiêu điểm giữa màn nước.', accent: '#8be5e4', ink: '#f0fbfb', pinyin: '#9be6df', translation: '#eaf7f4', mode: 'spotlight', viewport: [54, 94], y: 73, collection: 'music', motion: 'drift', tags: ['Marine', 'Ink', 'Spotlight'] },
]
export const NEXT_WAVE_CREATOR_STYLES: ShortTemplate[] = nextWaveDirections.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  const wide = ratio === '16:9'
  return { ...base, id: `creator-${preset.id}${wide ? '-wide' : ''}`, name: `${preset.name} · ${wide ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: preset.collection === 'portrait' ? 'Chân dung · Muse' : preset.collection === 'special' ? 'Special Edition' : 'Ca nhạc · Lyric', description: preset.description,
    caption: { ...base.caption, size: wide ? 50 : 80, y: preset.y, color: preset.ink, strokeWidth: 0, shadow: preset.id !== 'paper-moon', animation: 'none' as const, background: preset.mode === 'lyric-cards' ? '#071629b8' : undefined },
    creator: { ...base.creator!, baseStyleId: base.id, artworkImage: `/creator-artwork/${preset.id}.png`, collection: preset.collection, lyricPresentation: preset.mode, lyricViewport: preset.viewport, motion: preset.motion, tags: [...preset.tags, 'AI artwork', ratio], pinyinColor: preset.pinyin, translationColor: preset.translation, sample: preset.id === 'paper-moon' || preset.id === 'marine-ink' || preset.id === 'metro-nocturne' ? chineseSample : englishSample } }
}))
const handmadeDirections: Array<{ id: string; base: string; name: string; description: string; accent: string; ink: string; pinyin: string; translation: string; mode: LyricPresentation; motion: 'drift' | 'push'; tags: string[]; sample: CreatorDirection['sample'] }> = [
  { id: 'pressed-botanical', base: 'creator-terracotta', name: 'Pressed Botanical · Ép hoa', description: 'Hoa khô ép trên giấy cotton thủ công, lời hát nổi bằng mực trầm.', accent: '#8c5c69', ink: '#49383c', pinyin: '#775e67', translation: '#57454a', mode: 'spotlight', motion: 'drift', tags: ['Pressed flowers', 'Paper craft', 'Indie folk'], sample: englishSample },
  { id: 'indigo-cyanotype', base: 'creator-noir', name: 'Indigo Cyanotype · Lam ảnh', description: 'Cyanotype thực vật xanh Prussian, lời cuộn mềm như bản in analog.', accent: '#dce9e8', ink: '#fff9e9', pinyin: '#d7e8ef', translation: '#f0ead9', mode: 'scroll-fade', motion: 'push', tags: ['Cyanotype', 'Botanical', 'Scroll lyrics'], sample: chineseSample },
  { id: 'embroidered-starlight', base: 'creator-noir', name: 'Embroidered Starlight · Thêu sao', description: 'Trăng sao thêu tay trên vải linen đêm, spotlight lời ca dịu.', accent: '#e4c89a', ink: '#fff4df', pinyin: '#ebd3aa', translation: '#f7ebdb', mode: 'spotlight', motion: 'drift', tags: ['Embroidery', 'Moonlight', 'Ballad'], sample: chineseSample },
  { id: 'torn-paper-sunset', base: 'creator-terracotta', name: 'Torn Paper Sunset · Hoàng hôn', description: 'Collage giấy xé và màu nước hoàng hôn, lời cuộn trên khoảng giấy ấm.', accent: '#9a5a50', ink: '#53393a', pinyin: '#7d5b58', translation: '#594746', mode: 'scroll-fade', motion: 'drift', tags: ['Torn paper', 'Watercolor', 'Acoustic'], sample: englishSample },
  { id: 'ceramic-mosaic', base: 'creator-jade', name: 'Ceramic Mosaic · Sóng gốm', description: 'Gạch gốm ghép thủ công xanh biển, lời hát đổi như những thẻ men.', accent: '#b8e9e0', ink: '#f9f7eb', pinyin: '#c5e9e2', translation: '#ecf9f3', mode: 'lyric-cards', motion: 'push', tags: ['Ceramic', 'Mosaic', 'Lyric cards'], sample: englishSample },
]
export const HANDMADE_CREATOR_STYLES: ShortTemplate[] = handmadeDirections.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  const wide = ratio === '16:9'
  return { ...base, id: `creator-handmade-${preset.id}${wide ? '-wide' : ''}`, name: `${preset.name} · ${wide ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: 'Handmade · Thủ công', description: preset.description,
    caption: { ...base.caption, font: preset.sample.pinyin ? 'Noto Serif TC Variable' : 'Be Vietnam Pro', size: wide ? 50 : 80, y: 75, color: preset.ink, strokeWidth: 0, shadow: false, animation: 'none' as const, background: preset.mode === 'lyric-cards' ? '#092a35c9' : undefined },
    creator: { ...base.creator!, baseStyleId: base.id, artworkImage: `/creator-artwork/handmade-${preset.id}.png`, collection: 'handmade' as const, lyricPresentation: preset.mode, lyricViewport: [54, 94] as [number, number], motion: preset.motion, tags: [...preset.tags, 'Handmade artwork', ratio], pinyinColor: preset.pinyin, translationColor: preset.translation, sample: preset.sample } }
}))
const xinjiangDirections: Array<{ id: string; base: string; name: string; description: string; accent: string; ink: string; pinyin: string; translation: string; mode: LyricPresentation; motion: 'drift' | 'push'; tags: string[] }> = [
  { id: 'tianshan', base: 'creator-cobalt', name: 'Thiên Sơn · 天山', description: 'Đỉnh tuyết và thung lũng Thiên Sơn vẽ màu nước, lời hát nổi trên nền hồ lam.', accent: '#b7e3fb', ink: '#fff9ee', pinyin: '#d2e8f5', translation: '#f5f9f9', mode: 'spotlight', motion: 'push', tags: ['Tân Cương', 'Watercolor', 'Mountain'] },
  { id: 'ili', base: 'creator-jade', name: 'Thảo nguyên Ili · 伊犁', description: 'Đồi cỏ Ili vẽ gouache, lời cuộn mềm trên nền xanh cuối chiều.', accent: '#d6e9af', ink: '#fff9e9', pinyin: '#e0ecba', translation: '#f3f5df', mode: 'scroll-fade', motion: 'drift', tags: ['Tân Cương', 'Gouache', 'Grassland'] },
  { id: 'kanas', base: 'creator-jade', name: 'Hồ Kanas · 喀纳斯', description: 'Rừng thu vàng và hồ Kanas màu ngọc, nét màu nước và chì màu thủ công.', accent: '#f8d989', ink: '#fff9eb', pinyin: '#f4dfae', translation: '#f2f9ed', mode: 'spotlight', motion: 'drift', tags: ['Tân Cương', 'Autumn', 'Lake'] },
  { id: 'turpan', base: 'creator-terracotta', name: 'Ốc đảo Turpan · 吐鲁番', description: 'Đồi sa mạc và ốc đảo Turpan vẽ trên giấy ngà, lời ca bằng mực nâu.', accent: '#955e43', ink: '#49352c', pinyin: '#785744', translation: '#59453a', mode: 'scroll-fade', motion: 'push', tags: ['Tân Cương', 'Ink', 'Oasis'] },
]
export const XINJIANG_CREATOR_STYLES: ShortTemplate[] = xinjiangDirections.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  const wide = ratio === '16:9'
  return { ...base, id: `creator-xinjiang-${preset.id}${wide ? '-wide' : ''}`, name: `${preset.name} · ${wide ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: 'Tân Cương · Vẽ tay', description: preset.description,
    caption: { ...base.caption, font: 'Noto Serif TC Variable', size: wide ? 50 : 80, y: 75, color: preset.ink, strokeWidth: 0, shadow: false, animation: 'none' as const, background: undefined },
    creator: { ...base.creator!, baseStyleId: base.id, artworkImage: `/creator-artwork/xinjiang-${preset.id}.png`, collection: 'xinjiang' as const, lyricPresentation: preset.mode, lyricViewport: [54, 94] as [number, number], motion: preset.motion, tags: [...preset.tags, 'Hand-painted artwork', ratio], pinyinColor: preset.pinyin, translationColor: preset.translation, sample: chineseSample } }
}))
const xinjiangPortraits: Array<{ id: string; base: string; name: string; description: string; accent: string; ink: string; pinyin: string; translation: string; mode: LyricPresentation; motion: 'drift' | 'push'; tags: string[] }> = [
  { id: 'ili', base: 'creator-jade', name: 'Cô gái Ili · 伊犁', description: 'Chân dung gouache giữa thảo nguyên Ili và dãy Thiên Sơn; lời hát trên nền cỏ xanh trầm.', accent: '#dce5ae', ink: '#fff9e9', pinyin: '#e4edbd', translation: '#f5f7e7', mode: 'scroll-fade', motion: 'drift', tags: ['Portrait', 'Ili', 'Gouache'] },
  { id: 'kashgar', base: 'creator-terracotta', name: 'Cô gái Kashgar · 喀什', description: 'Chân dung màu nước giữa phố cổ Kashgar, nét mực ấm trên nền giấy thủ công.', accent: '#99664b', ink: '#4e382f', pinyin: '#7a5b4a', translation: '#5b453a', mode: 'spotlight', motion: 'drift', tags: ['Portrait', 'Kashgar', 'Watercolor'] },
  { id: 'kanas', base: 'creator-jade', name: 'Cô gái Kanas · 喀纳斯', description: 'Chân dung màu nước bên hồ Kanas mùa thu; lyric sáng trên mặt hồ lam đậm.', accent: '#f5d999', ink: '#fff9eb', pinyin: '#f1e0af', translation: '#f3f8e9', mode: 'spotlight', motion: 'push', tags: ['Portrait', 'Kanas', 'Autumn'] },
]
export const XINJIANG_PORTRAIT_CREATOR_STYLES: ShortTemplate[] = xinjiangPortraits.flatMap(preset => (['9:16', '16:9'] as const).map(ratio => {
  const base = PORTRAIT_STYLES.find(style => style.id === preset.base)!
  const wide = ratio === '16:9'
  return { ...base, id: `creator-xinjiang-girl-${preset.id}${wide ? '-wide' : ''}`, name: `${preset.name} · ${wide ? 'Widescreen' : 'Portrait'}`, ratio, accent: preset.accent, category: 'Tân Cương · Chân dung vẽ tay', description: preset.description,
    caption: { ...base.caption, font: 'Noto Serif TC Variable', size: wide ? 50 : 80, y: 77, color: preset.ink, strokeWidth: 0, shadow: false, animation: 'none' as const, background: undefined },
    creator: { ...base.creator!, baseStyleId: base.id, artworkImage: `/creator-artwork/xinjiang-girl-${preset.id}.png`, collection: 'xinjiang' as const, lyricPresentation: preset.mode, lyricViewport: [57, 94] as [number, number], motion: preset.motion, tags: [...preset.tags, 'Hand-painted portrait', ratio], pinyinColor: preset.pinyin, translationColor: preset.translation, sample: chineseSample } }
}))
export const CREATOR_STYLES = [...PORTRAIT_STYLES, ...LANDSCAPE_CREATOR_STYLES, ...SCROLL_CREATOR_STYLES, ...EDITORIAL_CREATOR_STYLES, ...MUSE_VARIANT_CREATOR_STYLES, ...NEXT_WAVE_CREATOR_STYLES, ...HANDMADE_CREATOR_STYLES, ...XINJIANG_CREATOR_STYLES, ...XINJIANG_PORTRAIT_CREATOR_STYLES]

function landscapeArtworkSvg(direction: CreatorDirection, sceneIndex: number) {
  const [paper, depth, accent] = direction.palette
  const shift = sceneIndex % 4 * 60, variant = sceneIndex * 37 % 140
  let art = ''
  switch (direction.artwork) {
    case 'jade': art = `<circle cx="${1440 - shift}" cy="${245 + variant}" r="195" fill="${accent}" opacity=".2"/><path d="M0 650 320 415 640 670 1080 380 1480 560 1920 320v760H0Z" fill="${depth}" opacity=".48"/><path d="M-80 740Q450 ${480 + shift} 880 665T2050 530" fill="none" stroke="${accent}" stroke-width="140" opacity=".1"/><path d="M0 650Q520 400 1020 660T1920 555" fill="none" stroke="${accent}" stroke-width="2" opacity=".36"/>`; break
    case 'porcelain': art = `<ellipse cx="1450" cy="680" rx="330" ry="55" fill="${accent}" opacity=".08"/><path d="M1200 660V${260 + shift}a240 240 0 0 1 480 0v${400 - shift}" fill="none" stroke="${accent}" stroke-width="70" opacity=".72"/><path d="M1310 660V320a130 130 0 0 1 260 0v340" fill="none" stroke="${accent}" opacity=".4"/><circle cx="${430 + shift}" cy="${270 + variant}" r="150" fill="${accent}" opacity=".08"/>`; break
    case 'noir': art = `<ellipse cx="${1340 - shift}" cy="${405 + variant}" rx="240" ry="330" transform="rotate(32 1340 450)" fill="${accent}" opacity=".08"/><rect x="${1240 - shift}" y="155" width="350" height="520" rx="175" fill="${accent}" opacity=".11"/><circle cx="${510 + shift}" cy="420" r="230" fill="none" stroke="${accent}" stroke-width="2" opacity=".18"/><path d="M120 710h1680M120 150h500" stroke="${accent}" stroke-width="2" opacity=".35"/>`; break
    case 'mist': art = `<circle cx="${1400 - shift}" cy="${265 + variant}" r="190" fill="#fff" opacity=".44"/><path d="M0 625Q430 ${390 + shift} 940 600T1920 550v530H0Z" fill="${accent}" opacity=".15"/><path d="M0 700Q650 510 1120 680T1920 650v430H0Z" fill="${accent}" opacity=".16"/><path d="M200 750h1520" stroke="${accent}" opacity=".2"/>`; break
    case 'aurora': art = `<ellipse cx="${1270 - shift}" cy="${390 + variant}" rx="560" ry="300" fill="url(#halo)"/><ellipse cx="${640 + shift}" cy="340" rx="370" ry="260" fill="#78d7cf" opacity=".09"/><rect x="1140" y="160" width="540" height="510" rx="160" fill="#fff" fill-opacity=".03" stroke="${accent}" stroke-opacity=".23"/><path d="M120 580Q900 70 1780 540M120 630Q900 120 1780 590" fill="none" stroke="${accent}" stroke-width="2" opacity=".28"/>`; break
    case 'cobalt': art = `<rect x="120" y="140" width="1680" height="570" fill="url(#grid)"/><circle cx="${1410 - shift}" cy="${415 + variant}" r="220" fill="none" stroke="${accent}" stroke-width="55"/><circle cx="${450 + shift}" cy="280" r="100" fill="${accent}" opacity=".13"/><path d="M140 740h1640" stroke="${accent}" stroke-width="3" opacity=".3"/>`; break
    case 'terracotta': art = `<path d="M1190 700V350a240 240 0 0 1 480 0v350Z" fill="${accent}"/><path d="M1300 700V370a130 130 0 0 1 260 0v330Z" fill="${paper}"/><circle cx="${420 + shift}" cy="${350 + variant}" r="200" fill="${accent}" opacity=".2"/>`; break
    case 'vermilion': art = `<circle cx="${1400 - shift}" cy="${420 + variant}" r="290" fill="${accent}"/><circle cx="1550" cy="310" r="195" fill="${depth}"/><path d="M1180 650 1760 140" stroke="#ffd3af" stroke-width="2" opacity=".6"/>`; break
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="${paper}"/><stop offset="1" stop-color="${depth}"/></linearGradient><radialGradient id="halo"><stop stop-color="${accent}" stop-opacity=".5"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M96 0H0V96" fill="none" stroke="${accent}" stroke-opacity=".12"/></pattern></defs><rect width="1920" height="1080" fill="url(#paper)"/>${art}<path d="M72 108V72h52M1796 72h52v36M72 972v36h52M1796 1008h52v-36" fill="none" stroke="${accent}" stroke-width="2" opacity=".3"/></svg>`
}

export function creatorArtworkSvg(direction: CreatorDirection, sceneIndex: number, ratio: AspectRatio = '9:16') {
  if (ratio === '16:9') return landscapeArtworkSvg(direction, sceneIndex)
  const [paper, depth, accent] = direction.palette
  const phase = sceneIndex % 4
  const shift = phase * 46
  const variant = (sceneIndex * 37) % 120
  let art = ''
  switch (direction.artwork) {
    case 'jade':
      art = `<circle cx="${730 - shift}" cy="${430 + variant}" r="244" fill="${accent}" opacity=".18"/><path d="M-80 1120Q240 ${470 + shift} 470 890T1180 700" fill="none" stroke="${accent}" stroke-width="180" opacity=".12"/><path d="M-80 1050Q260 620 560 960T1180 760" fill="none" stroke="${accent}" stroke-width="3" opacity=".5"/><path d="M0 1030 270 810 550 1020 840 720 1080 910v300H0Z" fill="${depth}" opacity=".36"/><path d="M880 160v620M856 220v210" stroke="${accent}" stroke-width="2" opacity=".45"/>`
      break
    case 'vermilion':
      art = `<circle cx="${390 + shift}" cy="${610 + variant}" r="340" fill="${accent}"/><circle cx="${700 - shift}" cy="480" r="250" fill="${depth}"/><path d="M130 940 960 200M145 995 980 250" stroke="#ffd3af" stroke-width="2" opacity=".65"/><rect x="100" y="1060" width="${500 + shift}" height="6" fill="${accent}"/><circle cx="920" cy="1063" r="9" fill="${accent}"/>`
      break
    case 'porcelain':
      art = `<ellipse cx="540" cy="950" rx="340" ry="74" fill="${accent}" opacity=".09"/><path d="M300 900V${430 + shift}a240 240 0 0 1 480 0v${470 - shift}" fill="none" stroke="${accent}" stroke-width="70" opacity=".85"/><path d="M408 880V490a132 132 0 0 1 264 0v390" fill="none" stroke="${accent}" stroke-width="2" opacity=".4"/><circle cx="${735 - shift}" cy="${285 + variant}" r="90" fill="${accent}" opacity=".12"/><path d="M145 1030h790M200 1060h680" stroke="${accent}" opacity=".3"/>`
      break
    case 'noir':
      art = `<ellipse cx="${570 - shift}" cy="${490 + variant}" rx="220" ry="410" transform="rotate(28 540 550)" fill="${accent}" opacity=".07"/><rect x="${230 + shift}" y="275" width="410" height="730" rx="205" fill="${accent}" opacity=".13"/><path d="M140 1020h800M140 190h350" stroke="${accent}" stroke-width="2" opacity=".55"/><circle cx="${760 - shift}" cy="820" r="190" fill="none" stroke="${accent}" stroke-width="2" opacity=".48"/>`
      break
    case 'terracotta':
      art = `<ellipse cx="540" cy="1050" rx="350" ry="55" fill="${accent}" opacity=".14"/><path d="M230 1030V${470 + shift}a310 310 0 0 1 620 0v${560 - shift}Z" fill="${accent}"/><path d="M375 1030V520a165 165 0 0 1 330 0v510Z" fill="${paper}"/><circle cx="${775 - shift}" cy="${310 + variant}" r="125" fill="${accent}" opacity=".35"/><path d="M120 1120h840" stroke="${accent}" stroke-width="2" opacity=".36"/>`
      break
    case 'mist':
      art = `<circle cx="${730 - shift}" cy="${360 + variant}" r="230" fill="#fff" opacity=".44"/><path d="M0 900Q250 ${600 + shift} 510 875T1080 840v350H0Z" fill="${accent}" opacity=".16"/><path d="M0 1020Q350 750 670 990T1080 970v220H0Z" fill="${accent}" opacity=".18"/><path d="M110 1130h860M230 1160h620" stroke="${accent}" stroke-width="2" opacity=".4"/>`
      break
    case 'aurora':
      art = `<ellipse cx="${620 - shift}" cy="${620 + variant}" rx="310" ry="420" fill="url(#halo)"/><ellipse cx="${340 + shift}" cy="520" rx="210" ry="330" fill="#78d7cf" opacity=".12"/><rect x="${230 + shift}" y="290" width="500" height="720" rx="180" fill="#fff" fill-opacity=".045" stroke="${accent}" stroke-opacity=".4" stroke-width="2"/><path d="M130 910Q480 260 950 730M120 980Q490 330 960 800" fill="none" stroke="${accent}" stroke-width="3" opacity=".32"/>`
      break
    case 'cobalt':
      art = `<rect x="110" y="220" width="860" height="860" fill="url(#grid)"/><circle cx="${450 + shift}" cy="${610 + variant}" r="290" fill="none" stroke="${accent}" stroke-width="75"/><circle cx="${700 - shift}" cy="370" r="130" fill="${accent}" opacity=".25"/><path d="M170 1080h740M170 1100h420" stroke="${accent}" stroke-width="3" opacity=".65"/>`
      break
  }
  // The lower third is deliberately quiet for original + pinyin + translation.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="${paper}"/><stop offset="1" stop-color="${depth}"/></linearGradient><radialGradient id="halo"><stop stop-color="${accent}" stop-opacity=".6"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><pattern id="grid" width="86" height="86" patternUnits="userSpaceOnUse"><path d="M86 0H0V86" fill="none" stroke="${accent}" stroke-opacity=".18"/></pattern></defs><rect width="1080" height="1920" fill="url(#paper)"/>${art}<path d="M80 100V80h40M960 80h40v40M80 1800v40h40M960 1840h40v-40" fill="none" stroke="${accent}" stroke-width="2" opacity=".38"/></svg>`
}
