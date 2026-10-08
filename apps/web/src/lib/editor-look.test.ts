import assert from 'node:assert/strict'
import test from 'node:test'
import { EFFECT_PRESETS, FILTER_PRESETS, transitionVisual, visualFilter } from './editor-look.ts'

test('visual look uses one CSS/canvas filter string and independent effect intensity', () => {
  assert.equal(visualFilter({}), 'brightness(100.00%) contrast(100.00%) saturate(100.00%) sepia(0.00%) hue-rotate(0.00deg)')
  assert.equal(visualFilter({ brightness: 95, effect: 'glow', effectStrength: 0 }), visualFilter({ brightness: 95 }))
  assert.notEqual(visualFilter({ effect: 'glow', effectStrength: 100 }), visualFilter({ effect: 'noir', effectStrength: 100 }))
  assert.equal(FILTER_PRESETS.length, 12)
  assert.equal(EFFECT_PRESETS.length, 8)
})

test('slide enters from right without fading; dissolve blends both sides', () => {
  assert.deepEqual(transitionVisual('slide', 0), { incomingOpacity: 1, outgoingOpacity: 1, incomingOffset: 1, incomingOffsetY: 0 })
  assert.deepEqual(transitionVisual('slide', 1), { incomingOpacity: 1, outgoingOpacity: 1, incomingOffset: 0, incomingOffsetY: 0 })
  assert.deepEqual(transitionVisual('dissolve', .25), { incomingOpacity: .25, outgoingOpacity: 1, incomingOffset: 0, incomingOffsetY: 0 })
  assert.equal(transitionVisual('slide', .5, 'ease-in', 'up').incomingOffsetY, -.75)
})
