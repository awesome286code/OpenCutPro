import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Caption } from '../lib/short-video'
import { captionFontStack, EDITOR_FONTS } from '../lib/font-catalog'
import { mixedCaptionStyles } from '../lib/caption-selection'
import { CaptionTypographyControls } from './caption-typography-controls'

function NumericStyleField({ label, value, mixed, min, max, step = 1, onChange }: { label: string; value: number; mixed?: boolean; min: number; max: number; step?: number; onChange(value: number): void }) {
  const [draft, setDraft] = useState(mixed ? '' : String(value))
  useEffect(() => { setDraft(mixed ? '' : String(value)) }, [mixed, value])
  return <label className="value-control"><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step={step} value={draft} placeholder={mixed ? 'Nhiều giá trị' : undefined} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} onBlur={() => {
    if (!draft.trim() || !Number.isFinite(Number(draft))) return setDraft(mixed ? '' : String(value))
    const next = Math.max(min, Math.min(max, Number(draft))); setDraft(String(next)); onChange(next)
  }} /></label>
}

function ToggleStyle({ label, checked, mixed, onChange }: { label: string; checked: boolean; mixed: boolean; onChange(value: boolean): void }) {
  return <label className="mute-toggle"><input type="checkbox" checked={checked} ref={element => { if (element) element.indeterminate = mixed }} onChange={event => onChange(event.target.checked)} /> {label}{mixed && <small>Khác nhau</small>}</label>
}

