import assert from 'node:assert/strict'
import test from 'node:test'
import { restoreSubtitleDraft, type SubtitleDraft } from './subtitle-draft.ts'
import { translationSourceSignature } from './subtitle-translation.ts'
import type { Caption } from './short-video.ts'

const source: Caption[] = [{ id: 'line-a', text: '你知道吗', start: 2, duration: 3, track: 0, sourceClipId: 'audio-a', origin: 'auto', x: 50, y: 70, size: 88, font: 'Noto Sans TC', color: '#fff' }]
const draft: SubtitleDraft = { mode: 'vietnamese', source, sourceSignature: translationSourceSignature(source), rows: [{ id: 'line-a', text: 'Bạn biết không?', needsReview: true, reason: 'Đối chiếu lời gốc', reviewed: true }], options: { engine: 'contextual', style: 'natural', notes: '' } }

test('Khôi phục bản nháp đủ/đang dịch, giữ cả chỉnh sửa và trạng thái duyệt', () => {
  assert.deepEqual(restoreSubtitleDraft(JSON.parse(JSON.stringify(draft))), draft)
  assert.deepEqual(restoreSubtitleDraft({ ...draft, rows: [] })?.rows, [])
  assert.equal(restoreSubtitleDraft({ ...draft, rows: [{ ...draft.rows[0], text: '' }] })?.rows[0].text, '')
})

test('Bỏ qua dữ liệu hỏng, ID lạ/trùng và checkpoint không khớp nguồn', () => {
  for (const value of [null, {}, { ...draft, sourceSignature: 'stale' }, { ...draft, source: [{ ...source[0], duration: NaN }] }, { ...draft, rows: [draft.rows[0], draft.rows[0]] }, { ...draft, rows: [{ ...draft.rows[0], id: 'other' }] }, { ...draft, options: { ...draft.options, engine: 'cloud' } }]) assert.equal(restoreSubtitleDraft(value), null)
})
