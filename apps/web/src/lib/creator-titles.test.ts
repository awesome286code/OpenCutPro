import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CREATOR_STYLES } from './creator-styles.ts'
import { SHORT_TEMPLATES, createIntelligenceSequence, getIntelligenceSceneCount } from './short-video.ts'
import { audioTitle, CREATOR_TITLE_PRESETS, creatorTitleDesign, createCreatorTitles, fitCreatorTitle, resolveCreatorTitle, restyleCreatorTitles, trackedTextLayout } from './creator-titles.ts'

const templates = [...CREATOR_STYLES, ...SHORT_TEMPLATES.filter(template => template.kind === 'lyric')]
const content = { enabled: true, title: '北方', subtitle: 'A song for you' }
test('all 82 Creator directions have distinct portrait/landscape title layouts', () => {
  assert.equal(templates.length, 82)
  assert.equal(new Set(templates.map(template => JSON.stringify(creatorTitleDesign(template)))).size, 82)
  for (const template of templates) {
    const titles = createCreatorTitles(template, content, 205, 'audio', 7)
    assert.equal(titles.length, 7)
    assert.equal(new Set(titles.map(caption => caption.id)).size, 7)
    assert.ok(titles.every(caption => caption.creatorStyleId === template.id && caption.sourceClipId === 'audio' && caption.origin === 'template'))
    assert.ok(titles.every(caption => caption.y < 65 && caption.fontWeight && caption.letterSpacing !== undefined))
    for (const track of [7, 8, 9]) {
      const clips = titles.filter(caption => caption.track === track).sort((a, b) => a.start - b.start)
      assert.ok(clips.every((caption, index) => !index || caption.start >= clips[index - 1].start + clips[index - 1].duration))
    }
    assert.equal(titles.find(caption => caption.creatorTitlePhase === 'signature')?.start, 6)
    assert.ok(titles.every(caption => caption.start >= 0 && caption.duration > 0 && caption.start + caption.duration <= 205))
  }
})
test('8 independent title designs work on both formats with editable, stable clip IDs', () => {
  assert.equal(CREATOR_TITLE_PRESETS.length, 9)
  const variants = CREATOR_TITLE_PRESETS.filter(preset => preset.id !== 'auto')
  for (const template of [templates[0], templates.find(template => template.ratio === '16:9')!]) {
    const generated = variants.map(preset => createCreatorTitles(template, { ...content, design: preset.id }, 205, 'audio', 7))
    assert.equal(new Set(generated.map(titles => JSON.stringify(titles[0]))).size, 8)
    for (const [index, titles] of generated.entries()) {
      assert.ok(titles.every(title => title.creatorTitleDesignId === variants[index].id))
      assert.deepEqual(titles.map(title => [title.id, title.start, title.duration, title.track]), generated[0].map(title => [title.id, title.start, title.duration, title.track]))
      assert.equal(titles[0].text.replace(/\n/g, ''), '北方')
      assert.ok(titles.every(title => title.x >= 10 && title.x <= 90 && title.y < 65))
      const long = createCreatorTitles(template, { ...content, title: 'W'.repeat(100), subtitle: 'Live session '.repeat(8), design: variants[index].id }, 200, 'long', 2)[0]
      assert.ok(long.size * long.text.split('\n').length * 1.08 <= (template.ratio === '16:9' ? 250 : 430) + .01)
    }
  }
  assert.equal(resolveCreatorTitle({ ...content, design: 'album' }, 'song.wav').design, 'album')
  assert.equal(resolveCreatorTitle({ ...content, design: 'invalid' as any }, 'song.wav').design, undefined)
})
test('title times respect very short audio and timeline offsets; disabling has no titles', () => {
  for (const duration of [0.1, 1, 2, 6, 600]) {
    const titles = createCreatorTitles(templates[0], content, duration, 'audio', 2, 12)
    assert.ok(titles.every(caption => caption.start >= 12 && caption.start + caption.duration <= 12 + duration + 0.00001))
  }
  assert.deepEqual(createCreatorTitles(templates[0], { ...content, enabled: false }, 200, 'audio', 2), [])
  assert.deepEqual(createCreatorTitles(templates[0], content, NaN, 'audio', 2), [])
})
test('title fallback uses the actual audio filename and preserves multilingual text', () => {
  assert.equal(audioTitle('北方.wav'), '北方')
  assert.equal(audioTitle('After_Hours.v2.mp3'), 'After Hours.v2')
  assert.equal(audioTitle('Ngày mới.flac'), 'Ngày mới')
  assert.deepEqual(resolveCreatorTitle({ enabled: true, title: ' ', subtitle: '  Live session  ' }, '北方.wav'), { enabled: true, title: '北方', subtitle: 'Live session' })
  assert.equal(resolveCreatorTitle({ ...content, title: 'My title' }, 'song.wav').title, 'My title')
})
test('long titles wrap and reduce size without losing content', () => {
  for (const text of ['北方'.repeat(30), 'The beautiful moments we will remember forever in a song', 'W'.repeat(100), 'Ngày mới bên những người ta yêu thương']) {
    const result = fitCreatorTitle(text, 170, 4)
    assert.ok(result.text.split('\n').length <= 3)
    assert.equal(result.text.replace(/\s/g, ''), text.replace(/\s/g, ''))
    assert.ok(result.size >= 18 && result.size <= 170)
  }
})
test('adding titles does not change transcript text, timestamps, caption counts or audio', () => {
  const args: Parameters<typeof createIntelligenceSequence> = [templates[0], Array(getIntelligenceSceneCount(205)).fill('art'), 'song', 205, [{ text: '真的歌词', timestamp: [4, 8] }], 0, 0, 1, 'ai']
  const original = createIntelligenceSequence(...args)
  args[9] = content
  const result = createIntelligenceSequence(...args)
  assert.deepEqual(result.clips, original.clips)
  assert.deepEqual(result.captions.filter(caption => caption.origin === 'auto'), original.captions)
  assert.equal(result.captionCount, 1)
  assert.ok(result.captions.filter(caption => caption.creatorTitle).every(caption => caption.track! > 1))
})
test('restyling uses stable IDs, keeps edited title timings/tracks and supports rename/off', () => {
  const old = createCreatorTitles(templates[0], content, 205, 'audio', 7)
  old[0].start = 1.2; old[0].duration = 7; old[0].track = 12
  const signature = old.find(caption => caption.creatorTitlePhase === 'signature')!
  signature.text = 'Custom signature'
  const styled = restyleCreatorTitles(templates[4], content, 205, 'audio', 7, 0, old)
  assert.equal(styled.length, old.length)
  assert.equal(styled[0].id, old[0].id)
  assert.equal(styled[0].track, 12)
  assert.equal(styled[0].start, 1.2)
  assert.equal(styled[0].duration, 7)
  assert.equal(styled.find(caption => caption.id === signature.id)?.text, 'Custom signature')
  assert.equal(styled[0].font, 'Noto Sans TC')
  assert.equal(styled[0].textAlign, 'left')
  const renamed = restyleCreatorTitles(templates[4], { ...content, title: 'New title' }, 205, 'audio', 7, 0, old)
  assert.equal(renamed[0].text.replace(/\n/g, ' '), 'New title')
  assert.deepEqual(restyleCreatorTitles(templates[0], { ...content, enabled: false }, 205, 'audio', 7, 0, old), [])
})
test('canvas tracking keeps accented glyph clusters intact and deterministic positions', () => {
  const result = trackedTextLayout('a\u0301中', () => 20, 3)
  assert.deepEqual(result.positions, [{ glyph: 'a\u0301', x: 0 }, { glyph: '中', x: 23 }])
  assert.equal(result.width, 46)
  assert.deepEqual(trackedTextLayout('', () => 20, 3), { positions: [], width: 0 })
})
test('switching portrait to landscape refits title wrapping without changing its words or timing', () => {
  const draft = { enabled: true, title: 'After Hours', subtitle: 'Live session', design: 'editorial' as const }
  const portrait = createCreatorTitles(templates[0], draft, 205, 'audio', 7)
  const wide = templates.find(template => template.ratio === '16:9')!
  const expected = createCreatorTitles(wide, draft, 205, 'audio', 7)
  const changed = restyleCreatorTitles(wide, draft, 205, 'audio', 7, 0, portrait)
  assert.notEqual(portrait[0].text, expected[0].text)
  assert.equal(changed[0].text, expected[0].text)
  assert.deepEqual(changed.map(caption => [caption.id, caption.start, caption.duration, caption.track]), portrait.map(caption => [caption.id, caption.start, caption.duration, caption.track]))
})
