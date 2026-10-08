import assert from 'node:assert/strict'
import test from 'node:test'
import { captionFontStack, EDITOR_FONTS, fontLoadRequests } from './font-catalog.ts'

test('font catalog có tám bộ và hai bộ hỗ trợ chữ Trung', () => {
  assert.equal(EDITOR_FONTS.length, 8)
  assert.equal(new Set(EDITOR_FONTS.map(font => font.family)).size, 8)
  assert.equal(EDITOR_FONTS.filter(font => font.category.includes('Chữ Trung')).length, 2)
})

test('font tải cho export theo family/weight và gom đủ ký tự', () => {
  const requests = fontLoadRequests([
    { font: 'Noto Serif TC Variable', text: '北方', size: 90, weight: 700 },
    { font: 'Noto Serif TC Variable', text: '故鄉', size: 75, weight: 700 },
    { font: 'Be Vietnam Pro', text: 'Tiếng Việt', size: 60, weight: 600 },
  ])
  assert.equal(requests.length, 2)
  assert.match(requests[0].css, /Noto Serif TC Variable/)
  assert.equal(requests[0].text, '北方故鄉')
  assert.equal(requests[1].text, 'Tiếng Việt')
  assert.match(captionFontStack('Sora Variable'), /Noto Sans TC/)
})
