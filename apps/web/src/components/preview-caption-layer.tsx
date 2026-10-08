import { useLayoutEffect, useMemo, useState, type PointerEvent, type RefObject } from 'react'
import type { AspectRatio, Caption } from '../lib/short-video'
import { lyricDisplayText } from '../lib/bilingual-captions'
import { getPreviewCaptionStyle } from '../lib/caption-renderer'
import { lyricFocusTime, resolveCaptionFrames } from '../lib/lyric-scroll'

type Props = {
  captions: Caption[]; currentTime: number; isPlaying: boolean; totalDuration: number
  clock: RefObject<number>; timestamp: RefObject<number>
  previewScale: number; aspectRatio: AspectRatio; hiddenTracks: number[]; selectedId: string | null
  onDrag: (event: PointerEvent<HTMLButtonElement>, caption: Caption) => void
  onSelect: (caption: Caption, focusTime?: number) => void
}

// Keep the ribbon's display clock separate from the expensive editor/timeline
// render cadence. Seeks use exact project time; playback follows each RAF tick.
export function PreviewCaptionLayer({ captions, currentTime, isPlaying, totalDuration, clock, timestamp, previewScale, aspectRatio, hiddenTracks, selectedId, onDrag, onSelect }: Props) {
  const [displayTime, setDisplayTime] = useState(currentTime)
  const hidden = useMemo(() => new Set(hiddenTracks), [hiddenTracks])
  useLayoutEffect(() => {
    if (!isPlaying) return
    setDisplayTime(clock.current)
    let frame = 0
    const tick = (now: number) => {
      setDisplayTime(Math.min(totalDuration, clock.current + Math.max(0, (now - timestamp.current) / 1000)))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, totalDuration, clock, timestamp])
  const time = isPlaying ? displayTime : currentTime
  return <div className="preview-caption-layer" data-preview-time={time}>{resolveCaptionFrames(captions, time, caption => hidden.has(caption.track ?? 0)).map(frame => {
    const caption = frame.caption
    const context = Boolean(caption.lyricPresentation) && (time < caption.start || time >= caption.start + caption.duration || Math.abs((frame.y ?? caption.y) - caption.y) > .05)
    return <button key={caption.id} className={`preview-caption ${frame.clipBand ? 'preview-caption-ribbon' : ''} ${selectedId === caption.id ? 'selected' : ''}`}
      data-caption-id={caption.id}
      title={context ? 'Bấm để tới câu này, sau đó kéo để chỉnh vị trí' : undefined}
      onPointerDown={event => { if (context) event.stopPropagation(); else onDrag(event, caption) }}
      onClick={() => onSelect(caption, context ? lyricFocusTime(captions, caption) : undefined)}
      style={getPreviewCaptionStyle(caption, time, previewScale, aspectRatio, frame)}>{lyricDisplayText(caption)}</button>
  })}</div>
}
