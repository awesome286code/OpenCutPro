import type { Caption } from '../lib/short-video'

export function CaptionTypographyControls({ caption, mixed = {}, onChange }: { caption: Caption; mixed?: Partial<Record<keyof Caption, boolean>>; onChange(key: keyof Caption, value: string | number | boolean): void }) {
  return <div className="caption-typography-controls">
    {caption.creatorTitle && <p className="creation-note">Title thiết kế · chữ này xuất cùng video.</p>}
    <div className="control-grid">
      <label className="value-control"><span>Weight</span><select aria-label="Độ đậm chữ" value={mixed.fontWeight ? '' : caption.fontWeight ?? 700} onChange={event => onChange('fontWeight', Number(event.target.value))}>{mixed.fontWeight && <option value="" disabled>Nhiều giá trị</option>}{[300, 400, 500, 600, 650, 700, 750, 800, 900].map(weight => <option key={weight} value={weight}>{weight}</option>)}</select></label>
      <label className="value-control"><span>Tracking{mixed.letterSpacing ? ' · khác nhau' : ''}</span><input aria-label="Khoảng cách chữ" type="number" min="-8" max="30" step="0.5" value={mixed.letterSpacing ? '' : caption.letterSpacing ?? 0} placeholder={mixed.letterSpacing ? 'Nhiều giá trị' : undefined} onChange={event => { if (event.target.value.trim()) onChange('letterSpacing', Math.max(-8, Math.min(30, Number(event.target.value)))) }} /></label>
    </div>
    <label className="field-label">Alignment<select aria-label="Căn lề chữ" value={mixed.textAlign ? '' : caption.textAlign ?? 'center'} onChange={event => onChange('textAlign', event.target.value)}>{mixed.textAlign && <option value="" disabled>Nhiều kiểu căn lề</option>}<option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>
  </div>
}
