import { test } from 'node:test'
import assert from 'node:assert/strict'
import { timelineCaptionLabel, timelineContentWidth, timelineSpan } from './timeline-layout.ts'

test('dense captions keep their real duration without an artificial minimum width', () => {
  const length = 413
  for (let index = 0; index < 133; index++) {
    const span = timelineSpan(index * 3, 3, length)
    assert.ok(Number.parseFloat(span.width) < 1)
    const end = Number.parseFloat(span.left) + Number.parseFloat(span.width)
    const next = Number.parseFloat(timelineSpan(index * 3 + 3, 3, length).left)
    assert.ok(Math.abs(end - next) < 1e-10)
  }
})

test('timeline spans bound invalid or partially out-of-range times', () => {
  assert.deepEqual(timelineSpan(-2, 5, 10), { left: '0%', width: '30%' })
  assert.deepEqual(timelineSpan(8, 5, 10), { left: '80%', width: '20%' })
  assert.deepEqual(timelineSpan(12, 5, 10), { left: '100%', width: '0%' })
  assert.deepEqual(timelineSpan(2, -1, 10), { left: '20%', width: '0%' })
  assert.deepEqual(timelineSpan(NaN, NaN, 0), { left: '0%', width: '0%' })
})

test('zoom expands long timelines but keeps short projects usable', () => {
  assert.equal(timelineContentWidth(8, 72), 920)
  assert.equal(timelineContentWidth(413, 72), 6073.2)
  assert.ok(timelineContentWidth(413, 120) > timelineContentWidth(413, 72))
  assert.ok(timelineContentWidth(413, 400) > timelineContentWidth(413, 120))
  assert.equal(timelineContentWidth(NaN, NaN), 920)
})

test('timeline labels flatten line breaks without changing Unicode subtitle content', () => {
  assert.equal(timelineCaptionLabel('风经过\n光留下'), '风经过 光留下')
  assert.equal(timelineCaptionLabel('  nǐ zhī\n dào má  '), 'nǐ zhī dào má')
  assert.equal(timelineCaptionLabel('Gió đi qua,\nánh sáng ở lại'), 'Gió đi qua, ánh sáng ở lại')
})
