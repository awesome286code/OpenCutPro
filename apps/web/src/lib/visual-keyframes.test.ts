import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveVisualValues, upsertVisualKeyframe } from './visual-keyframes.ts'

test('interpolates visual properties without changing the base clip', () => {
  const clip = { scale: 1, opacity: 1, visualKeyframes: [{ time: 0, values: { scale: 1, opacity: 1 } }, { time: 2, values: { scale: 2, opacity: 0 } }] }
  assert.equal(resolveVisualValues(clip, 1).scale, 1.5)
  assert.equal(resolveVisualValues(clip, 1).opacity, .5)
  assert.equal(resolveVisualValues(clip, 4).scale, 2)
  assert.equal(clip.scale, 1)
})

test('first keyframe preserves starting look and clamps edits to clip duration', () => {
  const frames = upsertVisualKeyframe({ brightness: 110 }, 6, { brightness: 80 }, 4)
  assert.deepEqual(frames.map(frame => frame.time), [0, 4])
  assert.equal(frames[0].values.brightness, 110)
  assert.equal(resolveVisualValues({ visualKeyframes: frames }, 2).brightness, 95)
})
