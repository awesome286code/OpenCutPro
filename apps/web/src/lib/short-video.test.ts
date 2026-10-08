import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SHORT_TEMPLATES, captionsToSrt, cleanAudioTranscript, createIntelligenceSequence, createTemplateSceneSvg, createTemplateSequence, exportDimensions, getIntelligenceSceneCount, suggestAudioLanguage, templateSceneDataUrl, transcriptToCaptions, withTemplateLyrics, wrapCaption } from './short-video.ts'

test('every template includes usable, distinct built-in scene artwork', () => {
  for (const template of SHORT_TEMPLATES) {
    const scenes = template.scenes.map((_, index) => createTemplateSceneSvg(template, index))
    assert.equal(new Set(scenes).size, scenes.length)
    for (let index = 0; index < scenes.length; index++) {
      assert.match(scenes[index], /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
      assert.match(scenes[index], /width="1080" height="1920"/)
      assert.match(templateSceneDataUrl(template, index), /^data:image\/svg\+xml;charset=utf-8,/)
    }
  }
  assert.throws(() => createTemplateSceneSvg(SHORT_TEMPLATES[0], 99))
})

test('short templates append scenes with real media durations and keep captions aligned', () => {
  for (const template of SHORT_TEMPLATES.filter(item => item.kind !== 'lyric')) {
    const media = template.scenes.map((_, index) => ({ id: `asset-${index}`, type: index % 2 ? 'IMAGE' : 'VIDEO', duration: 2 }))
    const result = createTemplateSequence(template, media, 18, 1, 4, template.id)
    let cursor = 18
    result.clips.forEach((clip, index) => {
      assert.equal(clip.start, cursor)
      assert.equal(result.captions[index].start, cursor)
      assert.equal(result.captions[index].duration, clip.trimEnd)
      assert.equal(result.captions[index].track, 4)
      if (media[index].type === 'VIDEO') assert.ok(clip.trimEnd <= media[index].duration)
      cursor += clip.trimEnd
    })
    assert.equal(result.duration, cursor - 18)
  }
})
test('lyric templates start at zero and time every scrolling line across a 3–4 minute video', () => {
  const lyricTemplates = SHORT_TEMPLATES.filter(item => item.kind === 'lyric')
  assert.ok(lyricTemplates.length >= 2)
  for (const template of lyricTemplates) {
    const media = template.scenes.map((scene, index) => ({ id: `art-${index}`, type: 'IMAGE', duration: scene.duration }))
    const result = createTemplateSequence(template, media, 0, 3, 2, template.id)
    const expectedDuration = template.scenes.reduce((sum, scene) => sum + scene.duration, 0)
    assert.ok(expectedDuration >= 180 && expectedDuration <= 240)
    assert.equal(result.duration, expectedDuration)
    assert.equal(result.clips[0].start, 0)
    assert.equal(result.captions[0].start, 0)
    assert.equal(result.captions.length, template.scenes.reduce((sum, scene) => sum + (scene.lyrics?.length ?? 0), 0))
    assert.ok(result.captions.every(caption => caption.animation === 'scroll' && caption.track === 2 && caption.duration > 0))
    assert.ok(result.captions.every(caption => caption.start >= 0 && caption.start + caption.duration <= expectedDuration + 0.001))
    assert.ok(result.captions.every((caption, index) => index === 0 || caption.start > result.captions[index - 1].start))
    assert.equal(result.clips.at(-1)!.start + result.clips.at(-1)!.trimEnd, expectedDuration)
  }
})
test('custom lyrics replace defaults and distribute across all music scenes', () => {
  const template = SHORT_TEMPLATES.find(item => item.kind === 'lyric')!
  const custom = withTemplateLyrics(template, [' Câu một ', 'Câu hai', 'Câu ba', 'Câu bốn', 'Câu năm'])
  assert.deepEqual(custom.scenes.map(scene => scene.lyrics?.length), [2, 1, 1, 1])
  const media = custom.scenes.map((scene, index) => ({ id: `art-${index}`, type: 'IMAGE', duration: scene.duration }))
  const captions = createTemplateSequence(custom, media, 0, 0, 0, 'custom').captions
  assert.deepEqual(captions.map(caption => caption.text), ['Câu một', 'Câu hai', 'Câu ba', 'Câu bốn', 'Câu năm'])
  assert.throws(() => withTemplateLyrics(template, ['Một câu']))
  assert.equal(withTemplateLyrics(SHORT_TEMPLATES[0], []), SHORT_TEMPLATES[0])
})
test('Intelligence Creator uses audio timestamps and never inserts template sample lyrics', () => {
  const template = SHORT_TEMPLATES.find(item => item.id === 'lyric-midnight')!
  const result = createIntelligenceSequence(template, Array.from({ length: 6 }, (_, index) => `art-${index}`), 'song', 205,
    [{ text: 'Xin chào Việt Nam', timestamp: [4, 8] }, { text: '你好世界', timestamp: [100, 104] }, { text: 'Hello world', timestamp: [199, 205] }], 1, 0, 2, 'ai')
  assert.equal(result.sceneCount, 6)
  assert.equal(result.clips.length, 7)
  assert.deepEqual(result.clips.slice(0, 6).map(clip => clip.start), Array.from({ length: 6 }, (_, index) => 205 * index / 6))
  assert.equal(result.clips[6].start, 0)
  assert.equal(result.clips[6].trimEnd, 205)
  assert.deepEqual(result.captions.map(caption => [caption.start, caption.duration]), [[4, 4], [100, 4], [199, 6]])
  assert.ok(result.captions.every(caption => caption.origin === 'auto' && caption.animation === 'scroll' && caption.sourceClipId === 'ai-audio'))
  assert.ok(result.captions.every(caption => !template.scenes.some(scene => scene.lyrics?.includes(caption.text))))
  assert.throws(() => createIntelligenceSequence(template, [], 'song', 205, [], 0, 0, 0, 'ai'))
  assert.throws(() => createIntelligenceSequence(template, Array(6).fill('art'), 'song', 205, [], 0, 0, 0, 'ai'))
  assert.equal(getIntelligenceSceneCount(413.52), 11)
  assert.match(createTemplateSceneSvg(template, 10), /width="1080" height="1920"/)
})
test('CJK captions wrap at readable character boundaries', () => {
  const text = '你好世界'.repeat(10)
  const lines = wrapCaption(text).split('\n')
  assert.deepEqual(lines.map(line => Array.from(line).length), [8, 8, 8, 8, 8])
  assert.equal(lines.join(''), text)
  assert.deepEqual(wrapCaption('你好世界真美麗今天', 18).split('\n').map(line => Array.from(line).length), [8, 1])
})
test('filename language hint and transcript guard reject music tags and runaway ASR', () => {
  assert.equal(suggestAudioLanguage('北方.wav'), 'chinese')
  assert.equal(suggestAudioLanguage('ngày-mới.wav'), 'vietnamese')
  assert.equal(suggestAudioLanguage('song.wav'), 'auto')
  const result = cleanAudioTranscript([
    { text: '[Music]', timestamp: [0, 10] },
    { text: ' 你知道嗎 ', timestamp: [10, 12] },
    { text: 'VVVVVVVVVVVVVVVVVVVVVVVV', timestamp: [12, 14] },
    { text: '走得越遠', timestamp: [14, 16] },
  ], 'chinese')
  assert.deepEqual(result.segments.map(segment => segment.text), ['你知道嗎', '走得越遠'])
  assert.equal(result.omitted, 2)
  assert.throws(() => cleanAudioTranscript([{ text: 'I am going home', timestamp: [0, 3] }], 'chinese'))
  assert.throws(() => cleanAudioTranscript(Array.from({ length: 6 }, (_, index) => ({ text: 'I am going home', timestamp: [index, index + 1] as [number, number] })), 'auto'))
})
test('templates reject incomplete or nonvisual sources', () => {
  assert.throws(() => createTemplateSequence(SHORT_TEMPLATES[0], [], 0, 0, 0, 't'))
  assert.throws(() => createTemplateSequence(SHORT_TEMPLATES[0], Array(3).fill({ id: 'a', type: 'AUDIO', duration: 5 }), 0, 0, 0, 't'))
})
test('transcript times respect trim-relative timestamps, timeline offset and playback speed', () => {
  const captions = transcriptToCaptions([{ text: 'Xin chào bạn', timestamp: [2, 6] }, { text: 'Tạm biệt', timestamp: [6, null] }], { clipId: 'voice', start: 12, sourceDuration: 8, speed: 2, timelineDuration: 4, track: 2, style: 'clean', id: 'batch' })
  assert.deepEqual(captions.map(c => [c.start, c.duration]), [[13, 2], [15, 1]])
  assert.equal(captions[0].sourceClipId, 'voice')
  assert.equal(captions[0].origin, 'auto')
})
test('empty, out-of-range and invalid transcript segments never create captions', () => {
  assert.deepEqual(transcriptToCaptions([{ text: '', timestamp: [0, 1] }, { text: 'past end', timestamp: [12, 15] }, { text: 'invalid', timestamp: [NaN, 2] }], { clipId: 'c', start: 0, sourceDuration: 4, speed: 1, timelineDuration: 4, track: 0, style: 'bold', id: 'b' }), [])
})
test('SRT uses sorted timestamps, millisecond rounding and Unicode text', () => {
  const captions = transcriptToCaptions([{ text: 'Xin chào Việt Nam', timestamp: [1.2346, 2.5] }, { text: 'Câu đầu', timestamp: [0, 1] }], { clipId: 'c', start: 0, sourceDuration: 4, speed: 1, timelineDuration: 4, track: 0, style: 'boxed', id: 'b' })
  const srt = captionsToSrt(captions)
  assert.match(srt, /^1\n00:00:00,000 --> 00:00:01,000\nCâu đầu/)
  assert.match(srt, /2\n00:00:01,235 --> 00:00:02,500\nXin chào Việt Nam/)
})
test('preview aspect choices map to even, correctly oriented export dimensions', () => {
  assert.deepEqual(exportDimensions('2k', '9:16'), { width: 1440, height: 2560 })
  assert.deepEqual(exportDimensions('1080p', '16:9'), { width: 1920, height: 1080 })
  assert.deepEqual(exportDimensions('720p', '1:1'), { width: 720, height: 720 })
})
