import type { TranscriptionProgress } from './transcription'
import { auditTranslation, translateWithOllama, type TranslationOptions, type TranslationRow, type TranslationSource, type TranslationSession } from './subtitle-translation.ts'

export function translateChineseCaptions(sources: TranslationSource[], onProgress: (progress: TranscriptionProgress) => void, options: TranslationOptions, session: TranslationSession = {}) {
  if (options.engine === 'contextual') {
    const controller = new AbortController()
    const promise = translateWithOllama(sources, options, (message, progress) => onProgress({ message, progress }), controller.signal, fetch, session)
    return { promise, cancel: () => controller.abort(new DOMException('Đã hủy dịch.', 'AbortError')) }
  }
  const lines = sources.map(source => source.text)
  const worker = new Worker(new URL('../workers/translation.worker.ts', import.meta.url), { type: 'module' })
  let rejectPending: ((reason: Error) => void) | undefined
  const promise = new Promise<string[]>((resolve, reject) => {
    rejectPending = reject
    worker.onmessage = (event: MessageEvent<{ type: string; message?: string; progress?: number; translations?: string[] }>) => {
      const data = event.data
      if (data.type === 'progress') onProgress({ message: data.message ?? 'Đang dịch…', progress: data.progress })
      if (data.type === 'result') resolve(data.translations ?? [])
      if (data.type === 'error') reject(new Error(data.message ?? 'Không dịch được phụ đề.'))
    }
    worker.onerror = () => reject(new Error('Không khởi động được model dịch. Kiểm tra kết nối rồi thử lại.'))
    worker.postMessage({ lines })
  }).then(translations => {
    if (translations.length !== sources.length) throw new Error('Bản dịch nhanh không khớp số câu.')
    return translations.map((text, index): TranslationRow => ({ id: sources[index].id, text, needsReview: true, reason: auditTranslation(sources[index].text, text, 'Model nhanh dịch từng câu, không hiểu ngữ cảnh toàn bài; cần rà lại nghĩa.') }))
  }).finally(() => worker.terminate())
  return { promise, cancel: () => { worker.terminate(); rejectPending?.(new DOMException('Đã hủy dịch.', 'AbortError')) } }
}
