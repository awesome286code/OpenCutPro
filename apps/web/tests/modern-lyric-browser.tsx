import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles.css'
import { PreviewCaptionLayer } from '../src/components/preview-caption-layer'
import { SCROLL_CREATOR_STYLES } from '../src/lib/creator-styles'
import { createIntelligenceSequence, getIntelligenceSceneCount, templateSceneDataUrl } from '../src/lib/short-video'
import { makeBilingualCaptions, applyProfessionalLyricStyle } from '../src/lib/bilingual-captions'
import { resolveCaptionFrames } from '../src/lib/lyric-scroll'
import { drawExportCaption, captionWeight } from '../src/lib/caption-renderer'
import { fontLoadRequests } from '../src/lib/font-catalog'

const duration = 12
function fixture(wide: boolean) {
  const template = SCROLL_CREATOR_STYLES.find(style => style.id === (wide ? 'creator-ink-tides-wide' : 'creator-aurora-silk'))!
  const sequence = createIntelligenceSequence(template, Array(getIntelligenceSceneCount(duration)).fill('art'), 'audio', duration,
    ['你知道被風吹過的夜晚', '走得越遠才越知道什麼叫故鄉', '願我們在明天再次相遇'].map((text, i) => ({ text, timestamp: [i * 4, (i + 1) * 4] })), 0, 0, 0, 'modern', { enabled: true, title: '北方 · Northern Lights', subtitle: 'MODERN LYRIC SCROLL', design: 'auto' })
  const sources = sequence.captions.filter(c => !c.creatorTitle)
  const captions = [...applyProfessionalLyricStyle([...sources, ...makeBilingualCaptions(sources, ['Bạn có biết đêm gió lướt qua', 'Càng đi xa, càng hiểu quê nhà', 'Mong ngày mai chúng ta lại gặp nhau'], 'both', 1, 2)]), ...sequence.captions.filter(c => c.creatorTitle)]
  return { template, captions }
}
const fixtures = [fixture(true), fixture(false)]
function App() {
  const [wide, setWide] = useState(true), [playing, setPlaying] = useState(false), [time, setTime] = useState(4.25), [status, setStatus] = useState('Ready'), [ready, setReady] = useState(false)
  const clock = useRef(4.25), timestamp = useRef(performance.now()), canvas = useRef<HTMLCanvasElement>(null), preview = useRef<HTMLDivElement>(null), rendering = useRef({ playing, time })
  rendering.current = { playing, time }
  const { template, captions } = fixtures[wide ? 0 : 1], w = wide ? 1920 : 1080, h = wide ? 1080 : 1920, scale = wide ? .275 : .27
  const seek = (next: number) => { clock.current = next; timestamp.current = performance.now(); setTime(next) }
  useEffect(() => {
    let alive = true
    Promise.all(fontLoadRequests(captions.map(c => ({ font: c.font, text: c.text, size: c.size, weight: captionWeight(c) }))).map(r => document.fonts.load(r.css, r.text))).then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [captions])
  useEffect(() => {
    if (!playing) return
    let frame = 0, lastUi = 0
    const tick = (now: number) => {
      clock.current = Math.min(duration, clock.current + (now - timestamp.current) / 1000); timestamp.current = now
      // Deliberately only 20Hz parent UI; caption layer must not inherit this.
      if (now - lastUi >= 50) { setTime(clock.current); lastUi = now }
      if (clock.current >= duration) { setTime(duration); setPlaying(false); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])
  useEffect(() => {
    let frame = 0, alive = true
    const img = new Image(); img.src = templateSceneDataUrl(template, 0)
    img.decode().then(() => {
      const ctx = canvas.current!.getContext('2d')!
      let lastTime = -1
      const draw = (now: number) => {
        const state = rendering.current
        const t = state.playing ? Math.min(duration, clock.current + Math.max(0, now - timestamp.current) / 1000) : state.time
        const cover = Math.max(w / img.width, h / img.height), dw = img.width * cover, dh = img.height * cover
        if (t !== lastTime) { ctx.clearRect(0, 0, w, h); ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); resolveCaptionFrames(captions, t).forEach(f => drawExportCaption(ctx, f.caption, t, w, h, f)); lastTime = t }
        if (alive) frame = requestAnimationFrame(draw)
      }
      if (alive) draw(performance.now())
    })
    return () => { alive = false; cancelAnimationFrame(frame) }
  }, [captions, template, ready, w, h])
  const run = () => {
    setPlaying(false); seek(2.8); setStatus('Đang đo cadence trong 2 giây…')
    const layer = preview.current!.querySelector('.preview-caption-layer')!
    let updates = 0, paints = 0, frame = 0, previous = -1, maxDelta = 0
    const observer = new MutationObserver(() => {
      const t = Number(layer.getAttribute('data-preview-time'))
      if (t > previous) { if (previous >= 0) maxDelta = Math.max(maxDelta, t - previous); updates++; previous = t }
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['data-preview-time'] })
    timestamp.current = performance.now(); setPlaying(true)
    const start = performance.now()
    const tick = (now: number) => {
      paints++
      if (now - start < 2000) { frame = requestAnimationFrame(tick); return }
      observer.disconnect(); cancelAnimationFrame(frame); setPlaying(false); seek(4.25)
      const failures: string[] = []
      if (updates / paints < .8) failures.push('Caption cadence below 80% of display refresh')
      const parent = preview.current!.getBoundingClientRect()
      for (const button of preview.current!.querySelectorAll('.preview-caption')) {
        const box = button.getBoundingClientRect()
        if (box.left < parent.left - 1 || box.right > parent.right + 1) failures.push('Text overflows preview width')
        if (!button.getAttribute('style')?.includes('translate3d')) failures.push('No compositor transform')
      }
      setStatus(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', ratio: template.ratio, displayFrames: paints, captionUpdates: updates, cadence: (updates / paints).toFixed(2), maxDeltaMs: Math.round(maxDelta * 1000), failures }, null, 2))
    }
    frame = requestAnimationFrame(tick)
  }
  return <main style={{ padding: 24, color: '#fff', background: '#15171b', minHeight: '100vh', font: '14px Inter Variable, sans-serif' }}>
    <h1>Modern lyric scroll · preview / export</h1><p>Project mẫu, không đọc/chỉnh project cá nhân. Parent UI: 20Hz · lyric layer: nhịp màn hình.</p>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '18px 0' }}>
      <button onClick={() => { setPlaying(false); seek(4.25); setWide(!wide) }}>Khung hình {wide ? '16:9' : '9:16'}</button>
      <button onClick={() => { if (playing) seek(clock.current); else timestamp.current = performance.now(); setPlaying(!playing) }}>{playing ? 'Pause demo' : 'Play demo'}</button>
      <button disabled={!ready} onClick={run}>Đo độ mượt 2 giây</button>
      <input aria-label="Tua lyric" type="range" min="0" max="11.9" step=".01" value={time} onChange={e => { setPlaying(false); seek(Number(e.target.value)) }} />
      <span>{time.toFixed(2)}s</span>
    </div>
    <pre role="status" style={{ whiteSpace: 'pre-wrap' }}>{status}</pre>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
      <section><h2>Preview · DOM / GPU transform</h2><div ref={preview} style={{ position: 'relative', width: w * scale, height: h * scale, overflow: 'hidden' }}>
        <img src={templateSceneDataUrl(template, 0)} alt="Abstract lyric artwork" style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
        <PreviewCaptionLayer captions={captions} currentTime={time} isPlaying={playing} totalDuration={duration} clock={clock} timestamp={timestamp} previewScale={w * scale / 1920} aspectRatio={template.ratio} hiddenTracks={[]} selectedId={null} onDrag={() => {}} onSelect={() => {}} />
      </div></section>
      <section><h2>Export · canvas / same frames</h2><canvas ref={canvas} width={w} height={h} style={{ width: w * scale, height: h * scale }} /></section>
    </div>
  </main>
}
const root = createRoot(document.querySelector('#root')!)
root.render(<App />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
