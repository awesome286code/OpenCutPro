import assert from 'node:assert/strict'
import test from 'node:test'
import { drawExportCaption, getPreviewCaptionStyle } from './caption-renderer.ts'
import type { Caption } from './short-video.ts'

const caption: Caption = { id: 'sub', text: '你知道嗎\nTiếng Việt có dấu', start: 0, duration: 5, font: 'Noto Sans TC', size: 92, x: 50, y: 75, color: '#fff', stroke: '#10121a', strokeWidth: 2, shadow: false }

function recorder() {
  const calls: Array<{ kind: string; text: string; width: number; shadow: string }> = []
  const context = {
    font: '', shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, lineWidth: 1, lineJoin: 'miter',
    save() {}, restore() {}, translate() {}, scale() {}, fillRect() {}, measureText(text: string) { return { width: [...text].length * 30 } },
    strokeText(text: string) { calls.push({ kind: 'stroke', text, width: this.lineWidth, shadow: this.shadowColor }) },
    fillText(text: string) { calls.push({ kind: 'fill', text, width: this.lineWidth, shadow: this.shadowColor }) },
  }
  return { context: context as unknown as CanvasRenderingContext2D, calls }
}

test('Preview fills letters above stroke, including CJK and Vietnamese accent contours', () => {
  const style = getPreviewCaptionStyle(caption, 1, 1, '16:9')
  assert.equal(style.paintOrder, 'stroke fill')
  assert.equal(style.WebkitTextStroke, '2px #10121a')
  assert.equal(style.color, caption.color)
  assert.equal(style.textShadow, 'none')
})

test('Export draws every outline first, then opaque fill with no shadow over the ink', () => {
  const { context, calls } = recorder()
  drawExportCaption(context, caption, 1, 1920, 1080)
  assert.deepEqual(calls.map(call => call.kind), ['stroke', 'stroke', 'fill', 'fill'])
  assert.ok(calls.every(call => call.shadow === 'transparent'))
  assert.equal(calls[0].width, 2)
  assert.equal(context.lineJoin, 'round')
})

test('Shadow is painted behind stroke/fill even when tracked glyphs overlap', () => {
  const { context, calls } = recorder()
  drawExportCaption(context, { ...caption, text: 'a\u0301中', letterSpacing: -8, shadow: true }, 1, 1920, 1080)
  assert.deepEqual(calls.map(call => call.kind), ['fill', 'fill', 'stroke', 'stroke', 'fill', 'fill'])
  assert.ok(calls.slice(0, 2).every(call => call.shadow !== 'transparent'))
  assert.ok(calls.slice(2).every(call => call.shadow === 'transparent'))
})

test('Preview and export use identical outline widths for portrait lyrics and regular captions', () => {
  for (const lyricStyleVersion of [undefined, 2] as const) {
    const item = { ...caption, lyricStyleVersion }
    const { context, calls } = recorder()
    drawExportCaption(context, item, 1, 1080, 1920)
    const style = getPreviewCaptionStyle(item, 1, 1080 / 1920, '9:16')
    assert.equal(parseFloat(String(style.WebkitTextStroke)), calls[0].width)
  }
})

test('Disabled or invalid stroke never inherits a previous outline', () => {
  for (const strokeWidth of [0, undefined, -2, NaN]) {
    const item = { ...caption, strokeWidth }
    assert.match(String(getPreviewCaptionStyle(item, 1, 1, '16:9').WebkitTextStroke), /^0px/)
    const { context, calls } = recorder()
    drawExportCaption(context, item, 1, 1920, 1080)
    assert.ok(calls.every(call => call.kind === 'fill'))
  }
})

test('advanced text transform and opacity match in preview and export', () => {
  const item = { ...caption, opacity: .8, scale: 1.4, rotation: 12, animation: 'fade' as const, animationInDuration: 2 }
  const { context } = recorder()
  const rotations: number[] = [], scales: number[] = []
  context.rotate = angle => rotations.push(angle)
  context.scale = value => scales.push(value)
  drawExportCaption(context, item, 1, 1920, 1080)
  const style = getPreviewCaptionStyle(item, 1, 1, '16:9')
  assert.equal(style.opacity, context.globalAlpha)
  assert.equal(style.opacity, .4)
  assert.match(String(style.transform), /rotate\(12deg\) scale\(1\.4\)/)
  assert.equal(rotations[0], 12 * Math.PI / 180)
  assert.equal(scales[0], 1.4)
})
