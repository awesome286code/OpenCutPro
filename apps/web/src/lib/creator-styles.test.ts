import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CREATOR_STYLES, SCROLL_CREATOR_STYLES, EDITORIAL_CREATOR_STYLES, MUSE_VARIANT_CREATOR_STYLES, NEXT_WAVE_CREATOR_STYLES, HANDMADE_CREATOR_STYLES, XINJIANG_CREATOR_STYLES, XINJIANG_PORTRAIT_CREATOR_STYLES } from './creator-styles.ts'
import { readFileSync } from 'node:fs'
import { createIntelligenceSequence, createSceneMotion, createTemplateSceneSvg, getIntelligenceSceneCount, styleIntelligenceCaption } from './short-video.ts'
import { resolveCaptionFrames } from './lyric-scroll.ts'
import { applyProfessionalLyricStyle, lyricDisplayText, makeBilingualCaptions } from './bilingual-captions.ts'
import { EDITOR_FONTS } from './font-catalog.ts'

test('80 creator styles include handmade and Xinjiang portrait directions in both formats', () => {
  assert.equal(CREATOR_STYLES.length, 80)
  assert.equal(new Set(CREATOR_STYLES.map(style => style.id)).size, 80)
  assert.deepEqual(['chinese', 'european', 'global'].map(group => CREATOR_STYLES.filter(style => style.creator?.collection === group).length), [5, 5, 4])
  assert.equal(CREATOR_STYLES.filter(style => style.ratio === '16:9').length, 39)
  assert.equal(CREATOR_STYLES.filter(style => style.ratio === '9:16').length, 41)
  const fonts = new Set<string>(EDITOR_FONTS.map(font => font.family))
  for (const style of CREATOR_STYLES) {
    assert.ok(fonts.has(style.caption.font!))
    assert.ok(fonts.has(style.creator!.latinFont))
  }
})
test('three painted Xinjiang women keep the face region clear of three-layer lyrics', () => {
  assert.equal(XINJIANG_PORTRAIT_CREATOR_STYLES.length, 6)
  assert.equal(new Set(XINJIANG_PORTRAIT_CREATOR_STYLES.map(style => style.creator?.artworkImage)).size, 3)
  for (const template of XINJIANG_PORTRAIT_CREATOR_STYLES) {
    assert.equal(template.creator?.collection, 'xinjiang')
    assert.deepEqual(template.creator?.lyricViewport, [57, 94])
    assert.equal(template.caption.y, 77)
    const png = readFileSync(new URL(`../../public${template.creator!.artworkImage}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(png.readUInt32BE(16) >= 1600 && png.readUInt32BE(20) >= 900)
    const source = createIntelligenceSequence(template, ['art'], 'audio', 12,
      [0, 4, 8].map(i => ({ text: '风经过，光留下', timestamp: [i, i + 4] })), 0, 0, 1, template.id).captions
    const captions = applyProfessionalLyricStyle([...source, ...makeBilingualCaptions(source, source.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 2, 3)])
    const frames = resolveCaptionFrames(captions, 5)
    for (const suffix of ['', '-pinyin', '-vietnamese']) assert.ok(frames.some(frame => frame.caption.id === `${source[1].id}${suffix}`))
    assert.ok(frames.every(frame => frame.clipBand?.join() === '57,94'))
  }
})
test('five handmade and four Xinjiang paintings have real media, paired formats and readable lyric groups', () => {
  assert.equal(HANDMADE_CREATOR_STYLES.length, 10)
  assert.equal(XINJIANG_CREATOR_STYLES.length, 8)
  for (const [collection, styles, imageCount] of [['handmade', HANDMADE_CREATOR_STYLES, 5], ['xinjiang', XINJIANG_CREATOR_STYLES, 4]] as const) {
    assert.equal(new Set(styles.map(style => style.creator?.artworkImage)).size, imageCount)
    assert.equal(styles.filter(style => style.ratio === '9:16').length, imageCount)
    assert.equal(styles.filter(style => style.ratio === '16:9').length, imageCount)
    for (const template of styles) {
      assert.equal(template.creator?.collection, collection)
      assert.equal(template.creator?.lyricViewport?.join(), '54,94')
      const artwork = template.creator!.artworkImage!
      const png = readFileSync(new URL(`../../public${artwork}`, import.meta.url))
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      assert.ok(png.readUInt32BE(16) >= 1600 && png.readUInt32BE(20) >= 900)
      const source = createIntelligenceSequence(template, ['art'], 'audio', 12,
        [0, 4, 8].map(i => ({ text: '风经过，光留下', timestamp: [i, i + 4] })), 0, 0, 1, template.id).captions
      const captions = applyProfessionalLyricStyle([...source, ...makeBilingualCaptions(source, source.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 2, 3)])
      const frames = resolveCaptionFrames(captions, 5)
      for (const suffix of ['', '-pinyin', '-vietnamese']) assert.ok(frames.some(frame => frame.caption.id === `${source[1].id}${suffix}`))
      assert.ok(frames.every(frame => frame.clipBand?.join() === '54,94'))
    }
  }
})
test('new lyric modes use four local artworks and keep original/Pinyin/Vietnamese together', () => {
  assert.equal(NEXT_WAVE_CREATOR_STYLES.length, 8)
  assert.equal(new Set(NEXT_WAVE_CREATOR_STYLES.map(style => style.creator!.artworkImage)).size, 4)
  assert.deepEqual(new Set(NEXT_WAVE_CREATOR_STYLES.map(style => style.creator!.lyricPresentation)), new Set(['lyric-cards', 'spotlight', 'scroll-fade']))
  for (const template of NEXT_WAVE_CREATOR_STYLES) {
    const png = readFileSync(new URL(`../../public${template.creator!.artworkImage}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(png.readUInt32BE(16) >= 900 && png.readUInt32BE(20) >= 900)
    const sequence = createIntelligenceSequence(template, ['art'], 'audio', 12, [0, 4, 8].map(i => ({ text: '风经过，光留下', timestamp: [i, i + 4] })), 0, 0, 1, template.id)
    const visual = sequence.clips[0]
    assert.ok('visualKeyframes' in visual)
    assert.equal(visual.creatorMotion, true)
    assert.deepEqual(visual.visualKeyframes?.map(frame => frame.time), [0, 12])
    const sources = sequence.captions
    const captions = applyProfessionalLyricStyle([...sources, ...makeBilingualCaptions(sources, sources.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 2, 3)])
    const frames = resolveCaptionFrames(captions, 5)
    assert.ok(frames.some(frame => frame.caption.id === sources[1].id))
    assert.ok(frames.some(frame => frame.caption.id === `${sources[1].id}-pinyin`))
    assert.ok(frames.some(frame => frame.caption.id === `${sources[1].id}-vietnamese`))
    assert.ok(frames.every(frame => frame.clipBand?.join() === template.creator!.lyricViewport!.join()))
  }
  assert.equal(createSceneMotion(NEXT_WAVE_CREATOR_STYLES[0], 0, 12)?.[1].values.scale, 1.15)
})
test('eight reference-led artworks have paired formats, distinct palettes and synchronized safe lyrics', () => {
  assert.equal(MUSE_VARIANT_CREATOR_STYLES.length, 16)
  const artworks = new Set(MUSE_VARIANT_CREATOR_STYLES.map(style => style.creator!.artworkImage!))
  assert.equal(artworks.size, 8)
  assert.equal(new Set(MUSE_VARIANT_CREATOR_STYLES.map(style => style.accent)).size, 8)
  for (const artwork of artworks) {
    const pair = MUSE_VARIANT_CREATOR_STYLES.filter(style => style.creator?.artworkImage === artwork)
    assert.deepEqual(pair.map(style => style.ratio), ['9:16', '16:9'])
    const png = readFileSync(new URL(`../../public${artwork}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(png.readUInt32BE(16) >= 1600 && png.readUInt32BE(20) >= 900)
    for (const template of pair) {
      assert.equal(template.creator?.collection, 'portrait')
      assert.deepEqual(template.creator?.lyricViewport, [52, 94])
      const source = createIntelligenceSequence(template, Array(getIntelligenceSceneCount(210)).fill('image'), 'audio', 210, [{ text: '风经过，光留下', timestamp: [120, 124] }], 0, 0, 1, template.id).captions[0]
      const group = applyProfessionalLyricStyle([source, ...makeBilingualCaptions([source], ['Gió đi qua, ánh sáng ở lại'], 'both', 2, 3)])
      assert.ok(group.every(caption => caption.start === 120 && caption.duration === 4 && caption.y > 52 && caption.y < 94))
      assert.equal(group[1].color, template.accent)
      assert.equal(group[1].font, template.creator!.latinFont)
    }
  }
})
test('Muse and Special use six real local images with paired aspect ratios and safe lyric anchors', () => {
  assert.equal(EDITORIAL_CREATOR_STYLES.length, 12)
  assert.equal(new Set(EDITORIAL_CREATOR_STYLES.map(style => style.creator?.artworkImage)).size, 6)
  for (const collection of ['portrait', 'special']) {
    assert.equal(EDITORIAL_CREATOR_STYLES.filter(style => style.creator?.collection === collection).length, 6)
    for (const ratio of ['16:9', '9:16']) assert.equal(EDITORIAL_CREATOR_STYLES.filter(style => style.ratio === ratio && style.creator?.collection === collection).length, 3)
  }
  for (const template of EDITORIAL_CREATOR_STYLES) {
    const png = readFileSync(new URL(`../../public${template.creator!.artworkImage}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(png.readUInt32BE(16) >= 1600 && png.readUInt32BE(20) >= 900)
    const source = createIntelligenceSequence(template, ['image'], 'audio', 12, [{ text: '风经过，光留下', timestamp: [4, 8] }], 0, 0, 1, 'safe').captions[0]
    const group = applyProfessionalLyricStyle([source, ...makeBilingualCaptions([source], ['Gió đi qua, ánh sáng ở lại'], 'both', 2, 3)])
    assert.ok(Math.abs(group[0].y - template.caption.y) < 1e-9)
    assert.ok(group.every(caption => caption.y > template.creator!.lyricViewport![0] && caption.y < template.creator!.lyricViewport![1]))
    assert.ok(group.every(caption => caption.lyricViewport === template.creator!.lyricViewport))
    if (template.creator?.collection === 'portrait') assert.ok(group[0].y > 65.9)
    if (template.ratio === '9:16') {
      const long = { ...group[0], text: '走得越遠才越知道什麼叫故鄉' }
      assert.ok(lyricDisplayText(long).split('\n').every(line => Array.from(line).length <= 12))
      const lengths = lyricDisplayText(long).split('\n').map(line => Array.from(line).length)
      assert.ok(Math.max(...lengths) - Math.min(...lengths) <= 1)
    }
  }
})

test('creator artworks are self-contained and vary across a ten-minute video', () => {
  const posters = []
  for (const style of CREATOR_STYLES.filter(style => !style.creator?.artworkImage)) {
    const scenes = Array.from({ length: 15 }, (_, index) => createTemplateSceneSvg(style, index))
    assert.equal(new Set(scenes).size, 15)
    scenes.forEach(svg => {
      assert.match(svg, style.ratio === '16:9' ? /width="1920" height="1080"/ : /width="1080" height="1920"/)
      assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /<script|<foreignObject|<image|<text|https?:\/\//i)
    })
    posters.push(scenes[0])
  }
  assert.equal(new Set(posters).size, 14)
})
test('scroll templates use three real generated PNG assets, not SVG substitutes', () => {
  assert.equal(SCROLL_CREATOR_STYLES.length, 6)
  assert.equal(new Set(SCROLL_CREATOR_STYLES.map(style => style.creator?.artworkImage)).size, 3)
  for (const template of SCROLL_CREATOR_STYLES) {
    assert.equal(template.creator?.collection, 'music')
    assert.equal(template.creator?.lyricPresentation, 'scroll-fade')
    const png = readFileSync(new URL(`../../public${template.creator!.artworkImage}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.ok(png.readUInt32BE(16) >= 1600 && png.readUInt32BE(20) >= 900)
  }
})

test('all new directions use real audio timestamps and their own caption settings', () => {
  for (const style of CREATOR_STYLES) {
    const sequence = createIntelligenceSequence(style, ['scene-1', 'scene-2'], 'audio', 80,
      [{ text: '风经过，光留下', timestamp: [3, 7] }, { text: 'A moment made timeless', timestamp: [40, 45] }], 0, 1, 2, style.id)
    assert.deepEqual(sequence.captions.map(caption => [caption.start, caption.duration]), [[3, 4], [40, 5]])
    assert.ok(sequence.captions.every(caption => caption.creatorStyleId === style.id && caption.color === style.caption.color && caption.animation === style.caption.animation))
    assert.equal(sequence.captions[0].font, style.caption.font === 'Noto Serif TC Variable' ? style.caption.font : 'Noto Sans TC')
    assert.equal(sequence.captions[1].font, style.caption.font)
    assert.equal(sequence.clips.at(-1)!.assetId, 'audio')
    assert.equal(sequence.clips.at(-1)!.trimEnd, 80)
  }
})

test('bilingual subtitles keep each direction and compact synchronized spacing', () => {
  for (const style of CREATOR_STYLES) {
    const source = createIntelligenceSequence(style, ['image'], 'audio', 10, [{ text: '风经过，光留下', timestamp: [2, 6] }], 0, 0, 1, style.id).captions[0]
    const generated = makeBilingualCaptions([source], ['Gió đi qua, ánh sáng ở lại'], 'both', 2, 3)
    const group = applyProfessionalLyricStyle([source, ...generated])
    assert.equal(group[0].color, style.caption.color)
    assert.equal(group[1].color, style.creator!.pinyinColor)
    assert.equal(group[2].color, style.creator!.translationColor)
    assert.equal(group[1].font, style.creator!.latinFont)
    assert.ok(group.every(caption => caption.start === 2 && caption.duration === 4))
    assert.ok(group[0].y < group[1].y && group[1].y < group[2].y)
    assert.ok(group[2].y - group[0].y < 15)
    assert.deepEqual(applyProfessionalLyricStyle(group), group)
    const changed = styleIntelligenceCaption(source, CREATOR_STYLES[2])
    assert.equal(changed.id, source.id)
    assert.equal(changed.track, source.track)
    assert.equal(changed.sourceClipId, source.sourceClipId)
  }
})
