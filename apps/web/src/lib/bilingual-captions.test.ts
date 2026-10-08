import assert from 'node:assert/strict'
import test from 'node:test'
import { applyProfessionalLyricStyle, chineseSourceCaptions, lyricDisplayText, makeBilingualCaptions, mergeBilingualCaptions, normalizeChineseCaption, toPinyin } from './bilingual-captions.ts'
import type { Caption } from './short-video.ts'

const source: Caption = { id: 'line-1', text: '你知道嗎', start: 3, duration: 2.5, track: 1, sourceClipId: 'audio-1', origin: 'auto', x: 50, y: 70, font: 'Inter', color: '#fff', size: 88 }

test('Pinyin có dấu và giữ mốc thời gian nguồn', () => {
  assert.equal(toPinyin('你知道嗎'), 'nǐ zhī dào má')
  assert.equal(normalizeChineseCaption('故\n鄉'), '故鄉')
  const [caption] = makeBilingualCaptions([source], null, 'pinyin', 2, 3)
  assert.equal(caption.text, 'nǐ zhī dào má')
  assert.equal(caption.start, 3)
  assert.equal(caption.duration, 2.5)
  assert.equal(caption.track, 2)
})

test('Việt sub đồng bộ và không làm thay đổi nguồn', () => {
  const captions = makeBilingualCaptions([source], ['Bạn biết không?'], 'both', 2, 3)
  assert.equal(captions.length, 2)
  assert.equal(captions[1].text, 'Bạn biết không?')
  assert.equal(captions[1].track, 3)
  assert.equal(captions[1].start, source.start)
  assert.equal(source.y, 70)
  assert.throws(() => makeBilingualCaptions([source], [], 'vietnamese', 2, 3))
  assert.throws(() => makeBilingualCaptions([source], [' '], 'vietnamese', 2, 3))
})

test('Dịch lại chỉ cập nhật câu đúng ID, giữ timing, thiết kế, track và caption khác', () => {
  const old = { ...makeBilingualCaptions([source], ['Ngươi biết đấy'], 'vietnamese', 2, 3)[0], x: 42, y: 84, size: 66, track: 9, font: 'Lora Variable', color: '#eeddcc', lyricStyleVersion: 2 as const }
  const title = { ...source, id: 'title', text: '北方', origin: 'template' as const }
  const other = { ...old, id: 'other-vietnamese', text: 'Một bài hát khác', sourceClipId: 'other' }
  const result = mergeBilingualCaptions([source, old, title, other], makeBilingualCaptions([source], ['Bạn biết không?'], 'vietnamese', 2, 3))
  assert.deepEqual(result[1], { ...old, text: 'Bạn biết không?' })
  assert.deepEqual(result[0], source)
  assert.deepEqual(result[2], title)
  assert.deepEqual(result[3], other)
})

test('Chỉ lấy caption tiếng Trung tự động thuộc audio hiện tại', () => {
  const captions = [source, { ...source, id: 'english', text: 'Hello' }, { ...source, id: 'old', sourceClipId: 'other' }]
  assert.deepEqual(chineseSourceCaptions(captions, new Set(['audio-1'])).map(caption => caption.id), ['line-1'])
})

test('Thêm Pinyin trước rồi Việt sub không chồng dòng và giữ vị trí/font nguồn', () => {
  const root = { ...source, x: 42, size: 100, y: 72 }
  const first = mergeBilingualCaptions([root], makeBilingualCaptions([root], null, 'pinyin', 2, 3))
  const final = mergeBilingualCaptions(first, makeBilingualCaptions([root], ['Bạn biết không?'], 'vietnamese', 2, 3))
  assert.deepEqual(final[0], root)
  assert.deepEqual(final[1], first[1])
  assert.ok(final[1].y < final[2].y)
  assert.ok((final[2].y - final[1].y) * 1920 / 100 > (54 + 62) * 1.12 / 2 + 10)
  assert.equal(final[2].x, 42)
  assert.ok(final[2].y < 96)
  const low = { ...first[1], y: 94 }
  const moved = mergeBilingualCaptions([root, low], makeBilingualCaptions([root], ['Bạn biết không?'], 'vietnamese', 2, 3))
  assert.deepEqual(moved[1], low)
  assert.ok(moved[2].y < low.y)
  assert.ok(moved[2].y > root.y)
})

test('Hiện Việt sub theo từng nhóm mà không mất Pinyin hoặc lệch thời gian', () => {
  const second = { ...source, id: 'line-2', text: '走得越遠', start: 6 }
  const original = [source, second]
  const withPinyin = mergeBilingualCaptions(original, makeBilingualCaptions(original, null, 'pinyin', 2, 3))
  const firstGroup = mergeBilingualCaptions(withPinyin, makeBilingualCaptions([source], ['Bạn biết không?'], 'vietnamese', 2, 3))
  assert.deepEqual(firstGroup.filter(caption => caption.id.endsWith('-pinyin')), withPinyin.filter(caption => caption.id.endsWith('-pinyin')))
  assert.equal(firstGroup.filter(caption => caption.id.endsWith('-vietnamese')).length, 1)
  const secondGroup = mergeBilingualCaptions(firstGroup, makeBilingualCaptions([second], ['Càng đi xa'], 'vietnamese', 2, 3))
  assert.deepEqual(secondGroup.find(caption => caption.id === `${source.id}-vietnamese`), firstGroup.find(caption => caption.id === `${source.id}-vietnamese`))
  assert.equal(secondGroup.find(caption => caption.id === `${second.id}-vietnamese`)?.start, second.start)
  assert.equal(secondGroup.filter(caption => caption.id.endsWith('-vietnamese')).length, 2)
})

test('Ba lớp lời hát thành một cụm gọn và vẫn sửa riêng từng caption', () => {
  const group = applyProfessionalLyricStyle([source, ...makeBilingualCaptions([source], ['Bạn biết không?'], 'both', 2, 3)])
  assert.deepEqual(group.map(caption => caption.lyricStyleVersion), [2, 2, 2])
  assert.deepEqual(group.map(caption => caption.font), ['Noto Sans TC', 'Inter Variable', 'Inter Variable'])
  assert.ok(group[0].y < group[1].y && group[1].y < group[2].y)
  assert.ok(group[2].y - group[0].y < 12)
  assert.deepEqual(applyProfessionalLyricStyle(group), group)
  assert.equal(lyricDisplayText({ ...group[0], text: '故 鄉' }), '故鄉')
})
