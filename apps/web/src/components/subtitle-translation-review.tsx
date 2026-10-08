import { useState } from 'react'
import type { Caption } from '../lib/short-video'
import { translationIsComplete, translationReviewIssues, type TranslationRow } from '../lib/subtitle-translation'
import type { SubtitleDraft } from '../lib/subtitle-draft'

export type { SubtitleDraft } from '../lib/subtitle-draft'

export function SubtitleTranslationReview({ draft, captions, busy, onChange, onApply, onDiscard, onListen }: {
  draft: SubtitleDraft; captions: Caption[]; busy: boolean
  onChange(rows: TranslationRow[]): void; onApply(): void; onDiscard(): void; onListen(source: Caption): void
}) {
  const [onlyWarnings, setOnlyWarnings] = useState(false)
  const [page, setPage] = useState(0)
  const issues = translationReviewIssues(draft.rows)
  const complete = translationIsComplete(draft.source, draft.rows)
  const flagged = draft.rows.filter(row => row.needsReview)
  const visible = draft.rows.filter(row => !onlyWarnings || row.needsReview)
  const pageCount = Math.max(1, Math.ceil(visible.length / 12))
  const activePage = Math.min(page, pageCount - 1)
  const sourceById = new Map(draft.source.map(source => [source.id, source]))
  const oldById = new Map(captions.map(caption => [caption.id, caption.text]))
  const update = (id: string, patch: Partial<TranslationRow>) => onChange(draft.rows.map(row => row.id === id ? { ...row, ...patch } : row))
  return <div className="translation-review" aria-label="Duyệt bản dịch tiếng Việt">
    <div className="translation-review-heading"><h4>Duyệt Việt sub · {draft.rows.length}/{draft.source.length} câu</h4><span>{draft.options.engine === 'contextual' ? 'Qwen3 · local' : 'Model nhanh'}</span></div>
    <p>Các câu đã dịch có thể đang hiển thị cùng Pinyin trên timeline. Câu bị cảnh báo cần nghe lại, sửa nghĩa và nhấn Áp dụng bản dịch đã duyệt trước khi xuất.</p>
    <label className="translation-review-check"><input type="checkbox" checked={onlyWarnings} onChange={event => { setOnlyWarnings(event.target.checked); setPage(0) }} /> Chỉ câu cần kiểm tra ({flagged.length})</label>
    <div className="translation-review-list">{visible.slice(activePage * 12, (activePage + 1) * 12).map(row => {
      const source = sourceById.get(row.id)!
      const old = oldById.get(`${row.id}-vietnamese`)
      return <article key={row.id} className={`translation-review-row ${row.needsReview ? 'needs-review' : ''}`}>
        <button type="button" className="translation-listen" disabled={busy} onClick={() => onListen(source)} aria-label={`Nghe câu ${source.start.toFixed(2)} giây`}>{source.start.toFixed(2)} – {(source.start + source.duration).toFixed(2)}s · Nghe / sửa lời gốc</button>
        <div className="translation-original" lang="zh">{source.text}</div>
        {old && <p className="translation-previous"><b>Bản hiện tại:</b> {old}</p>}
        <label>Việt sub mới<textarea aria-label={`Bản dịch ${row.id}`} maxLength={1600} value={row.text} disabled={busy} rows={3} onChange={event => update(row.id, { text: event.target.value, reviewed: false })} /></label>
        {row.needsReview && <><p className="translation-warning">{row.reason}</p><label className="translation-review-check"><input type="checkbox" checked={Boolean(row.reviewed)} disabled={busy || !row.text.trim() || /\[Cần kiểm tra lời gốc\]/u.test(row.text)} onChange={event => update(row.id, { reviewed: event.target.checked })} /> Tôi đã nghe và kiểm tra nghĩa câu này</label></>}
      </article>
    })}</div>
    {!visible.length && <p>{draft.rows.length ? 'Không có câu bị đánh dấu.' : 'Chưa có nhóm dịch hoàn chỉnh. Kết quả sẽ xuất hiện ở đây từng nhóm.'}</p>}
    <div className="translation-pagination"><button type="button" disabled={busy || activePage === 0} onClick={() => setPage(activePage - 1)}>Trước</button><span>{activePage + 1} / {pageCount}</span><button type="button" disabled={busy || activePage + 1 >= pageCount} onClick={() => setPage(activePage + 1)}>Tiếp</button></div>
    {issues.length > 0 && <p role="status">Còn {issues.length} câu cần sửa hoặc xác nhận. Nếu lời Trung nhận diện sai, hãy sửa lời gốc trong Inspector rồi dịch lại.</p>}
    {!complete && <p role="status">Bản nháp đã giữ {draft.rows.length} câu. Dịch đủ {draft.source.length} câu rồi duyệt để áp dụng toàn bộ.</p>}
    <button type="button" className="creation-primary" disabled={busy || !complete || issues.length > 0} onClick={onApply}>{busy ? 'Đang xử lý…' : 'Áp dụng bản dịch đã duyệt'}</button>
    <button type="button" className="creation-secondary" disabled={busy} onClick={onDiscard}>Bỏ bản nháp · giữ Việt sub hiện tại</button>
  </div>
}
