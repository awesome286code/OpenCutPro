import { env, pipeline } from '@huggingface/transformers'

env.allowLocalModels = false
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1
type Translator = { (text: string, options?: Record<string, number>): Promise<{ translation_text: string } | Array<{ translation_text: string }>>; dispose(): Promise<void> }

self.onmessage = async (event: MessageEvent<{ lines: string[] }>) => {
  let translator: Translator | undefined
  try {
    const lines = event.data.lines
    if (!Array.isArray(lines) || !lines.length || lines.length > 1000) throw new Error('Số câu không hợp lệ.')
    translator = await pipeline('translation', 'DanVP/HachimiMT-30-zh-vi-onnx', {
      device: 'wasm', dtype: 'q8',
      progress_callback: event => {
        if (event.status === 'progress') self.postMessage({ type: 'progress', message: `Đang tải model dịch: ${event.file}`, progress: Math.round(event.progress) })
      },
    }) as unknown as Translator
    const translations: string[] = []
    for (let index = 0; index < lines.length; index++) {
      const source = lines[index].replace(/\s*\n\s*/g, ' ').trim()
      const result = await translator(source, { max_new_tokens: 96, num_beams: 1 })
      const output = Array.isArray(result) ? result[0] : result
      const text = output.translation_text?.trim()
      if (!text) throw new Error(`Câu ${index + 1} không có bản dịch.`)
      translations.push(text)
      self.postMessage({ type: 'progress', message: `Đã dịch ${index + 1}/${lines.length} câu`, progress: Math.round((index + 1) / lines.length * 100) })
    }
    self.postMessage({ type: 'result', translations })
  } catch (error) {
    self.postMessage({ type: 'error', message: `Không dịch được Trung → Việt: ${error instanceof Error ? error.message : String(error)}` })
  } finally {
    await translator?.dispose()
  }
}
