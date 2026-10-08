import type { TranscriptSegment } from './short-video'
import ffmpegCoreURL from '@ffmpeg/core?url'
import ffmpegWasmURL from '@ffmpeg/core/wasm?url'

export type TranscriptionProgress = { message: string; progress?: number }
export type TranscriptionOptions = { url: string; trimStart: number; trimEnd: number; language: string; model: 'tiny' | 'base' }
export function transcribeMedia(options: TranscriptionOptions, onProgress: (progress: TranscriptionProgress) => void) {
  const controller = new AbortController()
  let worker: Worker | undefined
  let encoder: { terminate(): void } | undefined
  let rejectCancelled: ((reason: Error) => void) | undefined
  const cancelled = new Promise<never>((_, reject) => { rejectCancelled = reject })
  const check = () => { if (controller.signal.aborted) throw new DOMException('Đã hủy tạo phụ đề.', 'AbortError') }
  const work = async (): Promise<{ segments: TranscriptSegment[]; duration: number }> => {
    const duration = options.trimEnd - options.trimStart
    if (!Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error('Chọn đoạn audio/video dài từ 0 đến 10 phút. Có thể chia clip dài trước khi tạo phụ đề.')
    onProgress({ message: 'Đang đọc âm thanh từ file…' })
    const response = await fetch(options.url, { signal: controller.signal })
    if (!response.ok) throw new Error('Không đọc được media. Hãy nhập lại file gốc.')
    const bytes = await response.arrayBuffer()
    check()
    const decoder = new AudioContext()
    let buffer: AudioBuffer
    let alreadyTrimmed = false
    try {
      try { buffer = await decoder.decodeAudioData(bytes.slice(0)) }
      catch {
        check()
        onProgress({ message: 'Đang tách audio từ video…' })
        const { FFmpeg } = await import('@ffmpeg/ffmpeg')
        check()
        const ffmpeg = new FFmpeg()
        encoder = ffmpeg
        try {
          await ffmpeg.load({ coreURL: ffmpegCoreURL, wasmURL: ffmpegWasmURL })
          check()
          await ffmpeg.writeFile('source', new Uint8Array(bytes))
          const code = await ffmpeg.exec(['-ss', String(options.trimStart), '-i', 'source', '-t', String(duration), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', 'speech.wav'])
          if (code !== 0) throw new Error('File không có audio có thể giải mã. Hãy thử WAV, MP3 hoặc video có tiếng.')
          const wav = await ffmpeg.readFile('speech.wav')
          if (typeof wav === 'string') throw new Error('Không đọc được audio đã tách.')
          buffer = await decoder.decodeAudioData(new Uint8Array(wav).buffer)
          alreadyTrimmed = true
        } finally { ffmpeg.terminate(); encoder = undefined }
      }
    } finally { await decoder.close() }
    check()
    const from = alreadyTrimmed ? 0 : options.trimStart
    const length = Math.min(duration, buffer.duration - from)
    if (length <= 0) throw new Error('Đoạn đã chọn nằm ngoài âm thanh của file.')
    const offline = new OfflineAudioContext(1, Math.ceil(length * 16000), 16000)
    const source = offline.createBufferSource()
    source.buffer = buffer
    source.connect(offline.destination)
    source.start(0, from, length)
    const rendered = await offline.startRendering()
    const samples = rendered.getChannelData(0).slice()
    check()
    let energy = 0
    for (const sample of samples) energy += sample * sample
    if (Math.sqrt(energy / samples.length) < 0.0001) throw new Error('Đoạn được chọn không có âm thanh đủ rõ để nhận diện.')
    onProgress({ message: 'Đang tải model nhận diện giọng nói…' })
    worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), { type: 'module' })
    const segments = await new Promise<TranscriptSegment[]>((resolve, reject) => {
      worker!.onmessage = (event: MessageEvent<{ type: string; message?: string; progress?: number; segments?: TranscriptSegment[] }>) => {
        const data = event.data
        if (data.type === 'progress') onProgress({ message: data.message ?? 'Đang nhận diện…', progress: data.progress })
        if (data.type === 'result') resolve(data.segments ?? [])
        if (data.type === 'error') reject(new Error(data.message ?? 'Nhận diện thất bại.'))
      }
      worker!.onerror = () => reject(new Error('Không khởi động được nhận diện. Hãy kiểm tra kết nối để tải model và thử lại.'))
      worker!.postMessage({ samples, language: options.language, model: options.model }, [samples.buffer])
    })
    check()
    return { segments, duration: length }
  }
  const promise = Promise.race([work(), cancelled]).finally(() => { worker?.terminate(); encoder?.terminate() })
  return { promise, cancel: () => { controller.abort(); worker?.terminate(); encoder?.terminate(); rejectCancelled?.(new DOMException('Đã hủy tạo phụ đề.', 'AbortError')) } }
}
