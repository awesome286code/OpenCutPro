import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Captions, Download, Music2, Sparkles, Undo2, Upload, WandSparkles, X } from 'lucide-react'
import { SHORT_TEMPLATES, templateSceneDataUrl, type AspectRatio, type Caption, type ShortTemplate } from '../lib/short-video'
import type { TranscriptionProgress } from '../lib/transcription'
import type { SubtitleMode } from '../lib/bilingual-captions'
import { CREATOR_STYLES, type CreatorCollection } from '../lib/creator-styles'
import { captionFontStack } from '../lib/font-catalog'
import { audioTitle, CREATOR_TITLE_PRESETS, createCreatorTitles, creatorTitleDesign, type CreatorTitleContent } from '../lib/creator-titles'
import type { TranslationOptions, TranslationRow } from '../lib/subtitle-translation'
import { SubtitleTranslationReview, type SubtitleDraft } from './subtitle-translation-review'

export function TemplatePanel({ onApply, onUndo, canUndo }: {
  onApply(template: ShortTemplate, lyricLines?: string[]): Promise<void>; onUndo(): void; canUndo: boolean
}) {
  const [selected, setSelected] = useState(SHORT_TEMPLATES[0].id)
  const [busy, setBusy] = useState(false)
  const [lyricDrafts, setLyricDrafts] = useState<Record<string, string>>({})
  const template = SHORT_TEMPLATES.find(t => t.id === selected)!
  const lyricText = lyricDrafts[template.id] ?? template.scenes.flatMap(scene => scene.lyrics ?? []).join('\n')
  const lyricLines = lyricText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const templateDuration = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`
  return <div className="creation-panel">
    <div className="creation-intro"><span className="creation-kicker">VIDEO TEMPLATE STUDIO</span><h3>Bắt đầu từ một ý tưởng</h3><p>Chọn mẫu và nhấn Import. Cảnh, hình nền và chữ sẽ xuất hiện trên timeline để bạn chỉnh sửa; có cả mẫu ca nhạc dài 3–4 phút.</p></div>
    <div className="short-template-grid">{SHORT_TEMPLATES.map(t => <button key={t.id} aria-pressed={selected === t.id} className={`short-template-card ${selected === t.id ? 'selected' : ''}`} style={{ '--template-accent': t.accent } as CSSProperties} onClick={() => setSelected(t.id)}>
      <span className={`short-template-poster poster-${t.id}`}><img src={templateSceneDataUrl(t, 0)} alt="" /><span>{t.category}</span><strong>{t.scenes[0].text}</strong><small>{templateDuration(t.scenes.reduce((sum, s) => sum + s.duration, 0))} · {t.scenes.length} cảnh</small></span><b>{t.name}</b>
    </button>)}</div>
    <div className="creation-section"><h4>{template.name}</h4><p>{template.description} · {template.ratio} · {templateDuration(template.scenes.reduce((sum, scene) => sum + scene.duration, 0))}</p>
      <div className="template-scene-list">{template.scenes.map((scene, index) => <div key={`${template.id}-${index}`} className="template-scene-row"><img src={templateSceneDataUrl(template, index)} alt="" /><span><b>{String(index + 1).padStart(2, '0')} · {scene.label}</b><small>{scene.lyrics ? `${scene.lyrics.length} câu lời hát · cuộn theo thời gian` : scene.text.replace(/\n/g, ' ')}</small></span><time>{scene.duration}s</time></div>)}</div>
      {template.kind === 'lyric' && <label className="template-lyrics-label">Lời hát mẫu · {lyricLines.length} câu<textarea className="template-lyrics-input" aria-label="Lời hát cho template" value={lyricText} onChange={event => setLyricDrafts(current => ({ ...current, [template.id]: event.target.value }))} spellCheck={false} /><small>Mỗi dòng là một câu. 4–80 câu sẽ tự chia đều theo các cảnh; sau import vẫn sửa được từng câu.</small></label>}
      <p className="creation-note">Mẫu luôn bắt đầu từ 00:00. Với project đã chỉnh sửa, toàn bộ nội dung cũ được dời về sau mẫu và có thể hoàn tác. {template.kind === 'lyric' ? 'Ảnh nền và lời hát mẫu đã có sẵn; hãy thay lời ở ô phía trên rồi thêm bài hát của bạn vào Audio track để đồng bộ.' : 'Bạn có thể kéo cảnh, sửa chữ, thời lượng, hiệu ứng và thay media.'}</p>
      <button className="creation-primary" disabled={busy || (template.kind === 'lyric' && (lyricLines.length < template.scenes.length || lyricLines.length > 80))} onClick={() => { setBusy(true); void onApply(template, template.kind === 'lyric' ? lyricLines : undefined).finally(() => setBusy(false)) }}><Sparkles size={15} /> {busy ? 'Đang import…' : 'Import template'}</button>
      {canUndo && <button className="creation-secondary" onClick={onUndo}><Undo2 size={14} /> Hoàn tác thêm mẫu</button>}
    </div>
  </div>
}

function CreatorStylePoster({ template, scene = 0, content, titleOnly = false }: { template: ShortTemplate; scene?: number; content?: CreatorTitleContent; titleOnly?: boolean }) {
  const artwork = useMemo(() => templateSceneDataUrl(template, scene), [template, scene])
  const sample = template.creator?.sample ?? { original: 'Lời ca ở lại', translation: 'A song to remember.' }
  const titles = createCreatorTitles(template, content?.title.trim() ? content : { enabled: content?.enabled ?? true, title: creatorTitleDesign(template, content?.design).sample, subtitle: content?.subtitle ?? 'LYRIC FILM', design: content?.design }, 200, 'poster', 0)
    .filter(caption => caption.creatorTitlePhase === (scene === 0 ? 'opening' : scene === 3 ? 'closing' : 'signature'))
  const designWidth = template.ratio === '16:9' ? 19.2 : 10.8
  const scrolling = Boolean(template.creator?.lyricPresentation)
  return <div className={`creator-style-poster ${template.ratio === '16:9' ? 'creator-poster-wide' : ''} ${template.creator?.artworkImage ? 'creator-raster-poster' : ''} ${template.id.includes('paper-moon') || template.creator?.collection === 'handmade' || template.id.includes('xinjiang-turpan') || template.id.includes('xinjiang-girl-kashgar') ? 'creator-natural-paper' : ''} ${template.creator?.lyricPresentation === 'spotlight' ? 'creator-spotlight' : ''} ${template.creator?.lyricPresentation === 'lyric-cards' ? 'creator-lyric-cards' : ''}`} style={{ '--style-ink': template.caption.color } as CSSProperties}>
    <img src={artwork} alt="" loading="lazy" />
    {titles.map(caption => <span key={caption.id} className="creator-poster-title" style={{ left: `${caption.x}%`, top: `${caption.y}%`, transform: `translate(${caption.textAlign === 'left' ? '0' : '-50%'}, -50%)`, textAlign: caption.textAlign, color: caption.color, fontFamily: captionFontStack(caption.font), fontWeight: caption.fontWeight, fontSize: `${caption.size / designWidth}cqw`, letterSpacing: `${(caption.letterSpacing ?? 0) / designWidth}cqw`, textShadow: caption.shadow ? '0 1px 3px #0006' : 'none', background: caption.background, padding: caption.background ? '2px 4px' : undefined, WebkitTextStroke: `${(caption.strokeWidth ?? 0) / designWidth}cqw ${caption.stroke ?? template.accent}`, paintOrder: 'stroke fill' }}>{caption.text}</span>)}
    {!titleOnly && scrolling && template.creator?.lyricPresentation !== 'lyric-cards' && <>{template.creator?.collection !== 'portrait' && <div className="creator-scroll-context previous" style={{ top: `${template.caption.y - 16}%` }}>{sample.pinyin ? '听见风的声音' : 'Let the music carry you'}</div>}<div className="creator-scroll-context next" style={{ top: `${Math.min(89, template.caption.y + 23)}%` }}>{sample.pinyin ? '让旋律慢慢流动' : 'Stay for one more melody'}</div></>}
    {!titleOnly && <div className={`creator-sample ${scrolling ? 'creator-scroll-sample' : ''}`} style={{ top: `${template.caption.y}%`, color: template.caption.color, fontFamily: captionFontStack(template.caption.font ?? 'Inter Variable') }}>
      <b>{sample.original}</b>
      {sample.pinyin && <small style={{ color: template.creator?.pinyinColor, fontFamily: captionFontStack(template.creator?.latinFont ?? 'Inter Variable') }}>{sample.pinyin}</small>}
      <small style={{ color: template.creator?.translationColor, fontFamily: captionFontStack(template.creator?.latinFont ?? 'Inter Variable') }}>{sample.translation}</small>
    </div>}
  </div>
}

export function IntelligenceCreatorPanel({ busy, ready, progress, error, result, sourceCount, derivedCount, subtitleBusy, subtitleApplying, subtitleProgress, subtitleError, onCreate, onCancel, onGenerateSubtitles, onCancelSubtitles, onResumeSubtitles, onShowTranslation, canApplyStyle, styleBusy, onApplyStyle, onApplyTitle, currentTitle, currentRatio, currentStyleId, subtitleDraft, captions, onReviewChange, onApplyTranslation, onDiscardTranslation, onListenCaption }: {
  busy: boolean; ready: boolean; progress: TranscriptionProgress | null; error: string | null
  result: { name: string; duration: number; captionCount: number; language: string; omitted: number } | null
  onCreate(file: File, template: ShortTemplate, language: string, title: CreatorTitleContent): void; onCancel(): void
  sourceCount: number; derivedCount: { pinyin: number; vietnamese: number }; subtitleBusy: boolean; subtitleApplying: boolean; subtitleProgress: TranscriptionProgress | null; subtitleError: string | null
  onGenerateSubtitles(mode: SubtitleMode, options: TranslationOptions): void; onCancelSubtitles(): void; onResumeSubtitles(autoApply: boolean): void; onShowTranslation(): void
  subtitleDraft: SubtitleDraft | null; captions: Caption[]; onReviewChange(rows: TranslationRow[]): void; onApplyTranslation(): void; onDiscardTranslation(): void; onListenCaption(caption: Caption): void
  canApplyStyle: boolean; styleBusy: boolean; onApplyStyle(template: ShortTemplate, title: CreatorTitleContent): void
  onApplyTitle(title: CreatorTitleContent): void; currentTitle: CreatorTitleContent; currentRatio: AspectRatio; currentStyleId?: string
}) {
  const presets = [...CREATOR_STYLES, ...SHORT_TEMPLATES.filter(template => template.kind === 'lyric')]
  const [selected, setSelected] = useState(currentStyleId ?? presets.find(preset => preset.ratio === currentRatio)?.id ?? presets[0].id)
  const [ratio, setRatio] = useState<AspectRatio>(currentRatio === '16:9' ? '16:9' : '9:16')
  const [collection, setCollection] = useState<CreatorCollection | 'all' | 'music'>('all')
  const [previewScene, setPreviewScene] = useState(0)
  const [language, setLanguage] = useState('auto')
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('both')
  const [translationOptions, setTranslationOptions] = useState<TranslationOptions>({ engine: 'contextual', style: 'natural', notes: '', autoApply: true })
  const [titleContent, setTitleContent] = useState(currentTitle)
  useEffect(() => { setTitleContent({ enabled: currentTitle.enabled, title: currentTitle.title, subtitle: currentTitle.subtitle, design: currentTitle.design }) }, [currentTitle.enabled, currentTitle.title, currentTitle.subtitle, currentTitle.design])
  useEffect(() => { if (currentStyleId && presets.some(preset => preset.id === currentStyleId)) { setSelected(currentStyleId); setRatio(presets.find(preset => preset.id === currentStyleId)!.ratio); setCollection('all') } }, [currentStyleId])
  useEffect(() => { const format = currentRatio === '16:9' ? '16:9' : '9:16'; setRatio(format); if (presets.find(preset => preset.id === currentStyleId)?.ratio !== format) setSelected(presets.find(preset => preset.ratio === format)!.id); setCollection('all') }, [currentRatio])
  const inputRef = useRef<HTMLInputElement>(null)
  const template = presets.find(preset => preset.id === selected) ?? presets[0]
  const visiblePresets = presets.filter(preset => preset.ratio === ratio && (collection === 'all' || (preset.creator?.collection ?? 'music') === collection))
  const locked = busy || styleBusy || subtitleBusy || subtitleApplying
  return <div className="creation-panel intelligence-panel">
    <div className="creation-intro"><span className="creation-kicker">INTELLIGENCE CREATOR</span><h3>Audio thành video có lời</h3><p>Chọn bài hát hoặc bản thu âm. Hệ thống tự nhận diện lời, dựng cảnh nền và đặt phụ đề đúng mốc thời gian trên timeline.</p></div>
    <div className="creation-section creator-gallery">
      <div className="creator-gallery-heading"><h4>Phong cách video</h4><span>{presets.length} styles</span></div>
      <p>Chọn hướng thiết kế phù hợp với bài hát và khách hàng. Tất cả đều hỗ trợ chữ Trung, Việt và Anh.</p>
      <div className="creator-format-tabs" aria-label="Định dạng phong cách video">{(['9:16', '16:9'] as const).map(format => <button type="button" key={format} disabled={locked} aria-pressed={ratio === format} onClick={() => { setRatio(format); setCollection('all'); setSelected(presets.find(preset => preset.ratio === format)!.id); setPreviewScene(0) }}><span className={`format-frame ${format === '16:9' ? 'wide' : ''}`} /><span><b>{format === '16:9' ? '16:9 · Video ngang' : '9:16 · Video dọc'}</b><small>{format === '16:9' ? 'YouTube · Lyric film' : 'Shorts · Reels · TikTok'}</small></span></button>)}</div>
      <div className={`creator-selected-style ${template.ratio === '16:9' ? 'creator-selected-wide' : ''}`}>
        <CreatorStylePoster template={template} scene={previewScene} content={titleContent} />
        <div className="creator-style-detail"><span className="creation-kicker">ĐANG CHỌN</span><h4>{template.name}</h4><p>{template.description}</p><div className="creator-style-tags">{(template.creator?.tags ?? ['Music', 'Lyrics']).map(tag => <span key={tag}>{tag}</span>)}</div></div>
      </div>
      <div className="creator-scene-tabs" aria-label="Xem các cảnh nền">{template.scenes.map((_, index) => <button type="button" key={index} aria-pressed={previewScene === index} onClick={() => setPreviewScene(index)}>Cảnh {index + 1}</button>)}</div>
      {template.creator?.lyricPresentation && <p className="creator-scroll-note">{template.creator.lyricPresentation === 'lyric-cards' ? 'Lyric cards · từng câu chuyển mềm theo nhịp, lớp lời gốc/Pinyin/Việt đi cùng nhau.' : template.creator.lyricPresentation === 'spotlight' ? 'Lyric spotlight · câu đang hát rõ và lớn hơn, câu lân cận lùi nhẹ, mờ dần.' : 'Modern lyric scroll · dải lời trượt mềm, câu đang hát nổi bật, các câu lân cận mờ dần.'} Giữ mốc thời gian audio; preview và export dùng cùng chuyển động.</p>}
      <div className="creator-title-editor">
        <label className="creator-title-toggle"><input type="checkbox" checked={titleContent.enabled} disabled={locked} onChange={event => setTitleContent(content => ({ ...content, enabled: event.target.checked }))} /><span><b>Title thiết kế theo phong cách</b><small>Mở đầu · tên bài hát · đoạn kết</small></span></label>
        <div className="creator-title-design-heading"><b>Kiểu title</b><span>{CREATOR_TITLE_PRESETS.length - 1} thiết kế + tự động</span></div>
        <div className="creator-title-design-grid" aria-label="Bộ sưu tập title">{CREATOR_TITLE_PRESETS.map(preset => <button type="button" key={preset.id} aria-label={`Chọn title ${preset.name}`} aria-pressed={(titleContent.design ?? 'auto') === preset.id} disabled={locked || !titleContent.enabled} onClick={() => setTitleContent(content => ({ ...content, design: preset.id }))}>
          <CreatorStylePoster template={{ ...template, ratio: '16:9' }} content={{ ...titleContent, enabled: true, design: preset.id }} titleOnly /><b>{preset.name}</b><small>{preset.description}</small>
        </button>)}</div>
        <label>Tên bài hát<input aria-label="Tên bài hát cho title" maxLength={100} value={titleContent.title} placeholder="Để trống: dùng tên file audio" disabled={locked || !titleContent.enabled} onChange={event => setTitleContent(content => ({ ...content, title: event.target.value }))} /></label>
        <label>Ca sĩ / dòng phụ <span className="creator-optional">tuỳ chọn</span><input aria-label="Dòng phụ cho title" maxLength={100} value={titleContent.subtitle} placeholder="Tên ca sĩ, album hoặc thông điệp của bạn" disabled={locked || !titleContent.enabled} onChange={event => setTitleContent(content => ({ ...content, subtitle: event.target.value }))} /></label>
        <p className="creation-note">Title được thêm vào các track riêng, sửa và kéo trực tiếp trong preview hoặc Inspector, xuất cùng video. Lời gốc, Pinyin và Việt sub vẫn lấy từ audio.</p>
        <button type="button" className="creation-secondary" disabled={!ready || !canApplyStyle || locked} onClick={() => onApplyTitle(titleContent)}>Áp dụng riêng title · giữ nền & tỷ lệ hiện tại</button>
      </div>
      <button type="button" className="creation-secondary creator-apply-style" disabled={!ready || !canApplyStyle || locked} onClick={() => onApplyStyle(template, titleContent)}><Sparkles size={14} /> {styleBusy ? 'Đang đổi phong cách…' : 'Áp dụng phong cách & title'}</button>
      {!canApplyStyle && <p className="creation-note">Chọn audio bên dưới để tạo video mới với phong cách này.</p>}
      <div className="creator-collection-tabs" aria-label="Bộ sưu tập phong cách">{([{ id: 'all', label: 'Tất cả' }, { id: 'chinese', label: 'Hoa ngữ' }, { id: 'european', label: 'Châu Âu' }, { id: 'global', label: 'Quốc tế' }, { id: 'music', label: 'Ca nhạc · Cuộn lời' }, { id: 'portrait', label: 'Chân dung · Muse' }, { id: 'special', label: 'Special Edition' }, { id: 'handmade', label: 'Handmade · Thủ công' }, { id: 'xinjiang', label: 'Tân Cương · Vẽ tay' }] as const).map(group => <button type="button" key={group.id} aria-pressed={collection === group.id} disabled={locked} onClick={() => setCollection(group.id)}>{group.label}</button>)}</div>
      <div className={`intelligence-style-grid ${ratio === '16:9' ? 'intelligence-style-grid-wide' : ''}`}>{visiblePresets.map(preset => <button key={preset.id} type="button" aria-label={`Chọn phong cách ${preset.name}`} aria-pressed={selected === preset.id} className={`intelligence-style ${selected === preset.id ? 'selected' : ''}`} style={{ '--style-accent': preset.accent } as CSSProperties} disabled={locked} onClick={() => { setSelected(preset.id); setPreviewScene(0) }}><CreatorStylePoster template={preset} content={titleContent} /><span className="intelligence-style-copy"><b>{preset.name}</b><small>{preset.category} · {preset.ratio}</small></span>{selected === preset.id && <i className="creator-selected-badge">Đã chọn</i>}</button>)}</div>
    </div>
    <div className="creation-section"><h4>Thêm audio</h4><p>Phụ đề lấy từ giọng trong file audio, không dùng lời mẫu. Chế độ tự động ưu tiên ngôn ngữ gợi ý từ tên file (ví dụ tên chữ Hán → 中文), sau đó bạn vẫn có thể chọn lại nếu cần.</p>
      <label>Ngôn ngữ lời<select aria-label="Intelligence language" disabled={locked} value={language} onChange={event => setLanguage(event.target.value)}><option value="auto">Tự động · Việt / Anh / Trung</option><option value="chinese">中文 · Tiếng Trung</option><option value="vietnamese">Tiếng Việt</option><option value="english">English</option></select></label>
      <input ref={inputRef} className="file-input" type="file" accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg" aria-label="Chọn audio để tự tạo video" disabled={locked || !ready} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) { const content = { ...titleContent, title: titleContent.title === currentTitle.title ? audioTitle(file.name) : titleContent.title }; setTitleContent(content); onCreate(file, template, language, content) } }} />
      {!busy && <button className="creation-primary intelligence-upload" disabled={!ready || locked} onClick={() => inputRef.current?.click()}><WandSparkles size={17} /> Chọn audio và tự tạo video</button>}
      {busy && <div className="caption-job" role="status"><span>{progress?.message ?? 'Đang chuẩn bị audio…'}</span>{progress?.progress !== undefined ? <progress max={100} value={progress.progress} /> : <progress />}<button className="creation-secondary" onClick={onCancel}><X size={14} /> Hủy xử lý</button></div>}
      {error && <p className="creation-error" role="alert">{error}</p>}
      {result && <div className="intelligence-result" role="status"><Music2 size={16} /><span><b>Đã tạo: {result.name}</b><small>{Math.floor(result.duration / 60)}:{String(Math.floor(result.duration % 60)).padStart(2, '0')} · {result.language} · {result.captionCount} câu phụ đề{result.omitted ? ` · bỏ ${result.omitted} đoạn không rõ` : ''}</small></span></div>}
      <p className="creation-note">Video mới có đúng thời lượng audio. Timeline cũ được lưu vào Version history trước khi thay thế. Lần đầu cần Internet để tải model; giọng hát có nhạc nền lớn vẫn có thể nhận diện sai, nên rà lại phụ đề trước khi xuất.</p>
    </div>
    <div className="creation-section intelligence-subtitles"><h4>Pinyin & Việt sub</h4><p>Dùng {sourceCount} câu tiếng Trung đang có trên timeline. Không nhận diện lại file audio; mỗi ngôn ngữ nằm trên track riêng để chỉnh từng câu trong Inspector.</p>
      <label>Thêm lớp phụ đề<select aria-label="Loại phụ đề bổ sung" value={subtitleMode} disabled={locked} onChange={event => setSubtitleMode(event.target.value as SubtitleMode)}><option value="both">Pinyin + tiếng Việt</option><option value="pinyin">Chỉ Pinyin</option><option value="vietnamese">Chỉ tiếng Việt</option></select></label>
      {subtitleMode !== 'pinyin' && <div className="translation-options">
        <label>Phương pháp dịch<select aria-label="Phương pháp dịch Việt sub" value={translationOptions.engine} disabled={locked} onChange={event => setTranslationOptions(options => ({ ...options, engine: event.target.value as TranslationOptions['engine'] }))}><option value="contextual">Theo ngữ cảnh · Qwen3 8B local</option><option value="fast">Model nhỏ · dịch từng câu (cần rà kỹ)</option></select></label>
        <label>Giọng văn<select aria-label="Giọng văn Việt sub" value={translationOptions.style} disabled={locked || translationOptions.engine === 'fast'} onChange={event => setTranslationOptions(options => ({ ...options, style: event.target.value as TranslationOptions['style'] }))}><option value="natural">Tự nhiên · tiếng Việt đương đại</option><option value="lyrical">Ca nhạc · mềm mại, giữ đúng ý</option><option value="literal">Sát nghĩa · ưu tiên nội dung gốc</option></select></label>
        <label>Ngữ cảnh / cách xưng hô <span className="creator-optional">tuỳ chọn</span><textarea aria-label="Ngữ cảnh bản dịch" maxLength={800} rows={3} placeholder="Ví dụ: người con nhớ quê, xưng tôi; không dùng anh/em." value={translationOptions.notes} disabled={locked || translationOptions.engine === 'fast'} onChange={event => setTranslationOptions(options => ({ ...options, notes: event.target.value }))} /></label>
        <p className="creation-note">{translationOptions.engine === 'contextual' ? 'Dịch theo câu trước/sau, rồi đối chiếu nghĩa và biên tập lần nữa. Cần Ollama chạy qwen3:8b trên máy; không gửi lời hát lên dịch vụ bên ngoài. Bài dài có thể xử lý nhiều phút; bạn có thể hủy bất cứ lúc nào.' : 'Model nhỏ không hiểu ngữ cảnh toàn bài; không áp dụng giọng văn/ghi chú và có thể dịch sai lời hát. Mọi câu đều cần bạn duyệt.'}</p>
      </div>}
      <div className="subtitle-track-summary"><span>中文 · {sourceCount} câu</span><span>Pinyin · {derivedCount.pinyin} câu</span><span>Việt sub · {derivedCount.vietnamese} câu</span></div>
      {subtitleMode !== 'pinyin' && <label className="translation-review-check"><input type="checkbox" aria-label="Tự hiện Việt sub cùng Pinyin khi có câu dịch" checked={Boolean(translationOptions.autoApply)} disabled={locked} onChange={event => setTranslationOptions(options => ({ ...options, autoApply: event.target.checked }))} /> Hiện từng nhóm Việt sub cùng Pinyin khi dịch xong; câu có cảnh báo vẫn cần duyệt.</label>}
      {subtitleBusy ? <div className="caption-job" role="status"><span>{subtitleProgress?.message ?? 'Đang chuẩn bị…'}</span>{subtitleProgress?.progress !== undefined ? <progress max={100} value={subtitleProgress.progress} /> : <progress />}<button className="creation-secondary" onClick={onCancelSubtitles}><X size={14} /> Dừng · giữ các câu đã dịch</button></div> : <>
        <button className="creation-primary" disabled={!ready || locked || !sourceCount} onClick={() => onGenerateSubtitles(subtitleMode, { ...translationOptions, songTitle: titleContent.title })}><Captions size={15} /> {subtitleMode === 'pinyin' ? 'Tạo / cập nhật Pinyin' : subtitleDraft ? 'Tạo lại từ đầu · Việt sub' : subtitleMode === 'both' ? 'Tạo Pinyin ngay & dịch Việt sub' : 'Dịch & duyệt Việt sub'}</button>
        {subtitleMode !== 'pinyin' && <button type="button" className="creation-secondary" disabled={!ready || locked || !sourceCount} onClick={() => onGenerateSubtitles('pinyin', translationOptions)}>Chỉ tạo / cập nhật Pinyin · không cần AI</button>}
        {subtitleDraft?.options.engine === 'contextual' && subtitleDraft.rows.length < subtitleDraft.source.length && <button type="button" className="creation-primary" disabled={!ready || locked} onClick={() => onResumeSubtitles(Boolean(translationOptions.autoApply))}>Tiếp tục dịch các câu còn lại ({subtitleDraft.rows.length}/{subtitleDraft.source.length})</button>}
        {subtitleDraft && subtitleDraft.rows.some(row => row.text.trim() && !row.text.includes('[Cần kiểm tra lời gốc]')) && <button type="button" className="creation-secondary" disabled={!ready || locked} onClick={onShowTranslation}>Hiển thị Việt sub đã dịch cùng Pinyin ({subtitleDraft.rows.length} câu)</button>}
      </>}
      {subtitleError && <p className="creation-error" role="alert">{subtitleError}</p>}
      {subtitleDraft && <SubtitleTranslationReview draft={subtitleDraft} captions={captions} busy={locked} onChange={onReviewChange} onApply={onApplyTranslation} onDiscard={onDiscardTranslation} onListen={onListenCaption} />}
      <p className="creation-note">Pinyin xuất hiện ngay. Khi bật tự hiển thị, mỗi nhóm Việt sub đã dịch sẽ lên track riêng và nằm cùng lời gốc/Pinyin trong preview, không cần đợi hết bài. Câu mơ hồ vẫn hiện nếu có bản dịch nhưng cần kiểm tra nghĩa trước khi xuất. Bản nháp được giữ để sửa hoặc tiếp tục sau reload.</p>
    </div>
  </div>
}

export function AutoCaptionPanel({ sources, selectedClipId, captions, busy, progress, error, onGenerate, onCancel, onSelect, onExport, onImport }: {
  sources: Array<{ id: string; name: string; start: number; duration: number }>; selectedClipId: string | null; captions: Caption[]
  busy: boolean; progress: TranscriptionProgress | null; error: string | null
  onGenerate(clipId: string, language: string, model: 'tiny' | 'base', style: 'clean' | 'bold' | 'boxed'): void
  onCancel(): void; onSelect(caption: Caption): void; onExport(): void; onImport(): void
}) {
  const [sourceId, setSourceId] = useState(selectedClipId ?? '')
  const [language, setLanguage] = useState('vietnamese')
  const [model, setModel] = useState<'tiny' | 'base'>('base')
  const [style, setStyle] = useState<'clean' | 'bold' | 'boxed'>('clean')
  useEffect(() => { if (!sources.some(s => s.id === sourceId)) setSourceId(sources.find(s => s.id === selectedClipId)?.id ?? sources[0]?.id ?? '') }, [sources, sourceId, selectedClipId])
  const source = sources.find(s => s.id === sourceId)
  const generated = captions.filter(c => c.origin === 'auto' && c.sourceClipId === sourceId).sort((a, b) => a.start - b.start)
  return <div className="creation-panel">
    <div className="creation-intro"><span className="creation-kicker">AUTO CAPTIONS</span><h3>Biến lời nói thành phụ đề</h3><p>Nhận diện audio trong clip đã cắt, giữ mốc thời gian trên timeline.</p></div>
    <div className="creation-section">
      <label>Audio / video nguồn<select aria-label="Caption source" disabled={busy} value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">Chọn clip có tiếng nói</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name} · {s.start.toFixed(1)}s</option>)}</select></label>
      {!sources.length && <div className="creation-empty"><Captions size={24} /><p>Nhập audio hoặc video có giọng nói. Media demo không chứa audio thật.</p><button onClick={onImport}><Upload size={14} /> Nhập audio / video</button></div>}
      <div className="creation-fields"><label>Ngôn ngữ<select aria-label="Caption language" disabled={busy} value={language} onChange={e => setLanguage(e.target.value)}><option value="vietnamese">Tiếng Việt</option><option value="english">English</option><option value="auto">Tự nhận diện</option><option value="japanese">日本語</option><option value="korean">한국어</option><option value="chinese">中文</option></select></label><label>Model<select aria-label="Caption model" disabled={busy} value={model} onChange={e => setModel(e.target.value as 'tiny' | 'base')}><option value="base">Tiêu chuẩn</option><option value="tiny">Nhanh</option></select></label></div>
      <label>Kiểu phụ đề<select aria-label="Caption style" disabled={busy} value={style} onChange={e => setStyle(e.target.value as typeof style)}><option value="clean">Trắng · viền tối</option><option value="bold">Vàng · nổi bật</option><option value="boxed">Trắng · nền tối</option></select></label>
      <div className={`caption-style-sample sample-${style}`}>Câu chuyện của bạn</div>
      <p className="creation-note">Whisper xử lý trên thiết bị. Lần đầu tải model khoảng 80–160 MB, cần Internet. Phù hợp clip ≤ 10 phút; hãy rà lại câu chữ sau khi nhận diện.</p>
      {source && <p className="creation-note">Đoạn chọn: {source.duration.toFixed(1)}s · phụ đề bắt đầu tại {source.start.toFixed(1)}s. Tạo lại sẽ thay phụ đề tự động của clip này.</p>}
      {busy ? <div className="caption-job" role="status"><span>{progress?.message ?? 'Đang chuẩn bị…'}</span>{progress?.progress !== undefined ? <progress max={100} value={progress.progress} /> : <progress />}<button className="creation-secondary" onClick={onCancel}><X size={14} /> Hủy tạo phụ đề</button></div> : <button className="creation-primary" disabled={!source || source.duration > 600} onClick={() => source && onGenerate(source.id, language, model, style)}><Captions size={15} /> Tạo phụ đề tự động</button>}
      {error && <p className="creation-error" role="alert">{error}</p>}
    </div>
    <div className="creation-section"><div className="caption-list-heading"><h4>Phụ đề của clip · {generated.length}</h4><button aria-label="Export subtitles SRT" title="Xuất tất cả phụ đề tự động ra SRT" disabled={!captions.some(c => c.origin === 'auto')} onClick={onExport}><Download size={15} /> SRT</button></div><p>Chọn câu để tua đến vị trí và sửa nội dung, thời gian trong Inspector.</p>
      <div className="caption-result-list">{generated.map(c => <button key={c.id} onClick={() => onSelect(c)}><time>{c.start.toFixed(2)} – {(c.start + c.duration).toFixed(2)}s</time><span>{c.text}</span></button>)}</div>
    </div>
  </div>
}
