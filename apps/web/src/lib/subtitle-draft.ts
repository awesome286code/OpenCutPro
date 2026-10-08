import type { Caption } from './short-video.ts'
import { translationBatches, translationSourceSignature, type TranslationOptions, type TranslationRow } from './subtitle-translation.ts'
import type { SubtitleMode } from './bilingual-captions.ts'

export type SubtitleDraft = { mode: SubtitleMode; source: Caption[]; sourceSignature: string; rows: TranslationRow[]; options: TranslationOptions }

export function restoreSubtitleDraft(value: unknown): SubtitleDraft | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as SubtitleDraft
  if (!['both', 'vietnamese'].includes(draft.mode) || !Array.isArray(draft.source) || !Array.isArray(draft.rows) || !draft.options || !['contextual', 'fast'].includes(draft.options.engine) || !['natural', 'lyrical', 'literal'].includes(draft.options.style) || typeof draft.options.notes !== 'string') return null
  try {
    translationBatches(draft.source)
    if (draft.sourceSignature !== translationSourceSignature(draft.source)) return null
    const ids = new Set(draft.source.map(source => source.id))
    if (new Set(draft.rows.map(row => row.id)).size !== draft.rows.length || draft.rows.some(row => !ids.has(row.id) || typeof row.text !== 'string' || row.text.length > 1600 || typeof row.reason !== 'string' || typeof row.needsReview !== 'boolean')) return null
    return draft
  } catch { return null }
}
