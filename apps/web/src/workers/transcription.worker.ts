import { env, pipeline } from '@huggingface/transformers'
import type { TranscriptSegment } from '../lib/short-video'

// Audio remains in this worker. Only model/runtime weights are downloaded.
env.allowLocalModels = false
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1

self.onmessage = async (event: MessageEvent<{ samples: Float32Array; language: string; model: 'tiny' | 'base' }>) => {
  try {
    const { samples, language, model } = event.data
    const transcriber = await pipeline('automatic-speech-recognition', `Xenova/whisper-${model === 'tiny' ? 'tiny' : 'base'}`, {
      device: 'wasm', dtype: 'q8',
      progress_callback: (event) => {
        if (event.status === 'progress') self.postMessage({ type: 'progress', message: `Đang tải model: ${event.file}`, progress: Math.round(event.progress) })
      },
    })
    self.postMessage({ type: 'progress', message: 'Đang nghe và tạo mốc phụ đề. Bạn có thể hủy bất cứ lúc nào.' })
    try {
      const result = await transcriber(samples, { language: language === 'auto' ? undefined : language, task: 'transcribe', return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 })
      const output = Array.isArray(result) ? result[0] : result
      const segments: TranscriptSegment[] = (output.chunks?.length ? output.chunks.map(chunk => ({ text: chunk.text, timestamp: chunk.timestamp })) : output.text?.trim() ? [{ text: output.text, timestamp: [0, samples.length / 16000] }] : [])
      self.postMessage({ type: 'result', segments })
    } finally { await transcriber.dispose() }
  } catch (error) {
    self.postMessage({ type: 'error', message: `Không tạo được phụ đề: ${error instanceof Error ? error.message : String(error)}. Kiểm tra kết nối tải model hoặc thử model Nhanh.` })
  }
}
