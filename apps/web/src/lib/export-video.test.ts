import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseRecorderMime, isExportBitrate, mp4ExportArgs, recommendedExportBitrate, recorderVideoBitrate } from './export-video.ts'

test('2K selects a high bitrate at both frame rates and keeps imported settings valid', () => {
  assert.equal(recommendedExportBitrate('2k', 30), '24')
  assert.equal(recommendedExportBitrate('2k', 60), '32')
  assert.equal(recommendedExportBitrate('1080p', 30), '8')
  assert.equal(isExportBitrate('24'), true)
  assert.equal(isExportBitrate('32'), true)
  assert.equal(isExportBitrate('64'), false)
  assert.equal(recorderVideoBitrate('24'), 30_000_000)
  assert.equal(recorderVideoBitrate('24', false), 24_000_000)
})

test('native H.264 MP4 is preferred when supported, with WebM as a fallback', () => {
  const supported = new Set(['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/webm;codecs=vp8,opus'])
  assert.equal(chooseRecorderMime('mp4', true, mime => supported.has(mime)), 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"')
  assert.equal(chooseRecorderMime('webm', true, mime => supported.has(mime)), 'video/webm;codecs=vp8,opus')
  assert.equal(chooseRecorderMime('mp4', true, mime => mime.startsWith('video/webm')), 'video/webm;codecs=vp8,opus')
  assert.equal(chooseRecorderMime('mp4', true, mime => supported.has(mime), true), 'video/webm;codecs=vp8,opus')
})

test('MP4 2K profile retains detail and compatible playback settings', () => {
  const args = mp4ExportArgs(60, '32', 'high', 12)
  assert.deepEqual(args.slice(0, 6), ['-i', 'opencut-input.webm', '-map', '0:v:0', '-map', '0:a:0?'])
  assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p')
  assert.equal(args[args.indexOf('-preset') + 1], 'veryfast')
  assert.equal(args[args.indexOf('-b:v') + 1], '32M')
  assert.equal(args[args.indexOf('-r') + 1], '60')
  assert.equal(args[args.indexOf('-b:a') + 1], '256k')
  assert.equal(args[args.indexOf('-movflags') + 1], '+faststart')
})
