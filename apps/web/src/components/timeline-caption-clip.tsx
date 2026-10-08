import { Captions } from 'lucide-react'
import type { Caption } from '../lib/short-video'
import { timelineCaptionLabel, timelineSpan } from '../lib/timeline-layout'

export function TimelineCaptionClip({ caption, timelineLength, selected, onSelect }: {
  caption: Caption; timelineLength: number; selected: boolean
  onSelect(id: string, additive?: boolean): void
}) {
  const label = timelineCaptionLabel(caption.text)
  return <button
    type="button"
    data-caption-id={caption.id}
    className={`text-clip ${selected ? 'selected' : ''}`}
    style={timelineSpan(caption.start, caption.duration, timelineLength)}
    aria-label={label}
    aria-pressed={selected}
    title={`${label}\n${caption.start.toFixed(2)}s – ${(caption.start + caption.duration).toFixed(2)}s`}
    onClick={event => onSelect(caption.id, event.shiftKey || event.metaKey || event.ctrlKey)}
  >
    <span className="timeline-caption-content"><Captions size={12} aria-hidden="true" /><span className="timeline-caption-label">{label}</span></span>
  </button>
}
