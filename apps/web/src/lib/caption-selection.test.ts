import assert from 'node:assert/strict'
import test from 'node:test'
import { CAPTION_STYLE_KEYS, mixedCaptionStyles, selectedCaptions, subtitleSelection, updateCaptionSelection } from './caption-selection.ts'
import type { Caption } from './short-video.ts'

const a: Caption = { id: 'a', text: 'Lời gốc', start: 0, duration: 2, x: 50, y: 70, font: 'Noto Sans TC', size: 92, color: '#fff', track: 0, sourceClipId: 'audio', lyricStyleVersion: 2 }
const b: Caption = { ...a, id: 'b', text: 'Bản dịch', start: 3, duration: 4, font: 'Inter Variable', size: 62, y: 86, track: 1 }
const title: Caption = { ...a, id: 'title', creatorTitle: 'heading', origin: 'template' }
const current = [a, b, title]

test('Selection uses real selected IDs rather than a stale focused caption', () => {
  assert.deepEqual(selectedCaptions(current, ['a', 'b', 'missing', 'b'], 'title'), [a, b])
  assert.deepEqual(selectedCaptions(current, [], 'b'), [b])
  assert.deepEqual(selectedCaptions(current, [], 'missing'), [])
})

test('Select all subtitles or one track excludes decorative Creator titles', () => {
  assert.deepEqual(subtitleSelection(current), ['a', 'b'])
  assert.deepEqual(subtitleSelection(current, 1), ['b'])
  assert.deepEqual(subtitleSelection(current, 99), [])
})

test('Mixed properties are reported independently and normalize rendering defaults', () => {
  const mixed = mixedCaptionStyles([a, b])
  assert.equal(mixed.size, true)
  assert.equal(mixed.font, true)
  assert.equal(mixed.color, false)
  assert.equal(mixed.shadow, false)
  assert.equal(mixedCaptionStyles([a, { ...a, shadow: true, fontWeight: 700, letterSpacing: 0, textAlign: 'center' }]).fontWeight, false)
  assert.ok(Object.values(mixedCaptionStyles([])).every(value => !value))
})

test('Bulk styling updates every selected caption with no wording, timing or layout changes', () => {
  const next = updateCaptionSelection(current, ['a', 'b'], 'size', 80)
  assert.deepEqual(next, [{ ...a, size: 80 }, { ...b, size: 80 }, title])
  assert.equal(next[2], title)
  assert.deepEqual(current, [a, b, title])
  const fonts = updateCaptionSelection(next, ['a', 'b'], 'font', 'Be Vietnam Pro')
  assert.equal(fonts[0].font, 'Be Vietnam Pro')
  assert.equal(fonts[1].font, 'Be Vietnam Pro')
  assert.equal(fonts[1].y, b.y)
  assert.equal(fonts[1].lyricStyleVersion, 2)
})

test('Every supported style can be applied in one batch without changing other properties', () => {
  const values = { size: 100, font: 'Inter Variable', color: '#aabbcc', fontWeight: 500, letterSpacing: 2, textAlign: 'left', stroke: '#112233', strokeWidth: 3, shadow: false, background: '#111111cc', animation: 'fade', opacity: .8, scale: 1.2, rotation: 5, animationInDuration: .6, animationOutDuration: .4 }
  for (const key of CAPTION_STYLE_KEYS) {
    const next = updateCaptionSelection(current, ['a', 'b'], key, values[key])
    assert.deepEqual(next[0], { ...a, [key]: values[key] })
    assert.deepEqual(next[1], { ...b, [key]: values[key] })
  }
})

test('Guard against bulk content/timing edits, invalid values and no-op undo entries', () => {
  for (const key of ['text', 'start', 'duration', 'x', 'y', 'sourceClipId', 'track'] as const) assert.equal(updateCaptionSelection(current, ['a', 'b'], key, 7), current)
  assert.deepEqual(updateCaptionSelection(current, ['b'], 'text', 'Câu riêng'), [a, { ...b, text: 'Câu riêng' }, title])
  assert.equal(updateCaptionSelection(current, ['a'], 'size', NaN), current)
  assert.equal(updateCaptionSelection(current, ['a'], 'font', ''), current)
  assert.equal(updateCaptionSelection(current, ['a'], 'color', 'bad'), current)
  assert.equal(updateCaptionSelection(current, ['a'], 'size', 92), current)
  assert.equal(updateCaptionSelection(current, ['missing'], 'size', 80), current)
  assert.equal(updateCaptionSelection(current, ['a', 'b'], 'size', 999)[0].size, 240)
})