export function CaptionInspector({ captions, selected, focusedId, onChange, onDelete, onSelectAll, onSelectTrack }: {
  captions: Caption[]; selected: Caption[]; focusedId: string | null; onChange(key: keyof Caption, value: string | number | boolean): void
  onDelete(): void; onSelectAll(): void; onSelectTrack(track: number): void
}) {
  const caption = selected.find(item => item.id === focusedId) ?? selected[0]
  const multi = selected.length > 1
  const mixed = mixedCaptionStyles(selected)
  const subtitleCount = captions.filter(item => !item.creatorTitle).length
  const sample = caption?.text.replace(/\n/g, ' ').slice(0, 60) ?? ''
  const color = (value: string) => /^#[\da-f]{6}$/i.test(value) ? value : /^#[\da-f]{3}$/i.test(value) ? `#${[...value.slice(1)].map(char => char + char).join('')}` : '#ffffff'
  return <div className="caption-inspector">
    <div className="caption-batch-selection">
      <button className="secondary-action" disabled={!subtitleCount} onClick={onSelectAll}>Chọn toàn bộ subtitle · {subtitleCount}</button>
      {caption && <button className="secondary-action" disabled={Boolean(caption.creatorTitle)} onClick={() => onSelectTrack(caption.track ?? 0)}>Chọn subtitle cùng track</button>}
      {multi && <div className="caption-batch-summary" role="status"><b>Đang chỉnh {selected.length} caption</b><span>Mỗi thay đổi style áp dụng cho toàn bộ mục đang chọn. Nội dung, vị trí và thời gian được giữ riêng.</span></div>}
    </div>
    {!caption ? <div className="inspector-empty"><b>Chọn caption để chỉnh chữ</b><span>Kéo chọn trên timeline, Shift + click hoặc chọn toàn bộ subtitle ở trên.</span></div> : <>
      <section className="inspector-section"><h3 className="caption-inspector-section-title">{multi ? 'Chữ · chỉnh hàng loạt' : 'Caption'}</h3><div className="section-content">
        {!multi && <label className="field-label">Content<textarea aria-label="Nội dung caption" value={caption.text} onChange={event => onChange('text', event.target.value)} /></label>}
        <div className="control-grid"><NumericStyleField label="Size" value={caption.size} mixed={mixed.size} min={10} max={240} onChange={value => onChange('size', value)} /><label className="value-control"><span>Color{mixed.color ? ' · khác nhau' : ''}</span><input aria-label="Màu chữ" className="color-input" type="color" value={color(caption.color)} onChange={event => onChange('color', event.target.value)} /></label></div>
        <div className="inspector-font-picker"><label className="field-label">Font<select aria-label="Font" value={mixed.font ? '' : caption.font} onChange={event => onChange('font', event.target.value)}>
          {mixed.font && <option value="" disabled>Nhiều font · chọn để áp dụng chung</option>}
          <optgroup label="8 bộ font đã cài">{EDITOR_FONTS.map(font => <option key={font.family} value={font.family}>{font.label} · {font.category}</option>)}</optgroup>
          <optgroup label="Font hệ thống cũ"><option value="Inter">Inter (cũ)</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="monospace">Monospace</option></optgroup>
        </select></label><div className="inspector-font-sample" style={{ fontFamily: captionFontStack(caption.font) }}>{sample}</div></div>
        <CaptionTypographyControls caption={caption} mixed={mixed} onChange={onChange} />
      </div></section>
      <section className="inspector-section"><h3 className="caption-inspector-section-title">Style & animation</h3><div className="section-content">
        <div className="control-grid"><label className="value-control"><span>Stroke{mixed.stroke ? ' · khác nhau' : ''}</span><input aria-label="Màu viền chữ" className="color-input" type="color" value={color(caption.stroke ?? '#000000')} onChange={event => onChange('stroke', event.target.value)} /></label><NumericStyleField label="Width" value={caption.strokeWidth ?? 0} mixed={mixed.strokeWidth} min={0} max={12} onChange={value => onChange('strokeWidth', value)} /></div>
        <label className="field-label">Animation<select aria-label="Animation chữ" value={mixed.animation ? '' : caption.animation ?? 'none'} onChange={event => onChange('animation', event.target.value)}>{mixed.animation && <option value="" disabled>Nhiều hiệu ứng</option>}<option value="none">None</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="slide">Slide up</option><option value="scroll">Cuộn lời hát</option></select></label>
        <div className="control-grid"><NumericStyleField label="Text opacity" value={caption.opacity ?? 1} mixed={mixed.opacity} min={0} max={1} step={0.05} onChange={value => onChange('opacity', value)} /><NumericStyleField label="Text scale" value={caption.scale ?? 1} mixed={mixed.scale} min={0.1} max={4} step={0.05} onChange={value => onChange('scale', value)} /></div>
        <div className="control-grid"><NumericStyleField label="Text rotation" value={caption.rotation ?? 0} mixed={mixed.rotation} min={-180} max={180} onChange={value => onChange('rotation', value)} /><NumericStyleField label="Entrance (s)" value={caption.animationInDuration ?? .35} mixed={mixed.animationInDuration} min={0.01} max={10} step={0.05} onChange={value => onChange('animationInDuration', value)} /></div>
        <NumericStyleField label="Exit (s)" value={caption.animationOutDuration ?? 0} mixed={mixed.animationOutDuration} min={0} max={10} step={0.05} onChange={value => onChange('animationOutDuration', value)} />
        <ToggleStyle label="Shadow" checked={caption.shadow ?? true} mixed={mixed.shadow} onChange={value => onChange('shadow', value)} />
        <ToggleStyle label="Background" checked={Boolean(caption.background)} mixed={mixed.background} onChange={value => onChange('background', value ? '#111111cc' : '')} />
      </div></section>
      {!multi && <section className="inspector-section"><h3 className="caption-inspector-section-title">Position & timing</h3><div className="section-content"><div className="control-grid"><NumericStyleField label="Position X" value={caption.x} min={0} max={100} onChange={value => onChange('x', value)} /><NumericStyleField label="Position Y" value={caption.y} min={0} max={100} onChange={value => onChange('y', value)} /></div><div className="control-grid"><NumericStyleField label="Start (s)" value={caption.start} min={0} max={86400} step={0.1} onChange={value => onChange('start', value)} /><NumericStyleField label="Duration (s)" value={caption.duration} min={0.1} max={86400} step={0.1} onChange={value => onChange('duration', value)} /></div></div></section>}
      <button className="danger-action" onClick={onDelete}><Trash2 size={14} /> {multi ? `Xoá ${selected.length} caption đã chọn` : 'Delete caption'}</button>
    </>}
  </div>
}
