import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lyricFocusTime, resolveCaptionFrames } from './lyric-scroll.ts'
import { SCROLL_CREATOR_STYLES, EDITORIAL_CREATOR_STYLES, MUSE_VARIANT_CREATOR_STYLES, NEXT_WAVE_CREATOR_STYLES } from './creator-styles.ts'
import { createIntelligenceSequence, getIntelligenceSceneCount, type Caption } from './short-video.ts'
import { applyProfessionalLyricStyle, makeBilingualCaptions } from './bilingual-captions.ts'
import { drawExportCaption, getPreviewCaptionStyle } from './caption-renderer.ts'

function fixture(wide = false) {
  const template = SCROLL_CREATOR_STYLES.find(style => (style.ratio === '16:9') === wide)!
  const captions = createIntelligenceSequence(template, Array(getIntelligenceSceneCount(24)).fill('art'), 'audio', 24,
    Array.from({ length: 6 }, (_, index) => ({ text: ['你知道被風吹過的夜晚', '聽見風的聲音', '讓旋律慢慢流動'][index % 3], timestamp: [index * 4, (index + 1) * 4] as [number, number] })), 0, 0, 0, 'scroll').captions
  return applyProfessionalLyricStyle([...captions, ...makeBilingualCaptions(captions, captions.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 1, 2)])
}
test('Muse and Special protect the image/title area identically in preview and export', () => {
  for (const template of [...EDITORIAL_CREATOR_STYLES, ...MUSE_VARIANT_CREATOR_STYLES]) {
    const source = createIntelligenceSequence(template, ['art'], 'audio', 12,
      ['听见风的声音', '让旋律慢慢流动', '风经过光留下'].map((text, i) => ({ text, timestamp: [i * 4, (i + 1) * 4] })), 0, 0, 0, 'muse').captions
    const captions = applyProfessionalLyricStyle([...source, ...makeBilingualCaptions(source, source.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 1, 2)])
    for (const time of [1, 3.6, 4, 4.8, 8.3, 11.7]) {
      const frames = resolveCaptionFrames(captions, time)
      assert.ok(frames.length)
      assert.ok(frames.every(frame => frame.clipBand?.join() === template.creator!.lyricViewport!.join()))
      const frame = frames.find(f => !/-(?:pinyin|vietnamese)$/.test(f.caption.id))!
      const wide = template.ratio === '16:9', width = wide ? 1920 : 1080, height = wide ? 1080 : 1920
      const calls: number[][] = [], ctx = { save(){}, restore(){}, beginPath(){}, clip(){}, rect(...args: number[]){calls.push(args)}, translate(){}, scale(){}, measureText(){return {width:100}}, fillText(){}, strokeText(){}, fillRect(){}, globalAlpha:1 } as unknown as CanvasRenderingContext2D
      drawExportCaption(ctx, frame.caption, time, width, height, frame)
      const [top, bottom] = template.creator!.lyricViewport!
      assert.deepEqual(calls[0], [0, height * top / 100, width, height * (bottom - top) / 100])
      const preview = getPreviewCaptionStyle(frame.caption, time, width / 1920, wide ? '16:9' : '9:16', frame)
      assert.equal(preview.opacity, ctx.globalAlpha)
      assert.match(String(preview.clipPath), /^inset\(/)
    }
  }
})
test('invalid clipping bands in imported projects fall back without breaking playback', () => {
  for (const lyricViewport of [[NaN, 90], [80, 20], [-20, 110], [], 'invalid']) {
    const captions = fixture().map(caption => ({ ...caption, lyricViewport } as unknown as Caption))
    assert.ok(resolveCaptionFrames(captions, 9).every(frame => frame.clipBand?.join() === '24,88'))
  }
})
test('scroll window has bright active lyrics and faint original neighbors, not duplicated translations', () => {
  for (const wide of [false, true]) {
    const captions = fixture(wide), original = JSON.stringify(captions), frames = resolveCaptionFrames(captions, 9)
    const main = frames.find(frame => frame.caption.id === 'scroll-caption-2')!
    assert.equal(main.opacity, 1)
    assert.ok(Math.abs(main.y! - captions[2].y) < 1e-9)
    assert.ok(frames.some(frame => frame.caption.id === 'scroll-caption-1' && frame.opacity! > .06 && frame.opacity! < .3))
    assert.ok(frames.some(frame => frame.caption.id === 'scroll-caption-3' && frame.opacity! < .3))
    assert.equal(frames.filter(frame => /-(?:pinyin|vietnamese)$/.test(frame.caption.id)).length, 2)
    assert.ok(frames.filter(frame => /-(?:pinyin|vietnamese)$/.test(frame.caption.id)).every(frame => frame.caption.id.startsWith('scroll-caption-2-')))
    assert.equal(JSON.stringify(captions), original)
    assert.deepEqual(resolveCaptionFrames(captions, 9), frames)
    assert.deepEqual(resolveCaptionFrames(captions, 24), [])
  }
})
test('row motion and opacity are continuous across a lyric boundary and deterministic when scrubbing', () => {
  const captions = fixture()
  for (const id of ['scroll-caption-1', 'scroll-caption-2']) {
    const before = resolveCaptionFrames(captions, 8 - .00001).find(frame => frame.caption.id === id)!
    const at = resolveCaptionFrames(captions, 8).find(frame => frame.caption.id === id)!
    assert.ok(Math.abs(before.y! - at.y!) < .001)
    assert.ok(Math.abs(before.opacity! - at.opacity!) < .001)
  }
  const start = resolveCaptionFrames(captions, 8).find(frame => frame.caption.id === 'scroll-caption-2')!
  const end = resolveCaptionFrames(captions, 8.65).find(frame => frame.caption.id === 'scroll-caption-2')!
  assert.ok(start.y! > end.y! && start.opacity! < end.opacity!)
  resolveCaptionFrames(captions, 20)
  assert.deepEqual(resolveCaptionFrames(captions, 8), resolveCaptionFrames(fixture(), 8))
})
test('gaps do not invent active subtitles; hidden/deleted rows and ordinary captions are respected', () => {
  const captions = fixture().map(caption => ({ ...caption, duration: 2 }))
  const gap = resolveCaptionFrames(captions, 3)
  assert.ok(gap.every(frame => frame.opacity! <= .2 && !/-(?:pinyin|vietnamese)$/.test(frame.caption.id)))
  for (const id of ['scroll-caption-0', 'scroll-caption-1']) {
    const before = resolveCaptionFrames(captions, 4 - .00001).find(frame => frame.caption.id === id)!
    const at = resolveCaptionFrames(captions, 4).find(frame => frame.caption.id === id)!
    assert.ok(Math.abs(before.opacity! - at.opacity!) < .001, 'No brightness flash after a gap')
    assert.ok(Math.abs(before.y! - at.y!) < .001)
  }
  const hidden = resolveCaptionFrames(captions, 9, caption => caption.track === 1)
  assert.ok(hidden.every(frame => !frame.caption.id.endsWith('-pinyin')))
  const deleted = captions.filter(caption => !caption.id.startsWith('scroll-caption-2'))
  assert.ok(resolveCaptionFrames(deleted, 9).every(frame => !frame.caption.id.startsWith('scroll-caption-2')))
  const ordinary: Caption = { id: 'normal', text: 'Hello', start: 1, duration: 1, x: 50, y: 50, size: 60, font: 'Inter', color: '#fff' }
  assert.deepEqual(resolveCaptionFrames([ordinary], 1.5), [{ caption: ordinary }])
  assert.deepEqual(resolveCaptionFrames([ordinary], 2), [])
})
test('preview/export consume exactly the same animated position, opacity and clipping band', () => {
  for (const wide of [false, true]) {
    const frame = resolveCaptionFrames(fixture(wide), 8.25).find(frame => frame.caption.id === 'scroll-caption-2')!
    const width = wide ? 1920 : 1080, height = wide ? 1080 : 1920
    const preview = getPreviewCaptionStyle(frame.caption, 8.25, width / 1920, wide ? '16:9' : '9:16', frame)
    const calls: any[] = [], ctx = { save(){},restore(){},beginPath(){},clip(){},rect(...args: number[]){calls.push(['clip',...args])},translate(...args: number[]){calls.push(['position',...args])},scale(){},measureText(){return {width:100}},fillText(){},strokeText(){},fillRect(){},globalAlpha:1 } as unknown as CanvasRenderingContext2D
    drawExportCaption(ctx, frame.caption, 8.25, width, height, frame)
    assert.equal(preview.opacity, frame.opacity)
    assert.equal(ctx.globalAlpha, frame.opacity)
    assert.equal(preview.top, `${frame.caption.y}%`, 'Layout anchor stays static')
    const shift = parseFloat(String(preview.transform).match(/calc\(-50% \+ ([\d.e+-]+)px\)/)![1])
    assert.ok(Math.abs(height * parseFloat(String(preview.top)) / 100 + shift - height * frame.y! / 100) < 1e-8)
    assert.match(String(preview.transform), /^translate3d\(/)
    assert.deepEqual(calls.find(call => call[0] === 'position'), ['position', width * frame.caption.x / 100, height * frame.y! / 100])
    assert.deepEqual(calls.find(call => call[0] === 'clip'), ['clip', 0, height * 24 / 100, width, height * 64 / 100])
    assert.match(String(preview.clipPath), /^inset\(/)
  }
})

test('secondary lyrics crossfade continuously across their original source boundary', () => {
  const captions = fixture()
  for (const id of ['scroll-caption-1-pinyin', 'scroll-caption-1-vietnamese', 'scroll-caption-2-pinyin', 'scroll-caption-2-vietnamese']) {
    const before = resolveCaptionFrames(captions, 8 - 1e-5).find(frame => frame.caption.id === id)!
    const after = resolveCaptionFrames(captions, 8 + 1e-5).find(frame => frame.caption.id === id)!
    assert.ok(before && after, 'Both rows remain mounted while fading')
    assert.ok(Math.abs(before.y! - after.y!) < .01)
    assert.ok(Math.abs(before.opacity! - after.opacity!) < .001)
  }
})

test('rapid lyrics and custom row placement stay continuous at every handoff', () => {
  const roots = fixture().filter(caption => !/-(?:pinyin|vietnamese)$/.test(caption.id))
  const captions = roots.map((caption, i) => ({ ...caption, start: i * .3, duration: .3, y: 46 + i % 2 * 2 }))
  for (let i = 1; i < captions.length; i++) for (const t of [captions[i].start - .075, captions[i].start, lyricFocusTime(captions, captions[i])]) {
    for (const id of [captions[i - 1].id, captions[i].id]) {
      const before = resolveCaptionFrames(captions, t - 1e-6).find(frame => frame.caption.id === id)!
      const after = resolveCaptionFrames(captions, t + 1e-6).find(frame => frame.caption.id === id)!
      assert.ok(Math.abs(before.y! - after.y!) < .001)
      assert.ok(Math.abs(before.opacity! - after.opacity!) < .001, `${id} at ${t}: ${before.opacity} -> ${after.opacity}`)
    }
  }
})

test('scroll acceleration settles without a hard stop, and anticipates upcoming lyrics', () => {
  const captions = fixture(), id = 'scroll-caption-2'
  const y = (time: number) => resolveCaptionFrames(captions, time).find(frame => frame.caption.id === id)!.y!
  assert.ok(y(7.8) < y(7.5), 'Ribbon begins moving before the next timestamp')
  for (const t of [7.55, 8.8]) {
    const h = .001
    const velocity = (y(t + h) - y(t - h)) / (2 * h)
    const acceleration = (y(t + h) - 2 * y(t) + y(t - h)) / (h * h)
    assert.ok(Math.abs(velocity) < .005)
    assert.ok(Math.abs(acceleration) < 1)
  }
})

test('one distant long subtitle cannot inflate the spacing of short neighboring rows', () => {
  const captions = fixture(), baseline = resolveCaptionFrames(captions, 5).find(frame => frame.caption.id === 'scroll-caption-0')!
  const changed = captions.map(caption => caption.id === 'scroll-caption-5' ? { ...caption, text: '很長的歌詞\n'.repeat(6) } : caption)
  const result = resolveCaptionFrames(changed, 5).find(frame => frame.caption.id === baseline.caption.id)!
  assert.equal(result.y, baseline.y)
})

test('new lyric directions keep Chinese, Pinyin and Vietnamese grouped through preview and export', () => {
  for (const template of NEXT_WAVE_CREATOR_STYLES) {
    const source = createIntelligenceSequence(template, ['art'], 'audio', 12,
      [{ text: '听见风的声音', timestamp: [0, 4] }, { text: '让旋律慢慢流动', timestamp: [4, 8] }, { text: '风经过光留下', timestamp: [8, 12] }], 0, 0, 0, 'wave').captions
    const captions = applyProfessionalLyricStyle([...source, ...makeBilingualCaptions(source, source.map(() => 'Gió đi qua, ánh sáng ở lại'), 'both', 1, 2)])
    const wide = template.ratio === '16:9', width = wide ? 1920 : 1080, height = wide ? 1080 : 1920
    for (const time of [1, 4.25, 5, 9]) {
      const frames = resolveCaptionFrames(captions, time)
      const main = frames.find(frame => frame.caption.id === `wave-caption-${Math.floor(time / 4)}`)!
      assert.ok(main && main.opacity! > 0 && main.scale! > 0)
      assert.ok(frames.some(frame => frame.caption.id === `${main.caption.id}-pinyin`))
      assert.ok(frames.some(frame => frame.caption.id === `${main.caption.id}-vietnamese`))
      assert.equal(main.clipBand?.join(), template.creator!.lyricViewport?.join())
      const preview = getPreviewCaptionStyle(main.caption, time, width / 1920, template.ratio, main)
      const scales: number[][] = []
      const ctx = { save(){}, restore(){}, beginPath(){}, clip(){}, rect(){}, translate(){}, scale(...args: number[]){scales.push(args)}, measureText(){return {width:100}}, fillText(){}, strokeText(){}, fillRect(){}, globalAlpha:1 } as unknown as CanvasRenderingContext2D
      drawExportCaption(ctx, main.caption, time, width, height, main)
      assert.equal(preview.opacity, ctx.globalAlpha)
      assert.ok(scales.some(call => Math.abs(call[0] - main.scale!) < 1e-9))
      assert.match(String(preview.transform), new RegExp(`scale\\(${main.scale}\\)`))
    }
  }
})
