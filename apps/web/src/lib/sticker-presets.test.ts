import assert from 'node:assert/strict'
import test from 'node:test'
import { STICKER_PRESETS, stickerSvg } from './sticker-presets.ts'

test('twelve self-contained transparent SVG stickers are usable as image overlays', () => {
  assert.equal(STICKER_PRESETS.length, 12)
  for (const preset of STICKER_PRESETS) {
    const svg = stickerSvg(preset.id)
    assert.match(svg, /viewBox="0 0 1024 1024"/)
    assert.match(svg, /<path/)
    assert.doesNotMatch(svg, /<image|href=|<script/)
  }
})
