import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Captions,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Film,
  FolderOpen,
  Gauge,
  Grid2X2,
  Hand,
  Headphones,
  Library,
  Lock,
  Maximize2,
  MoreHorizontal,
  MousePointer2,
  Music2,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  SquareDashedMousePointer,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Split,
  Sticker,
  Text,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  Volume2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
  Eye,
} from 'lucide-react'
import { Component, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent as ReactDragEvent, type ErrorInfo, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import ffmpegCoreURL from '@ffmpeg/core?url'
import ffmpegWasmURL from '@ffmpeg/core/wasm?url'
import { TemplatePanel, AutoCaptionPanel, IntelligenceCreatorPanel } from '../components/editor-creation-panels'
import { SHORT_TEMPLATES, captionsToSrt, cleanAudioTranscript, createIntelligenceSequence, createSceneMotion, createTemplateSceneSvg, createTemplateSequence, exportDimensions, getIntelligenceSceneCount, isAspectRatio, loadTemplateSceneBlob, styleIntelligenceCaption, suggestAudioLanguage, transcriptToCaptions, withTemplateLyrics, type AspectRatio, type Caption, type ShortTemplate } from '../lib/short-video'
import { transcribeMedia, type TranscriptionProgress } from '../lib/transcription'
import { applyProfessionalLyricStyle, chineseSourceCaptions, makeBilingualCaptions, mergeBilingualCaptions, normalizeChineseCaption, type SubtitleMode } from '../lib/bilingual-captions'
import { translateChineseCaptions } from '../lib/translate-subtitles'
import { canAutoApplyTranslation, translationIsComplete, translationReviewIssues, translationSourceSignature, visibleTranslationRows, type TranslationOptions, type TranslationRow } from '../lib/subtitle-translation'
import type { SubtitleDraft } from '../components/subtitle-translation-review'
import { restoreSubtitleDraft } from '../lib/subtitle-draft'
import { fontLoadRequests } from '../lib/font-catalog'
import { timelineContentWidth, timelineSpan } from '../lib/timeline-layout'
import { TimelineCaptionClip } from '../components/timeline-caption-clip'
import { CaptionInspector } from '../components/caption-inspector'
import { PreviewCaptionLayer } from '../components/preview-caption-layer'
import { selectedCaptions, subtitleSelection, updateCaptionSelection } from '../lib/caption-selection'
import { exportClockTime, prepareExportAudio, scheduleExportAudio, type ExportAudioClip } from '../lib/export-audio'
import { chooseRecorderMime, isExportBitrate, mp4ExportArgs, recommendedExportBitrate, recorderVideoBitrate, type ExportBitrate } from '../lib/export-video'
import { audioTitle, isCreatorTitlePreset, resolveCreatorTitle, restyleCreatorTitles, TITLE_ROLES, type CreatorTitleContent } from '../lib/creator-titles'
import { CREATOR_STYLES } from '../lib/creator-styles'
import { captionWeight, drawExportCaption } from '../lib/caption-renderer'
import { resolveCaptionFrames } from '../lib/lyric-scroll'
import { EFFECT_PRESETS, FILTER_PRESETS, transitionVisual, visualFilter, type TransitionDirection, type TransitionEasing, type VisualEffect } from '../lib/editor-look'
import { STICKER_PRESETS, stickerSvg, type StickerId } from '../lib/sticker-presets'
import { resolveVisualValues, upsertVisualKeyframe, VISUAL_KEYS, type VisualKeyframe, type VisualValues } from '../lib/visual-keyframes'

type PanelKey = 'Media' | 'Intelligence' | 'Templates' | 'Captions' | 'Audio' | 'Text' | 'Stickers' | 'Effects' | 'Transitions' | 'Filters' | 'Adjust'
type AssetType = 'VIDEO' | 'AUDIO' | 'IMAGE'
type TransitionType = 'none' | 'fade' | 'dissolve' | 'slide'
type ExportPreset = '2k' | '1080p' | '720p' | '540p'
type MediaAsset = { id: string; name: string; type: AssetType; duration: number; tone: string; url?: string; source: 'demo' | 'local'; waveform?: number[] }
type TimelineClip = {
  id: string; assetId: string; trimStart: number; trimEnd: number; start?: number; track?: number; audioTrack?: number; volume?: number; speed?: number
  muted?: boolean; fadeIn?: number; fadeOut?: number; positionX?: number; positionY?: number; scale?: number
  rotation?: number; opacity?: number; brightness?: number; contrast?: number; saturation?: number; hue?: number; sepia?: number; effect?: VisualEffect; effectStrength?: number
  fit?: 'contain' | 'cover'
  volumeKeyframes?: Array<{ time: number; value: number }>; ducking?: boolean
  visualKeyframes?: VisualKeyframe[]
  creatorMotion?: boolean
  transition?: { type: TransitionType; duration: number; easing?: TransitionEasing; direction?: TransitionDirection }
  creatorTitleContent?: CreatorTitleContent
}
type TimelineLayer = { id: string; type: 'VIDEO' | 'AUDIO' | 'TEXT'; index: number; name: string }
type TextCaption = Caption

function withCreatorTitleLayers(layers: TimelineLayer[], captions: Caption[], audioClipId: string): TimelineLayer[] {
  const result = [...layers]
  const names = { heading: 'Title · Tên bài hát', subtitle: 'Title · Dòng phụ', eyebrow: 'Title · Design label' }
  for (const role of TITLE_ROLES) {
    const caption = captions.find(item => item.sourceClipId === audioClipId && item.creatorTitle === role)
    if (caption && !result.some(layer => layer.type === 'TEXT' && layer.index === caption.track)) {
      result.push({ id: `${audioClipId}-title-track-${role}-${caption.track}`, type: 'TEXT', index: caption.track!, name: names[role] })
    }
  }
  return result
}

const initialTimelineLayers: TimelineLayer[] = [
  { id: 'video-0', type: 'VIDEO', index: 0, name: 'Video 1' },
  { id: 'video-1', type: 'VIDEO', index: 1, name: 'Video 2' },
  { id: 'video-2', type: 'VIDEO', index: 2, name: 'Video 3' },
  { id: 'audio-0', type: 'AUDIO', index: 0, name: 'Audio 1' },
  { id: 'text-0', type: 'TEXT', index: 0, name: 'Text' },
]

const tools: { label: PanelKey; icon: typeof Library }[] = [
  { label: 'Intelligence', icon: WandSparkles }, { label: 'Templates', icon: Film }, { label: 'Captions', icon: Captions },
  { label: 'Media', icon: Library }, { label: 'Audio', icon: Music2 }, { label: 'Text', icon: Text },
  { label: 'Stickers', icon: Sticker }, { label: 'Effects', icon: Sparkles }, { label: 'Transitions', icon: WandSparkles },
  { label: 'Filters', icon: SlidersHorizontal }, { label: 'Adjust', icon: Settings2 },
]

const demoMedia: MediaAsset[] = [
  { id: 'city-sunset', name: 'City sunset', type: 'VIDEO', duration: 8, tone: 'sunset', source: 'demo' },
  { id: 'ocean-waves', name: 'Ocean waves', type: 'VIDEO', duration: 6, tone: 'ocean', source: 'demo' },
  { id: 'portrait-cover', name: 'Portrait cover', type: 'IMAGE', duration: 4, tone: 'portrait', source: 'demo' },
  { id: 'lofi-beat', name: 'Lo-fi beat', type: 'AUDIO', duration: 18, tone: 'audio', source: 'demo' },
]

const initialClips: TimelineClip[] = [
  { id: 'clip-city', assetId: 'city-sunset', trimStart: 0, trimEnd: 8, start: 0 },
  { id: 'clip-ocean', assetId: 'ocean-waves', trimStart: 0, trimEnd: 6, start: 8, transition: { type: 'fade', duration: 0.6 } },
  { id: 'clip-portrait', assetId: 'portrait-cover', trimStart: 0, trimEnd: 4, start: 14, transition: { type: 'dissolve', duration: 0.6 } },
  { id: 'clip-lofi', assetId: 'lofi-beat', trimStart: 0, trimEnd: 18, start: 0, fadeIn: 0, fadeOut: 0 },
]

const initialTextCaptions: TextCaption[] = [{ id: 'caption-title', text: 'Find your next horizon.', start: 0, duration: 18, color: '#f5f5f7', font: 'Inter', size: 34, x: 50, y: 78 }]

const clipsStorageKey = 'opencut:travel-reel:clips'
const selectedClipStorageKey = 'opencut:travel-reel:selected-clip'
const textStorageKey = 'opencut:travel-reel:text'
const mediaDbName = 'opencut-local-media'
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

function getClipDuration(clip: TimelineClip) { return Math.max(0.1, clip.trimEnd - clip.trimStart) }
function getClipTrack(clip: TimelineClip) { return Math.max(0, Math.floor(clip.track ?? 0)) }
function getAudioTrack(clip: TimelineClip) { return Math.max(0, Math.floor(clip.audioTrack ?? 0)) }
function getLayerForClip(clip: TimelineClip | null, asset: MediaAsset | undefined, layers: TimelineLayer[]) {
  if (!clip || !asset) return null
  const index = asset.type === 'AUDIO' ? getAudioTrack(clip) : getClipTrack(clip)
  return layers.find((layer) => layer.type === (asset.type === 'AUDIO' ? 'AUDIO' : 'VIDEO') && layer.index === index) ?? null
}
function getActiveVisualClips(clips: TimelineClip[], assets: MediaAsset[], layers: TimelineLayer[], timelineTime: number, hiddenLayers: Record<string, boolean>) {
  return clips.filter((clip) => {
    const asset = assets.find((item) => item.id === clip.assetId)
    if (!asset || asset.type === 'AUDIO') return false
    const layer = getLayerForClip(clip, asset, layers)
    const start = getClipStart(clip, clips)
    return !layer || !hiddenLayers[layer.id] ? timelineTime >= start && timelineTime < start + getClipDuration(clip) : false
  }).sort((a, b) => getClipTrack(a) - getClipTrack(b) || getClipStart(a, clips) - getClipStart(b, clips))
}
function getClipStart(clip: TimelineClip, clips: TimelineClip[]) {
  if (typeof clip.start === 'number') return Math.max(0, clip.start)
  const index = clips.indexOf(clip)
  return clips.slice(0, index).filter((item) => item.id !== 'clip-lofi').reduce((sum, item) => sum + getClipDuration(item), 0)
}
function getClipSourceTime(clip: TimelineClip, timelineTime: number, clips: TimelineClip[]) {
  const elapsed = Math.max(0, timelineTime - getClipStart(clip, clips))
  return Math.max(clip.trimStart, Math.min(clip.trimEnd, clip.trimStart + elapsed * (clip.speed ?? 1)))
}

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(mediaDbName, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function saveProjectSnapshot(snapshot: Record<string, unknown>, createVersion = true) {
  const db = await openMediaDb()
  if (!db || !db.objectStoreNames.contains('projects')) { db?.close(); return false }
  const saved = await new Promise<boolean>((resolve) => {
    const transaction = db.transaction('projects', 'readwrite')
    const store = transaction.objectStore('projects')
    const savedAt = new Date().toISOString()
    store.put({ id: 'current', ...snapshot, savedAt })
    if (createVersion) store.put({ id: `version-${Date.now()}-${crypto.randomUUID()}`, ...snapshot, savedAt })
    transaction.oncomplete = () => resolve(true)
    transaction.onabort = () => resolve(false)
    transaction.onerror = () => resolve(false)
  })
  db.close()
  return saved
}

async function loadProjectSnapshot() {
  const db = await openMediaDb()
  if (!db || !db.objectStoreNames.contains('projects')) return null
  return await new Promise<Record<string, unknown> | null>((resolve) => {
    const request = db.transaction('projects', 'readonly').objectStore('projects').get('current')
    request.onsuccess = () => { db.close(); resolve(request.result ?? null) }
    request.onerror = () => { db.close(); resolve(null) }
  })
}

// Drafts are separate from project versions; writing a checkpoint never
// overwrites the timeline. Serialize writes to keep the newest edit last.
let subtitleDraftWrites = Promise.resolve(true)
function saveSubtitleDraft(draft: SubtitleDraft | null) {
  subtitleDraftWrites = subtitleDraftWrites.catch(() => false).then(async () => {
    const db = await openMediaDb()
    if (!db) return false
    try {
      return await new Promise<boolean>(resolve => {
        const transaction = db.transaction('projects', 'readwrite')
        transaction.objectStore('projects').put({ id: 'subtitle-draft', draft })
        transaction.oncomplete = () => resolve(true)
        transaction.onerror = transaction.onabort = () => resolve(false)
      })
    } finally { db.close() }
  }).catch(() => false)
  return subtitleDraftWrites
}

async function loadSubtitleDraft() {
  const db = await openMediaDb()
  if (!db) return null
  return await new Promise<SubtitleDraft | null>(resolve => {
    const request = db.transaction('projects', 'readonly').objectStore('projects').get('subtitle-draft')
    request.onsuccess = () => { db.close(); resolve(restoreSubtitleDraft(request.result?.draft)) }
    request.onerror = () => { db.close(); resolve(null) }
  })
}

async function countProjectVersions() {
  const db = await openMediaDb()
  if (!db || !db.objectStoreNames.contains('projects')) return 0
  return await new Promise<number>((resolve) => {
    const request = db.transaction('projects', 'readonly').objectStore('projects').getAllKeys()
    request.onsuccess = () => { db.close(); resolve(request.result.filter((key) => String(key).startsWith('version-')).length) }
    request.onerror = () => { db.close(); resolve(0) }
  })
}

async function loadProjectVersions() {
  const db = await openMediaDb()
  if (!db || !db.objectStoreNames.contains('projects')) return []
  return await new Promise<Record<string, unknown>[]>((resolve) => {
    const request = db.transaction('projects', 'readonly').objectStore('projects').getAll()
    request.onsuccess = () => {
      db.close()
      resolve((request.result ?? []).filter((item) => String(item?.id ?? '').startsWith('version-')).sort((a, b) => String(b?.savedAt ?? '').localeCompare(String(a?.savedAt ?? ''))))
    }
    request.onerror = () => { db.close(); resolve([]) }
  })
}

async function saveMediaFile(asset: MediaAsset, file: Blob) {
  const db = await openMediaDb()
  if (!db) return false
  return await new Promise<boolean>((resolve) => {
    const transaction = db.transaction('files', 'readwrite')
    transaction.objectStore('files').put({ id: asset.id, name: asset.name, type: asset.type, duration: asset.duration, blob: file })
    transaction.oncomplete = () => { db.close(); resolve(true) }
    transaction.onerror = () => { db.close(); resolve(false) }
    transaction.onabort = () => { db.close(); resolve(false) }
  })
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) })
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const binary = atob(body)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

function validateExportBlob(blob: Blob, expected: { width: number; height: number }) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const probe = document.createElement('video')
    const cleanup = () => { probe.removeAttribute('src'); probe.load(); URL.revokeObjectURL(url) }
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      const valid = probe.videoWidth === expected.width && probe.videoHeight === expected.height && !Number.isNaN(probe.duration) && (probe.duration > 0 || probe.duration === Infinity)
      cleanup()
      valid ? resolve() : reject(new Error(`Video xuất không đúng độ phân giải ${expected.width}×${expected.height} hoặc không có khung hình phát được.`))
    }
    probe.onerror = () => { cleanup(); reject(new Error('The exported video could not be decoded.')) }
    probe.src = url
    probe.load()
  })
}

async function withExportTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timer = 0
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('The MP4 encoder timed out.')), timeoutMs)
    })])
  } finally { window.clearTimeout(timer) }
}

async function deleteMediaFile(assetId: string) {
  const db = await openMediaDb()
  if (!db) return
  await new Promise<void>((resolve) => { const request = db.transaction('files', 'readwrite').objectStore('files').delete(assetId); request.onsuccess = () => resolve(); request.onerror = () => resolve() })
  db.close()
}

async function loadMediaFiles(): Promise<Array<{ id: string; name: string; type: AssetType; duration: number; blob: Blob }>> {
  const db = await openMediaDb()
  if (!db) return []
  return await new Promise((resolve) => {
    const request = db.transaction('files', 'readonly').objectStore('files').getAll()
    request.onsuccess = () => { db.close(); resolve(request.result ?? []) }
    request.onerror = () => { db.close(); resolve([]) }
  })
}

function getVisualStyle(clip: TimelineClip | null): CSSProperties {
  if (!clip) return {}
  return {
    transform: `translate(${(clip.positionX ?? 0) / DESIGN_WIDTH * 100}%, ${(clip.positionY ?? 0) / DESIGN_HEIGHT * 100}%) scale(${clip.scale ?? 1}) rotate(${clip.rotation ?? 0}deg)`,
    opacity: clip.opacity ?? 1,
    filter: visualFilter(clip),
    objectFit: clip.fit ?? 'contain',
  }
}

function visualClipAt(clip: TimelineClip, timelineTime: number, clips: TimelineClip[]): TimelineClip {
  if (!clip.visualKeyframes?.length) return clip
  return { ...clip, ...resolveVisualValues(clip, timelineTime - getClipStart(clip, clips)) }
}

function getAudioEnvelope(clip: TimelineClip, time: number) {
  if (clip.muted) return 0
  const duration = getClipDuration(clip)
  const fadeIn = Math.min(clip.fadeIn ?? 0, duration / 2)
  const fadeOut = Math.min(clip.fadeOut ?? 0, duration / 2)
  const fromStart = time - clip.trimStart
  const fromEnd = clip.trimEnd - time
  return Math.max(0, Math.min(1, fadeIn ? fromStart / fadeIn : 1, fadeOut ? fromEnd / fadeOut : 1))
}

function getClipVolume(clip: TimelineClip, time: number) {
  const keyframes = [...(clip.volumeKeyframes ?? [])].sort((a, b) => a.time - b.time)
  if (!keyframes.length) return 1
  const relative = Math.max(0, time - clip.trimStart)
  if (relative <= keyframes[0].time) return Math.max(0, Math.min(1, keyframes[0].value))
  const last = keyframes[keyframes.length - 1]
  if (relative >= last.time) return Math.max(0, Math.min(1, last.value))
  const rightIndex = keyframes.findIndex((keyframe) => keyframe.time >= relative)
  const right = keyframes[rightIndex]
  const left = keyframes[rightIndex - 1]
  const ratio = (relative - left.time) / Math.max(0.001, right.time - left.time)
  return Math.max(0, Math.min(1, left.value + (right.value - left.value) * ratio))
}

function isVoiceClip(clip: TimelineClip, assets: MediaAsset[]) {
  const asset = assets.find((item) => item.id === clip.assetId)
  return Boolean(asset && /voice|narrat|speech|mic|dialog|lời|thoại/i.test(asset.name))
}

function getEffectiveAudioVolume(clip: TimelineClip, time: number, clips: TimelineClip[], assets: MediaAsset[]) {
  const own = (clip.volume ?? 1) * getClipVolume(clip, time) * getAudioEnvelope(clip, time)
  if (isVoiceClip(clip, assets)) return own
  const voiceActive = clips.some((other) => other.id !== clip.id && isVoiceClip(other, assets) && time >= getClipStart(other, clips) && time < getClipStart(other, clips) + getClipDuration(other))
  return own * (clip.ducking === false || !voiceActive ? 1 : 0.38)
}

function getTransitionProgress(clip: TimelineClip, timelineTime: number, clips: TimelineClip[]) {
  const transition = clip.transition
  if (!transition || transition.type === 'none' || transition.duration <= 0) return 1
  return Math.max(0, Math.min(1, (timelineTime - getClipStart(clip, clips)) / transition.duration))
}

function rippleTimeline(next: TimelineClip[], previous: TimelineClip[], changedId: string, assets: MediaAsset[], forcedDelta?: number) {
  const oldClip = previous.find((clip) => clip.id === changedId)
  if (!oldClip) return next
  const oldIsAudio = assets.find(asset => asset.id === oldClip.assetId)?.type === 'AUDIO'
  const oldTrack = oldIsAudio ? getAudioTrack(oldClip) : getClipTrack(oldClip)
  const oldStart = getClipStart(oldClip, previous)
  const oldEnd = oldStart + getClipDuration(oldClip)
  const newClip = next.find((clip) => clip.id === changedId)
  const delta = forcedDelta ?? (newClip ? getClipStart(newClip, next) + getClipDuration(newClip) - oldEnd : 0)
  if (Math.abs(delta) < 0.001) return next
  return next.map((clip) => {
    const isAudio = assets.find(asset => asset.id === clip.assetId)?.type === 'AUDIO'
    if (clip.id === changedId || isAudio !== oldIsAudio || (isAudio ? getAudioTrack(clip) : getClipTrack(clip)) !== oldTrack) return clip
    const start = getClipStart(clip, next)
    if (start < oldEnd - 0.01) return clip
    return { ...clip, start: Math.max(0, start + delta) }
  })
}

function getEditorStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function loadSavedClips() {
  const storage = getEditorStorage()
  if (!storage) return initialClips
  try {
    const saved = JSON.parse(storage.getItem(clipsStorageKey) ?? 'null')
    if (!Array.isArray(saved)) return initialClips
    const valid = saved.filter((clip): clip is TimelineClip => clip && typeof clip.id === 'string' && typeof clip.assetId === 'string' && typeof clip.trimStart === 'number' && typeof clip.trimEnd === 'number')
    return valid.length ? valid : initialClips
  } catch {
    return initialClips
  }
}

function loadSavedText() {
  const storage = getEditorStorage()
  if (!storage) return initialTextCaptions
  try {
    const saved = JSON.parse(storage.getItem(textStorageKey) ?? 'null')
    if (!Array.isArray(saved)) return initialTextCaptions
    const valid = saved.filter((caption): caption is TextCaption => caption && typeof caption.id === 'string' && typeof caption.text === 'string' && typeof caption.start === 'number' && typeof caption.duration === 'number')
    return valid.length ? valid : initialTextCaptions
  } catch {
    return initialTextCaptions
  }
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function readMediaDuration(url: string, type: AssetType) {
  if (type === 'IMAGE') return Promise.resolve(5)
  return new Promise<number>((resolve) => {
    const element = document.createElement(type === 'VIDEO' ? 'video' : 'audio')
    element.preload = 'metadata'
    element.onloadedmetadata = () => resolve(Number.isFinite(element.duration) && element.duration > 0 ? element.duration : 5)
    element.onerror = () => resolve(5)
    element.src = url
  })
}

function readAudioDurationStrict(url: string) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    const cleanup = () => { audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load() }
    audio.onloadedmetadata = () => {
      const duration = audio.duration
      cleanup()
      Number.isFinite(duration) && duration > 0 ? resolve(duration) : reject(new Error('Không đọc được thời lượng audio. Hãy thử MP3, WAV hoặc M4A khác.'))
    }
    audio.onerror = () => { cleanup(); reject(new Error('Không mở được file audio. Hãy chọn file MP3, WAV hoặc M4A hợp lệ.')) }
    audio.src = url
  })
}

function makeFallbackWaveform(seed: string, count = 64) {
  return Array.from({ length: count }, (_, index) => 0.18 + (((index * 17 + seed.length * 11) % 67) / 100))
}

async function readWaveform(url: string) {
  try {
    const response = await fetch(url)
    const bytes = await response.arrayBuffer()
    const context = new AudioContext()
    const buffer = await context.decodeAudioData(bytes)
    const channel = buffer.getChannelData(0)
    const bucketSize = Math.max(1, Math.floor(channel.length / 64))
    const values = Array.from({ length: 64 }, (_, index) => {
      let peak = 0
      const start = index * bucketSize
      for (let offset = start; offset < Math.min(channel.length, start + bucketSize); offset += 1) peak = Math.max(peak, Math.abs(channel[offset]))
      return Math.max(0.08, Math.min(1, peak))
    })
    await context.close()
    return values
  } catch {
    return makeFallbackWaveform(url)
  }
}

function drawExportPlaceholder(context: CanvasRenderingContext2D, _asset: MediaAsset, elapsed: number, width: number, height: number) {
  const renderScale = width / DESIGN_WIDTH
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1f3050')
  gradient.addColorStop(.44, '#946451')
  gradient.addColorStop(.72, '#e19a59')
  gradient.addColorStop(1, '#edc785')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  const sun = context.createRadialGradient(width * .78, height * .35, height * .05, width * .78, height * .35, height * .32)
  sun.addColorStop(0, '#ffdca1')
  sun.addColorStop(.65, 'rgb(255 199 113 / 35%)')
  sun.addColorStop(1, 'transparent')
  context.fillStyle = sun
  context.beginPath()
  context.arc(width * (.775 + Math.sin(elapsed) * .004), height * .395, height * .225, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#2d3545'
  context.globalAlpha = .8
  context.beginPath()
  context.moveTo(0, height * .76)
  context.lineTo(width * .13, height * .67)
  context.lineTo(width * .25, height * .76)
  context.lineTo(width * .4, height * .56)
  context.lineTo(width * .49, height * .73)
  context.lineTo(width * .64, height * .54)
  context.lineTo(width * .76, height * .72)
  context.lineTo(width * .9, height * .59)
  context.lineTo(width, height * .7)
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.closePath()
  context.fill()
  context.globalAlpha = 1
  context.fillStyle = '#172032'
  context.beginPath()
  context.moveTo(0, height * .84)
  context.lineTo(width * .19, height * .76)
  context.lineTo(width * .32, height * .84)
  context.lineTo(width * .51, height * .65)
  context.lineTo(width * .61, height * .82)
  context.lineTo(width * .76, height * .71)
  context.lineTo(width * .9, height * .84)
  context.lineTo(width, height * .75)
  context.lineTo(width, height)
  context.lineTo(0, height)
  context.closePath()
  context.fill()
  const overlay = context.createLinearGradient(0, height * .2, 0, height)
  overlay.addColorStop(0, 'transparent')
  overlay.addColorStop(1, 'rgb(12 20 38 / 75%)')
  context.fillStyle = overlay
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#f6d49f'
  context.font = `600 ${8 * renderScale}px Inter, sans-serif`
  context.fillText('A SHORT ESCAPE', width * .08, height * .72)
  context.fillStyle = '#ffffff'
  context.font = `500 ${35 * renderScale}px Inter, sans-serif`
  context.fillText('Find your', width * .08, height * .82)
  context.fillText('next horizon.', width * .08, height * .91)
  context.fillStyle = '#c5f36b'
  context.fillRect(width * .08, height * .96, width * .06, 2 * renderScale)
  context.fillStyle = '#ffffff'
  context.font = `650 ${13 * renderScale}px Inter, sans-serif`
  context.fillText('01', width * .88, height * .18)
  context.fillStyle = 'rgb(255 255 255 / 48%)'
  context.font = `400 ${13 * renderScale}px Inter, sans-serif`
  context.fillText('/ 04', width * .92, height * .18)
}

function drawExportFrame(context: CanvasRenderingContext2D, asset: MediaAsset, clip: TimelineClip, elapsed: number, width: number, height: number, offsetX = 0, offsetY = 0) {
  context.save()
  context.translate(width / 2 + offsetX * width + (clip.positionX ?? 0) * width / DESIGN_WIDTH, height / 2 + offsetY * height + (clip.positionY ?? 0) * height / DESIGN_HEIGHT)
  context.rotate((clip.rotation ?? 0) * Math.PI / 180)
  context.scale(clip.scale ?? 1, clip.scale ?? 1)
  context.globalAlpha = clip.opacity ?? 1
  context.filter = visualFilter(clip)
  context.translate(-width / 2, -height / 2)
  drawExportPlaceholder(context, asset, elapsed, width, height)
  context.restore()
}

function drawExportSource(context: CanvasRenderingContext2D, source: CanvasImageSource, clip: TimelineClip, width: number, height: number, opacity: number, offsetX = 0, offsetY = 0) {
  context.save()
  context.translate(width / 2 + offsetX * width + (clip.positionX ?? 0) * width / DESIGN_WIDTH, height / 2 + offsetY * height + (clip.positionY ?? 0) * height / DESIGN_HEIGHT)
  context.rotate((clip.rotation ?? 0) * Math.PI / 180)
  context.globalAlpha = (clip.opacity ?? 1) * opacity
  context.filter = visualFilter(clip)
  context.scale(clip.scale ?? 1, clip.scale ?? 1)
  context.translate(-width / 2, -height / 2)
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source instanceof HTMLImageElement ? source.naturalWidth : width
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source instanceof HTMLImageElement ? source.naturalHeight : height
  const fitScale = (clip.fit === 'cover' ? Math.max : Math.min)(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight))
  const drawWidth = sourceWidth * fitScale
  const drawHeight = sourceHeight * fitScale
  context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
  context.restore()
}

function PreviewVisualLayer({ asset, clip, style, transition = false, previewTime, videoRef }: { asset: MediaAsset; clip: TimelineClip; style: CSSProperties; transition?: boolean; previewTime?: number; videoRef?: { current: HTMLVideoElement | null } }) {
  const className = `preview-media${transition ? ' preview-transition-media' : ''}`
  if (asset.url && asset.type === 'VIDEO') return <video ref={videoRef} data-preview-clip-id={clip.id} data-preview-time={previewTime === undefined ? undefined : String(previewTime)} className={className} style={style} src={asset.url} muted playsInline />
  if (asset.url && asset.type === 'IMAGE') return <img className={className} style={style} src={asset.url} alt={asset.name} />
  return <div className={`preview-art ${transition ? 'preview-transition-media' : ''}`} style={style}><div className="sun-glow" /><div className="skyline skyline-back" /><div className="skyline skyline-front" /><div className="preview-copy"><span className="eyebrow">A short escape</span><strong>Find your<br />next horizon.</strong><span className="copy-line" /></div><div className="preview-counter">01 <span>/ 04</span></div></div>
}

class EditorErrorBoundary extends Component<{ children?: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('OpenCut editor error', error, info) }
  render() {
    if (this.state.error) return <main className="editor-error"><h1>Editor could not render</h1><p>{this.state.error.message}</p><button onClick={() => window.location.reload()}>Reload editor</button></main>
    return this.props.children ?? <Editor />
  }
}

function EditorRoute() { return <EditorErrorBoundary /> }
export const Route = createFileRoute('/editor')({ component: EditorRoute })

function TimelineDropLayer({ clips, layers, onDropAsset, onAddLayer, children }: { clips: TimelineClip[]; layers: TimelineLayer[]; onDropAsset: (assetId: string, start?: number, track?: number) => void; onAddLayer: (type: TimelineLayer['type']) => void; children: ReactNode }) {
  const videoTracks = layers.filter((layer) => layer.type === 'VIDEO').sort((a, b) => a.index - b.index)
  const audioTracks = layers.filter((layer) => layer.type === 'AUDIO').sort((a, b) => a.index - b.index)
  const timelineLength = Math.max(1, clips.reduce((max, clip) => Math.max(max, getClipStart(clip, clips) + getClipDuration(clip)), 0))
  const [dropTarget, setDropTarget] = useState<{ left: number; top: number; track: number; audio: boolean; start: number } | null>(null)
  const getDropTarget = (event: ReactDragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const tracks = event.currentTarget.querySelector<HTMLElement>('.tracks')
    const trackRect = tracks?.getBoundingClientRect() ?? rect
    const x = Math.max(0, Math.min(trackRect.width, event.clientX - trackRect.left))
    const trackAreaY = Math.max(0, event.clientY - trackRect.top)
    const type = event.dataTransfer.getData('application/x-opencut-type')
    const videoAreaHeight = videoTracks.length * 67
    const audio = type === 'AUDIO' || trackAreaY >= videoAreaHeight
    const rawTrackIndex = audio ? Math.floor(Math.max(0, trackAreaY - videoAreaHeight) / 45) : Math.floor(trackAreaY / 67)
    const trackIndex = audio ? Math.min(Math.max(0, audioTracks.length - 1), rawTrackIndex) : Math.min(Math.max(0, videoTracks.length - 1), rawTrackIndex)
    const track = audio ? audioTracks[trackIndex]?.index ?? 0 : videoTracks[trackIndex]?.index ?? 0
    const length = Number(tracks?.dataset.timelineLength) || timelineLength
    const rowTop = trackRect.top - rect.top + (audio ? videoAreaHeight + trackIndex * 45 : trackIndex * 67)
    return { left: Math.max(0, Math.min(100, (event.clientX - rect.left) / Math.max(1, rect.width) * 100)), top: rowTop + 20, track, audio, start: (x / Math.max(1, trackRect.width)) * length }
  }
  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/x-opencut-asset')) return
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDropTarget(getDropTarget(event))
  }
  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const assetId = event.dataTransfer.getData('application/x-opencut-asset')
    const target = getDropTarget(event)
    if (assetId) onDropAsset(assetId, target.start, target.track)
    setDropTarget(null)
  }
  return <div className={`timeline-drop-layer ${dropTarget ? 'drop-active' : ''}`} onDragOver={handleDragOver} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null) }} onDrop={handleDrop}><div className="timeline-layer-actions"><span>Layers</span><button onClick={() => onAddLayer('VIDEO')}>+ Video</button><button onClick={() => onAddLayer('AUDIO')}>+ Audio</button><button onClick={() => onAddLayer('TEXT')}>+ Text</button></div>{dropTarget && <div className="timeline-drop-indicator" style={{ left: `${dropTarget.left}%`, top: `${dropTarget.top}px` }}><span>{dropTarget.audio ? `Drop on Audio ${dropTarget.track + 1}` : `Drop on Video ${dropTarget.track + 1}`}</span></div>}{children}</div>
}

function Editor() {
  const [activeTool, setActiveTool] = useState<PanelKey>('Media')
  const [assets, setAssets] = useState<MediaAsset[]>(demoMedia)
  const [clips, setClips] = useState<TimelineClip[]>(initialClips)
  const [timelineLayers, setTimelineLayers] = useState<TimelineLayer[]>(initialTimelineLayers)
  const [textCaptions, setTextCaptions] = useState<TextCaption[]>(initialTextCaptions)
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-city')
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>(['clip-city'])
  const [clipboardClips, setClipboardClips] = useState<TimelineClip[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>('caption-title')
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [zoom, setZoom] = useState(72)
  const [rippleEdit, setRippleEdit] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [hiddenLayers, setHiddenLayers] = useState<Record<string, boolean>>({})
  const [mutedLayers, setMutedLayers] = useState<Record<string, boolean>>({})
  const [showGrid, setShowGrid] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<'Video' | 'Audio' | 'Text' | 'Animation'>('Video')
  const [notice, setNotice] = useState<string | null>(null)
  const [clipHistory, setClipHistory] = useState<TimelineClip[][]>([])
  const [clipFuture, setClipFuture] = useState<TimelineClip[][]>([])
  const [textHistory, setTextHistory] = useState<TextCaption[][]>([])
  const [textFuture, setTextFuture] = useState<TextCaption[][]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportPreset, setExportPreset] = useState<ExportPreset>('1080p')
  const [exportFps, setExportFps] = useState<30 | 60>(30)
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>('mp4')
  const [exportBitrate, setExportBitrate] = useState<ExportBitrate>('24')
  const [exportQuality, setExportQuality] = useState<'standard' | 'high'>('high')
  const [versionCount, setVersionCount] = useState(0)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versionSnapshots, setVersionSnapshots] = useState<Record<string, unknown>[]>([])
  const [versionLoading, setVersionLoading] = useState(false)
  const [projectReady, setProjectReady] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [captionBusy, setCaptionBusy] = useState(false)
  const [captionProgress, setCaptionProgress] = useState<TranscriptionProgress | null>(null)
  const [captionError, setCaptionError] = useState<string | null>(null)
  const captionJobRef = useRef<ReturnType<typeof transcribeMedia> | null>(null)
  const [creatorBusy, setCreatorBusy] = useState(false)
  const [creatorStyleBusy, setCreatorStyleBusy] = useState(false)
  const [creatorProgress, setCreatorProgress] = useState<TranscriptionProgress | null>(null)
  const [creatorError, setCreatorError] = useState<string | null>(null)
  const [creatorResult, setCreatorResult] = useState<{ name: string; duration: number; captionCount: number; language: string; omitted: number } | null>(null)
  const creatorJobRef = useRef<ReturnType<typeof transcribeMedia> | null>(null)
  const creatorRunRef = useRef(0)
  const [subtitleBusy, setSubtitleBusy] = useState(false)
  const [subtitleApplying, setSubtitleApplying] = useState(false)
  const [subtitleProgress, setSubtitleProgress] = useState<TranscriptionProgress | null>(null)
  const [subtitleError, setSubtitleError] = useState<string | null>(null)
  const [subtitleDraft, setSubtitleDraft] = useState<SubtitleDraft | null>(null)
  const [subtitleDraftReady, setSubtitleDraftReady] = useState(false)
  const subtitleJobRef = useRef<ReturnType<typeof translateChineseCaptions> | null>(null)
  const subtitleRunRef = useRef(0)
  const latestEditRef = useRef({ clips, textCaptions, timelineLayers })
  latestEditRef.current = { clips, textCaptions, timelineLayers }
  const [templateUndo, setTemplateUndo] = useState<{ before: { clips: TimelineClip[]; captions: TextCaption[]; layers: TimelineLayer[]; ratio: AspectRatio }; after: { clips: TimelineClip[]; captions: TextCaption[] } } | null>(null)
  const canUndoTemplate = Boolean(templateUndo && clips === templateUndo.after.clips && textCaptions === templateUndo.after.captions)
  const exportCancelRef = useRef(false)
  const ffmpegRef = useRef<{ terminate: () => void } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceMediaInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioTrackRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const previewRef = useRef<HTMLDivElement>(null)
  const captionDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const previewTransformDragRef = useRef<{ clipId: string; originX: number; originY: number; pointerX: number; pointerY: number; moved: boolean } | null>(null)
  const objectUrlsRef = useRef<Set<string>>(new Set())
  const pendingTemplateFocusRef = useRef<string | null>(null)
  const playbackTimeRef = useRef(0)
  const playbackTimestampRef = useRef(0)
  const navigate = useNavigate()

  const selectedClip = useMemo(() => clips.find((clip) => clip.id === selectedClipId) ?? null, [clips, selectedClipId])
  const currentCreatorTitle = useMemo<CreatorTitleContent>(() => {
    const audio = clips.find(clip => clip.id.startsWith('intelligence-') && clip.id.endsWith('-audio'))
    const title = textCaptions.find(caption => caption.sourceClipId === audio?.id && caption.creatorTitle === 'heading' && caption.creatorTitlePhase === 'opening')
    const subtitle = textCaptions.find(caption => caption.sourceClipId === audio?.id && caption.creatorTitle === 'subtitle')
    const unwrap = (value: string) => value.replace(/\n/g, ' ').replace(/(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/gu, '')
    const design = audio?.creatorTitleContent?.design ?? title?.creatorTitleDesignId
    return { enabled: audio?.creatorTitleContent?.enabled ?? true, ...(isCreatorTitlePreset(design) ? { design } : {}),
      title: title ? unwrap(title.text) : audio?.creatorTitleContent?.title ?? (audio ? audioTitle(assets.find(asset => asset.id === audio.assetId)?.name ?? '') : ''),
      subtitle: subtitle ? unwrap(subtitle.text) : audio?.creatorTitleContent?.subtitle ?? '' }
  }, [clips, assets, textCaptions])
  const currentCreatorStyleId = useMemo(() => {
    const audio = clips.find(clip => clip.id.startsWith('intelligence-') && clip.id.endsWith('-audio'))
    return textCaptions.find(caption => caption.sourceClipId === audio?.id && caption.creatorStyleId)?.creatorStyleId
  }, [clips, textCaptions])
  const chineseCaptions = useMemo(() => chineseSourceCaptions(textCaptions, new Set(clips.filter(clip => assets.some(asset => asset.id === clip.assetId && asset.type === 'AUDIO')).map(clip => clip.id))), [assets, clips, textCaptions])
  const derivedCount = useMemo(() => ({ pinyin: textCaptions.filter(caption => caption.id.endsWith('-pinyin')).length, vietnamese: textCaptions.filter(caption => caption.id.endsWith('-vietnamese')).length }), [textCaptions])
  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === selectedClip?.assetId) ?? null, [assets, selectedClip])
  const totalDuration = useMemo(() => Math.max(0.1, clips.filter((clip) => assets.find((asset) => asset.id === clip.assetId)?.type !== 'AUDIO').reduce((max, clip) => Math.max(max, getClipStart(clip, clips) + getClipDuration(clip)), 0), textCaptions.reduce((max, caption) => Math.max(max, caption.start + caption.duration), 0)), [assets, clips, textCaptions])
  const seekTo = (time: number) => {
    const nextTime = Math.max(0, Math.min(totalDuration, time))
    playbackTimeRef.current = nextTime
    playbackTimestampRef.current = performance.now()
    setCurrentTime(nextTime)
  }
  const togglePlayback = () => {
    if (!isPlaying && currentTime >= totalDuration - 0.02) seekTo(0)
    if (isPlaying) seekTo(playbackTimeRef.current)
    setIsPlaying((playing) => !playing)
  }
  const hiddenTextTracks = useMemo(() => timelineLayers.filter(layer => layer.type === 'TEXT' && hiddenLayers[layer.id]).map(layer => layer.index), [timelineLayers, hiddenLayers])
  const [previewScale, setPreviewScale] = useState(1)
  const activeVisualClips = useMemo(() => getActiveVisualClips(clips, assets, timelineLayers, currentTime, hiddenLayers), [assets, clips, currentTime, hiddenLayers, timelineLayers])
  const previewTransitionPairs = useMemo(() => activeVisualClips.flatMap((clip) => {
    const transition = clip.transition
    const start = getClipStart(clip, clips)
    if (!transition || transition.type === 'none' || currentTime < start || currentTime >= start + transition.duration) return []
    const previous = clips.filter((candidate) => {
      const asset = assets.find((item) => item.id === candidate.assetId)
      const layer = getLayerForClip(candidate, asset, timelineLayers)
      return candidate.id !== clip.id && asset?.type !== 'AUDIO' && (!layer || !hiddenLayers[layer.id]) && getClipTrack(candidate) === getClipTrack(clip) && getClipStart(candidate, clips) + getClipDuration(candidate) <= start + 0.05
    }).sort((a, b) => getClipStart(b, clips) - getClipStart(a, clips))[0]
    if (!previous || activeVisualClips.some((candidate) => candidate.id === previous.id)) return []
    return [{ clip, previous, progress: getTransitionProgress(clip, currentTime, clips) }]
  }), [activeVisualClips, assets, clips, currentTime, hiddenLayers, timelineLayers])

  const cancelCaptions = () => {
    captionJobRef.current?.cancel()
    captionJobRef.current = null
    setCaptionBusy(false)
    setCaptionProgress(null)
  }

  const generateCaptions = async (clipId: string, language: string, model: 'tiny' | 'base', style: 'clean' | 'bold' | 'boxed') => {
    if (captionJobRef.current) return
    const clip = clips.find(item => item.id === clipId)
    const asset = assets.find(item => item.id === clip?.assetId)
    if (!clip || !asset?.url || asset.type === 'IMAGE') return setCaptionError('Chọn audio hoặc video local có giọng nói.')
    setCaptionBusy(true)
    setCaptionError(null)
    setIsPlaying(false)
    const signature = JSON.stringify(clip)
    const job = transcribeMedia({ url: asset.url, trimStart: clip.trimStart, trimEnd: clip.trimEnd, language, model }, setCaptionProgress)
    captionJobRef.current = job
    try {
      const result = await job.promise
      if (captionJobRef.current !== job) return
      const latest = latestEditRef.current
      if (JSON.stringify(latest.clips.find(c => c.id === clipId)) !== signature) throw new Error('Clip đã thay đổi trong lúc nhận diện. Hãy tạo lại để đồng bộ thời gian.')
      const existing = latest.textCaptions.find(c => c.origin === 'auto' && c.sourceClipId === clipId)
      const track = existing?.track ?? Math.max(-1, ...latest.timelineLayers.filter(l => l.type === 'TEXT').map(l => l.index)) + 1
      const generated = transcriptToCaptions(result.segments, { clipId, start: getClipStart(clip, latest.clips), sourceDuration: result.duration, speed: clip.speed ?? 1, timelineDuration: getClipDuration(clip), track, style, id: `caption-auto-${crypto.randomUUID()}` })
      if (!generated.length) throw new Error('Không tìm thấy lời nói có mốc thời gian. Thử đoạn có giọng rõ hơn hoặc đổi ngôn ngữ.')
      setTextHistory(history => [...history.slice(-29), latest.textCaptions])
      setTextFuture([])
      setTextCaptions([...latest.textCaptions.filter(c => !(c.origin === 'auto' && c.sourceClipId === clipId)), ...generated])
      if (!latest.timelineLayers.some(l => l.type === 'TEXT' && l.index === track)) setTimelineLayers([...latest.timelineLayers, { id: `text-auto-${crypto.randomUUID()}`, type: 'TEXT', index: track, name: 'Auto captions' }])
      setSelectedTextId(generated[0].id)
      setInspectorTab('Text')
      setCurrentTime(generated[0].start)
      setNotice(`Đã tạo ${generated.length} câu phụ đề. Chọn câu để chỉnh trong Inspector.`)
    } catch (error) {
      if (captionJobRef.current === job && !(error instanceof DOMException && error.name === 'AbortError')) setCaptionError(error instanceof Error ? error.message : 'Không tạo được phụ đề.')
    } finally {
      if (captionJobRef.current === job) { captionJobRef.current = null; setCaptionBusy(false); setCaptionProgress(null) }
    }
  }

  const cancelIntelligenceCreator = () => {
    creatorRunRef.current += 1
    creatorJobRef.current?.cancel()
    creatorJobRef.current = null
    setCreatorBusy(false)
    setCreatorProgress(null)
  }

  const cancelBilingualSubtitles = () => {
    subtitleRunRef.current += 1
    subtitleJobRef.current?.cancel()
    subtitleJobRef.current = null
    setSubtitleBusy(false)
    setSubtitleProgress(null)
  }

  const commitBilingualSubtitles = async (source: Caption[], translations: string[] | null, mode: SubtitleMode, sourceSignature: string, ensureActive: () => void = () => {}) => {
    const latest = latestEditRef.current
    const currentSource = chineseSourceCaptions(latest.textCaptions, new Set(latest.clips.filter(clip => assets.some(asset => asset.id === clip.assetId && asset.type === 'AUDIO')).map(clip => clip.id)))
    if (translationSourceSignature(currentSource) !== sourceSignature) throw new Error('Lời gốc hoặc thời gian đã thay đổi. Hãy dịch lại; bản hiện tại chưa bị thay thế.')
    const existingPinyin = latest.timelineLayers.find(layer => layer.type === 'TEXT' && layer.name === 'Pinyin')
    const existingVietnamese = latest.timelineLayers.find(layer => layer.type === 'TEXT' && layer.name === 'Việt sub')
    const nextTrack = Math.max(-1, ...latest.timelineLayers.filter(layer => layer.type === 'TEXT').map(layer => layer.index)) + 1
    const pinyinTrack = existingPinyin?.index ?? nextTrack
    const vietnameseTrack = existingVietnamese?.index ?? (mode === 'vietnamese' || existingPinyin ? nextTrack : nextTrack + 1)
    const generated = makeBilingualCaptions(currentSource, translations, mode, pinyinTrack, vietnameseTrack)
    const nextCaptions = mergeBilingualCaptions(latest.textCaptions, generated, aspectRatio)
    const newLayers: TimelineLayer[] = []
    if (mode !== 'vietnamese' && !existingPinyin) newLayers.push({ id: `text-pinyin-${crypto.randomUUID()}`, type: 'TEXT', index: pinyinTrack, name: 'Pinyin' })
    if (mode !== 'pinyin' && !existingVietnamese) newLayers.push({ id: `text-vietnamese-${crypto.randomUUID()}`, type: 'TEXT', index: vietnameseTrack, name: 'Việt sub' })
    const projectSettings = { version: 3, aspectRatio, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality }
    const projectSignature = JSON.stringify(latest)
    if (!await saveProjectSnapshot({ ...projectSettings, ...latest, name: 'Before subtitle update' })) throw new Error('Không lưu được bản dự phòng. Hãy kiểm tra dung lượng trình duyệt; Việt sub cũ chưa thay đổi.')
    ensureActive()
    if (JSON.stringify(latestEditRef.current) !== projectSignature) throw new Error('Project vừa thay đổi. Hãy áp dụng lại để tránh ghi đè chỉnh sửa mới.')
    const nextLayers = [...latest.timelineLayers, ...newLayers]
    setTextHistory(history => [...history.slice(-29), latest.textCaptions]); setTextFuture([])
    latestEditRef.current = { ...latest, textCaptions: nextCaptions, timelineLayers: nextLayers }
    setTextCaptions(nextCaptions); setTimelineLayers(nextLayers)
    setSelectedTextId(generated[0]?.id ?? source[0].id); setSelectedTextIds([generated[0]?.id ?? source[0].id]); setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text'); setIsPlaying(false)
    if (!await saveProjectSnapshot({ ...projectSettings, ...latest, textCaptions: nextCaptions, timelineLayers: nextLayers, name: mode === 'pinyin' ? 'Pinyin update' : 'Reviewed Vietnamese subtitles' })) throw new Error('Đã áp dụng vào timeline nhưng chưa lưu được. Hãy Save JSON trước khi tải lại; bản cũ còn trong Version history.')
    if (mode !== 'pinyin') { setSubtitleDraft(null); await saveSubtitleDraft(null) }
    setNotice(`Đã cập nhật ${generated.length} caption ${mode === 'both' ? 'Pinyin và Việt sub' : mode === 'pinyin' ? 'Pinyin' : 'Việt sub'}; giữ nguyên thời gian và thiết kế đã chỉnh.`)
  }

  const stageVietnameseRows = async (source: Caption[], rows: TranslationRow[], sourceSignature: string, ensureActive: () => void, createBackup: boolean) => {
    const visible = visibleTranslationRows(source, rows)
    if (!visible.length) return 0
    const latest = latestEditRef.current
    const currentSource = chineseSourceCaptions(latest.textCaptions, new Set(latest.clips.filter(clip => assets.some(asset => asset.id === clip.assetId && asset.type === 'AUDIO')).map(clip => clip.id)))
    if (translationSourceSignature(currentSource) !== sourceSignature) throw new Error('Lời gốc hoặc mốc thời gian đã đổi. Đã giữ bản dịch để bạn xem lại; không ghi đè timeline.')
    const byId = new Map(currentSource.map(caption => [caption.id, caption]))
    const selected = visible.map(row => byId.get(row.id)!).filter(Boolean)
    const texts = selected.map(caption => visible.find(row => row.id === caption.id)!.text)
    const existingPinyin = latest.timelineLayers.find(layer => layer.type === 'TEXT' && layer.name === 'Pinyin')
    const existingVietnamese = latest.timelineLayers.find(layer => layer.type === 'TEXT' && layer.name === 'Việt sub')
    const nextTrack = Math.max(-1, ...latest.timelineLayers.filter(layer => layer.type === 'TEXT').map(layer => layer.index)) + 1
    const generated = makeBilingualCaptions(selected, texts, 'vietnamese', existingPinyin?.index ?? nextTrack, existingVietnamese?.index ?? nextTrack)
    const nextCaptions = mergeBilingualCaptions(latest.textCaptions, generated, aspectRatio)
    const nextLayers = existingVietnamese ? latest.timelineLayers : [...latest.timelineLayers, { id: `text-vietnamese-${crypto.randomUUID()}`, type: 'TEXT' as const, index: nextTrack, name: 'Việt sub' }]
    const settings = { version: 3, aspectRatio, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality }
    const signature = JSON.stringify(latest)
    if (createBackup && !await saveProjectSnapshot({ ...settings, ...latest, name: 'Before Vietnamese subtitle preview' })) throw new Error('Không lưu được bản dự phòng; Việt sub cũ chưa thay đổi.')
    ensureActive()
    if (JSON.stringify(latestEditRef.current) !== signature) throw new Error('Project vừa thay đổi. Các câu đã dịch vẫn ở bản nháp; hãy áp dụng sau khi kiểm tra.')
    latestEditRef.current = { ...latest, textCaptions: nextCaptions, timelineLayers: nextLayers }
    setTextCaptions(nextCaptions); setTimelineLayers(nextLayers)
    if (!await saveProjectSnapshot({ ...settings, ...latest, textCaptions: nextCaptions, timelineLayers: nextLayers, name: 'Vietnamese subtitle preview' }, false)) {
      setSubtitleError('Việt sub đã hiện trên timeline nhưng chưa lưu được. Hãy kiểm tra dung lượng trình duyệt trước khi tải lại.')
    }
    return generated.length
  }

  const applyReviewedTranslation = async () => {
    if (!subtitleDraft || subtitleBusy || subtitleApplying || creatorBusy || creatorStyleBusy || !projectReady) return
    if (!translationIsComplete(subtitleDraft.source, subtitleDraft.rows)) return setSubtitleError('Bản dịch chưa đủ câu. Nhấn Tiếp tục dịch các câu còn lại trước khi áp dụng.')
    if (translationReviewIssues(subtitleDraft.rows).length) return setSubtitleError('Hãy sửa câu trống và duyệt các câu chưa rõ nghĩa trước khi áp dụng.')
    setSubtitleApplying(true); setSubtitleError(null)
    const byId = new Map(subtitleDraft.rows.map(row => [row.id, row.text]))
    try { await commitBilingualSubtitles(subtitleDraft.source, subtitleDraft.source.map(source => byId.get(source.id)!), subtitleDraft.mode, subtitleDraft.sourceSignature) }
    catch (error) { setSubtitleError(error instanceof Error ? error.message : 'Không áp dụng được bản dịch.') }
    finally { setSubtitleApplying(false) }
  }

  const showDraftVietnameseSubtitles = async () => {
    if (!subtitleDraft || subtitleBusy || subtitleApplying || creatorBusy || !projectReady) return
    setSubtitleApplying(true); setSubtitleError(null)
    try {
      const count = await stageVietnameseRows(subtitleDraft.source, subtitleDraft.rows, subtitleDraft.sourceSignature, () => {}, true)
      if (!count) throw new Error('Chưa có câu Việt sub đã dịch để hiển thị. Hãy tiếp tục dịch hoặc sửa câu trống trong bản nháp.')
      setNotice(`Đã hiển thị ${count} câu Việt sub cùng Pinyin. Câu bị cảnh báo vẫn cần kiểm tra trước khi xuất.`)
    } catch (error) { setSubtitleError(error instanceof Error ? error.message : 'Không hiển thị được Việt sub.') }
    finally { setSubtitleApplying(false) }
  }

  const generateBilingualSubtitles = async (mode: SubtitleMode, options: TranslationOptions, resume = false) => {
    if (subtitleBusy || subtitleApplying || creatorBusy || creatorStyleBusy || !projectReady || !subtitleDraftReady) return
    const run = ++subtitleRunRef.current
    const source = chineseSourceCaptions(latestEditRef.current.textCaptions, new Set(latestEditRef.current.clips.filter(clip => assets.some(asset => asset.id === clip.assetId && asset.type === 'AUDIO')).map(clip => clip.id)))
    if (!source.length) return setSubtitleError('Chưa có lời tiếng Trung từ audio trên timeline. Hãy tạo video bằng audio tiếng Trung trước.')
    const sourceSignature = translationSourceSignature(source)
    if (resume && (!subtitleDraft || subtitleDraft.sourceSignature !== sourceSignature || subtitleDraft.options.engine !== 'contextual')) return setSubtitleError('Lời gốc hoặc mốc thời gian đã đổi. Hãy tạo lại bản dịch; không thể nối bản nháp cũ.')
    setSubtitleBusy(true); setSubtitleError(null); setSubtitleProgress({ message: mode === 'pinyin' ? 'Đang tạo Pinyin…' : 'Đang chuẩn bị dịch tiếng Trung sang tiếng Việt…' })
    try {
      const ensureActive = () => { if (run !== subtitleRunRef.current) throw new DOMException('Đã hủy tạo phụ đề.', 'AbortError') }
      const stagedIds = new Set<string>()
      let stagedBackupSaved = false
      const showTranslatedRows = async (rows: TranslationRow[]) => {
        if (!options.autoApply) return
        const fresh = visibleTranslationRows(source, rows).filter(row => !stagedIds.has(row.id))
        if (!fresh.length) return
        await stageVietnameseRows(source, fresh, sourceSignature, ensureActive, !stagedBackupSaved)
        stagedBackupSaved = true
        fresh.forEach(row => stagedIds.add(row.id))
      }
      // Pinyin is deterministic/local and must not wait for, or fail with, AI.
      if (mode !== 'vietnamese' && !resume) {
        await commitBilingualSubtitles(source, null, 'pinyin', sourceSignature, ensureActive)
        ensureActive()
      }
      if (mode !== 'pinyin') {
        const draft: SubtitleDraft = resume ? { ...subtitleDraft!, options: { ...subtitleDraft!.options, autoApply: options.autoApply } } : { mode: 'vietnamese', source, sourceSignature, rows: [], options }
        setSubtitleDraft(draft)
        if (!await saveSubtitleDraft(draft)) setSubtitleError('Chưa lưu được bản nháp vào trình duyệt. Đừng reload trước khi áp dụng.')
        ensureActive()
        if (resume) await showTranslatedRows(draft.rows)
        const job = translateChineseCaptions(source.map(caption => ({ ...caption, text: normalizeChineseCaption(caption.text) })), progress => { if (run === subtitleRunRef.current) setSubtitleProgress(progress) }, draft.options, {
          completed: draft.rows,
          onCheckpoint: async rows => {
            if (run !== subtitleRunRef.current) return
            const checkpoint = { ...draft, rows }
            setSubtitleDraft(checkpoint)
            const saved = await saveSubtitleDraft(checkpoint)
            if (!saved && run === subtitleRunRef.current) setSubtitleError('Bản nháp còn trong phiên này nhưng chưa lưu được vào trình duyệt. Đừng reload trước khi áp dụng hoặc kiểm tra dung lượng lưu trữ.')
            ensureActive()
            await showTranslatedRows(rows)
          },
        })
        subtitleJobRef.current = job
        const rows = await job.promise
        if (run !== subtitleRunRef.current) return
        subtitleJobRef.current = null
        setSubtitleDraft({ ...draft, rows })
        if (!await saveSubtitleDraft({ ...draft, rows })) setSubtitleError('Bản dịch còn trong phiên này nhưng chưa lưu được vào trình duyệt. Đừng reload trước khi áp dụng.')
        ensureActive()
        if (draft.options.autoApply) await showTranslatedRows(rows)
        if (canAutoApplyTranslation(source, rows, draft.options)) {
          setSubtitleDraft(null)
          await saveSubtitleDraft(null)
          setNotice(`Đã hiển thị ${rows.length} câu Việt sub cùng Pinyin trên timeline và preview.`)
        } else if (draft.options.autoApply) {
          setNotice(`Đã hiển thị ${visibleTranslationRows(source, rows).length}/${source.length} câu Việt sub cùng Pinyin. ${translationReviewIssues(rows).length} câu cần kiểm tra nghĩa; mở Duyệt Việt sub để sửa trước khi xuất.`)
        } else {
          setNotice(`Đã dịch ${rows.length}/${source.length} câu. ${translationReviewIssues(rows).length ? 'Có câu cần kiểm tra nghĩa;' : 'Đã tắt tự thêm vào timeline;'} mở Duyệt Việt sub và nhấn Áp dụng bản dịch đã duyệt.`)
        }
      }
    } catch (error) {
      if (run === subtitleRunRef.current && !(error instanceof DOMException && error.name === 'AbortError')) setSubtitleError(error instanceof Error ? error.message : 'Không tạo được phụ đề bổ sung.')
    } finally {
      if (run === subtitleRunRef.current) { subtitleJobRef.current = null; setSubtitleBusy(false); setSubtitleProgress(null) }
    }
  }

  const createFromAudio = async (file: File, template: ShortTemplate, languageChoice: string, titleDraft: CreatorTitleContent) => {
    if (creatorBusy || creatorStyleBusy || subtitleBusy || subtitleApplying) return
    const run = ++creatorRunRef.current
    const staged: Array<{ asset: MediaAsset; blob: Blob }> = []
    const savedIds: string[] = []
    let committed = false
    const audioUrl = URL.createObjectURL(file)
    objectUrlsRef.current.add(audioUrl)
    const ensureActive = () => { if (run !== creatorRunRef.current) throw new DOMException('Đã hủy tạo video.', 'AbortError') }
    setCreatorBusy(true); setCreatorError(null); setCreatorResult(null); setIsPlaying(false)
    try {
      if (!projectReady) throw new Error('Project đang tải. Hãy thử lại sau một giây.')
      if (template.kind !== 'lyric') throw new Error('Hãy chọn phong cách video ca nhạc.')
      if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|wav|flac|ogg)$/i.test(file.name)) throw new Error('Hãy chọn file audio hợp lệ.')
      const duration = await readAudioDurationStrict(audioUrl)
      ensureActive()
      if (duration > 600) throw new Error('Audio dài tối đa 10 phút. Hãy cắt thành đoạn ngắn hơn.')
      const projectAtStart = JSON.stringify(latestEditRef.current)
      const language = languageChoice === 'auto' ? suggestAudioLanguage(file.name) : languageChoice
      const languageLabel = language === 'chinese' ? 'Tiếng Trung' : language === 'vietnamese' ? 'Tiếng Việt' : language === 'english' ? 'English' : 'Tự nhận diện'
      setCreatorProgress({ message: languageChoice === 'auto' && language !== 'auto' ? `Đã gợi ý ${languageLabel} từ tên file. Đang nghe lời trong audio…` : 'Đang nghe lời trong audio…' })
      const job = transcribeMedia({ url: audioUrl, trimStart: 0, trimEnd: duration, language, model: 'base' }, setCreatorProgress)
      creatorJobRef.current = job
      const result = await job.promise
      ensureActive()
      creatorJobRef.current = null
      const transcript = cleanAudioTranscript(result.segments, language)
      const actualDuration = Math.min(duration, result.duration)
      const sceneCount = getIntelligenceSceneCount(actualDuration)
      const batchId = `intelligence-${crypto.randomUUID()}`
      const audioAsset: MediaAsset = { id: `${batchId}-audio-asset`, name: file.name, type: 'AUDIO', duration: actualDuration, tone: 'audio', url: audioUrl, source: 'local', waveform: makeFallbackWaveform(file.name) }
      staged.push({ asset: audioAsset, blob: file })
      for (let index = 0; index < sceneCount; index++) {
        const blob = await loadTemplateSceneBlob(template, index)
        ensureActive()
        const url = URL.createObjectURL(blob)
        objectUrlsRef.current.add(url)
        staged.push({ asset: { id: `${batchId}-art-${index}`, name: `${template.name} · Cảnh ${String(index + 1).padStart(2, '0')}`, type: 'IMAGE', duration: actualDuration / sceneCount, tone: 'local', url, source: 'local' }, blob })
      }
      const latest = latestEditRef.current
      const titleContent = resolveCreatorTitle(titleDraft, file.name)
      const sequence = createIntelligenceSequence(template, staged.slice(1).map(item => item.asset.id), audioAsset.id, actualDuration, transcript.segments, 0, 0, 1, batchId, titleContent)
      setCreatorProgress({ message: 'Đang lưu audio, ảnh nền và phụ đề vào project…' })
      for (const { asset, blob } of staged) {
        ensureActive()
        if (!await saveMediaFile(asset, blob)) throw new Error('Không lưu được media vào trình duyệt. Hãy kiểm tra dung lượng trống.')
        savedIds.push(asset.id)
      }
      ensureActive()
      if (JSON.stringify(latestEditRef.current) !== projectAtStart) throw new Error('Project đã thay đổi trong lúc nhận diện. Hãy chạy lại để tránh ghi đè chỉnh sửa mới.')
      await saveProjectSnapshot({ version: 3, name: 'Before Intelligence Creator', aspectRatio, clips: latest.clips, textCaptions: latest.textCaptions, timelineLayers: latest.timelineLayers, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality })
      ensureActive()
      cancelCaptions()
      setAssets(current => [...current, ...staged.map(item => item.asset)])
      const createdClips = sequence.clips.map(clip => clip.id === `${batchId}-audio` ? { ...clip, creatorTitleContent: titleContent } : clip)
      const createdLayers = withCreatorTitleLayers([...initialTimelineLayers, { id: `${batchId}-text-track`, type: 'TEXT', index: 1, name: 'Lời từ audio' }], sequence.captions, `${batchId}-audio`)
      setClips(createdClips); setTextCaptions(sequence.captions)
      setTimelineLayers(createdLayers)
      setHiddenLayers({}); setMutedLayers({}); setTemplateUndo(null)
      setAspectRatio(template.ratio)
      setSelectedClipId(sequence.clips[0].id); setSelectedClipIds([sequence.clips[0].id])
      setSelectedTextId(sequence.captions[0].id); setSelectedTextIds([]); setInspectorTab('Text')
      seekTo(0); setIsPlaying(false)
      pendingTemplateFocusRef.current = sequence.clips[0].id
      setCreatorResult({ name: file.name, duration: actualDuration, captionCount: sequence.captionCount, language: languageLabel, omitted: transcript.omitted })
      setNotice(`Đã tạo video ${formatTime(actualDuration)} với ${sequence.captionCount} câu từ audio${titleContent.enabled ? ' và title thiết kế' : ''}${transcript.omitted ? `; bỏ ${transcript.omitted} đoạn không rõ` : ''}.`)
      committed = true
      await saveProjectSnapshot({ version: 3, name: `Intelligence · ${file.name}`, aspectRatio: template.ratio, clips: createdClips, textCaptions: sequence.captions, timelineLayers: createdLayers, hiddenLayers: {}, mutedLayers: {}, selectedClipId: sequence.clips[0].id, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality })
      void readWaveform(audioUrl).then(waveform => setAssets(current => current.map(asset => asset.id === audioAsset.id ? { ...asset, waveform } : asset)))
    } catch (error) {
      if (run === creatorRunRef.current && !(error instanceof DOMException && error.name === 'AbortError')) setCreatorError(error instanceof Error ? error.message : 'Không tạo được video từ audio.')
    } finally {
      if (!committed) {
        staged.forEach(({ asset }) => { if (asset.url) { URL.revokeObjectURL(asset.url); objectUrlsRef.current.delete(asset.url) } })
        if (!staged.some(item => item.asset.url === audioUrl)) { URL.revokeObjectURL(audioUrl); objectUrlsRef.current.delete(audioUrl) }
        savedIds.forEach(id => { void deleteMediaFile(id) })
      }
      if (run === creatorRunRef.current) { creatorJobRef.current = null; setCreatorBusy(false); setCreatorProgress(null) }
    }
  }

  const applyIntelligenceStyle = async (template: ShortTemplate, titleDraft: CreatorTitleContent, titleOnly = false) => {
    if (!projectReady || creatorBusy || creatorStyleBusy || subtitleBusy || subtitleApplying) return
    const before = latestEditRef.current
    const audio = before.clips.find(clip => clip.id.startsWith('intelligence-') && clip.id.endsWith('-audio') && assets.some(asset => asset.id === clip.assetId && asset.type === 'AUDIO'))
    if (!audio) return setCreatorError('Hãy tạo video bằng Intelligence Creator trước khi đổi phong cách.')
    const batch = audio.id.slice(0, -'-audio'.length)
    const scenes = titleOnly ? [] : before.clips.filter(clip => clip.id.startsWith(`${batch}-scene-`) && assets.some(asset => asset.id === clip.assetId && asset.type === 'IMAGE' && (asset.id.startsWith(`${batch}-art-`) || asset.id.startsWith('creator-restyle-'))))
    const nextRatio = titleOnly ? aspectRatio : template.ratio
    const titleTemplate = titleOnly ? { ...template, ratio: aspectRatio } : template
    const staged: Array<{ asset: MediaAsset; blob: Blob; clipId: string }> = []
    const signature = JSON.stringify(before)
    let committed = false
    setCreatorStyleBusy(true); setCreatorError(null); setIsPlaying(false)
    try {
      for (const [index, clip] of scenes.entries()) {
        const blob = await loadTemplateSceneBlob(template, index)
        const url = URL.createObjectURL(blob)
        objectUrlsRef.current.add(url)
        const asset: MediaAsset = { id: `creator-restyle-${crypto.randomUUID()}`, name: `${template.name} · Cảnh ${index + 1}`, type: 'IMAGE', duration: getClipDuration(clip), tone: 'local', url, source: 'local' }
        staged.push({ asset, blob, clipId: clip.id })
        if (!await saveMediaFile(asset, blob)) throw new Error('Không đủ dung lượng để lưu phong cách. Project cũ vẫn được giữ nguyên.')
      }
      if (JSON.stringify(latestEditRef.current) !== signature) throw new Error('Project đã thay đổi trong lúc đổi phong cách. Hãy thử lại.')
      if (!await saveProjectSnapshot({ version: 3, name: `Before ${titleOnly ? 'title' : 'style'} · ${template.name}`, aspectRatio, ...before, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality })) throw new Error('Không lưu được bản dự phòng. Project hiện tại chưa thay đổi.')
      if (JSON.stringify(latestEditRef.current) !== signature) throw new Error('Project đã thay đổi. Chưa áp dụng phong cách để giữ chỉnh sửa mới.')
      const sceneAssets = new Map(staged.map(item => [item.clipId, item.asset.id]))
      const restyled = titleOnly ? [] : before.textCaptions.filter(caption => caption.origin === 'auto' && caption.sourceClipId === audio.id).map(caption =>
        caption.id.endsWith('-pinyin') || caption.id.endsWith('-vietnamese') ? { ...caption, creatorStyleId: template.creator ? template.id : undefined, lyricStyleVersion: undefined, lyricPresentation: template.creator?.lyricPresentation, lyricViewport: template.creator?.lyricViewport } : styleIntelligenceCaption(caption, template))
      const captionMap = new Map(applyProfessionalLyricStyle(restyled).map(caption => [caption.id, caption]))
      const titleContent = resolveCreatorTitle(titleDraft, assets.find(asset => asset.id === audio.assetId)?.name ?? '')
      const oldTitles = before.textCaptions.filter(caption => caption.creatorTitle && caption.sourceClipId === audio.id)
      const firstTrack = Math.max(-1, ...before.timelineLayers.filter(layer => layer.type === 'TEXT').map(layer => layer.index), ...before.textCaptions.map(caption => caption.track ?? 0)) + 1
      let nextTrack = firstTrack
      const titleTracks = new Map(TITLE_ROLES.map(role => [role, oldTitles.find(caption => caption.creatorTitle === role)?.track
        ?? before.timelineLayers.find(layer => layer.type === 'TEXT' && layer.id.startsWith(`${audio.id}-title-track-${role}-`))?.index
        ?? nextTrack++]))
      const titles = restyleCreatorTitles(titleTemplate, titleContent, getClipDuration(audio), audio.id, firstTrack, getClipStart(audio, before.clips), before.textCaptions)
        .map(caption => oldTitles.some(old => old.id === caption.id) ? caption : { ...caption, track: titleTracks.get(caption.creatorTitle!)! })
      const nextCaptions = [...before.textCaptions.filter(caption => !caption.creatorTitle || caption.sourceClipId !== audio.id).map(caption => captionMap.get(caption.id) ?? caption), ...titles]
      setClipHistory(history => [...history.slice(-29), before.clips]); setClipFuture([])
      setTextHistory(history => [...history.slice(-29), before.textCaptions]); setTextFuture([])
      setAssets(current => [...current, ...staged.map(item => item.asset)])
      const nextClips = before.clips.map(clip => {
        if (clip.id === audio.id) return { ...clip, creatorTitleContent: titleContent }
        if (!sceneAssets.has(clip.id)) return clip
        const index = scenes.findIndex(scene => scene.id === clip.id)
        const canRestyleMotion = clip.creatorMotion === true || !clip.visualKeyframes?.length
        const motion = canRestyleMotion ? createSceneMotion(template, index, getClipDuration(clip)) : clip.visualKeyframes
        return { ...clip, assetId: sceneAssets.get(clip.id)!, ...template.look, visualKeyframes: motion, creatorMotion: canRestyleMotion && Boolean(motion) }
      })
      const nextLayers = withCreatorTitleLayers(before.timelineLayers, nextCaptions, audio.id)
      latestEditRef.current = { clips: nextClips, textCaptions: nextCaptions, timelineLayers: nextLayers }
      setClips(nextClips)
      setTextCaptions(nextCaptions)
      setTimelineLayers(nextLayers)
      if (!titleOnly) setAspectRatio(nextRatio)
      setNotice(titleOnly ? 'Đã cập nhật riêng title. Giữ nguyên ảnh nền, tỷ lệ, audio và phụ đề.' : `Đã áp dụng ${template.name} · ${nextRatio}${titleContent.enabled ? ' và title trên track riêng' : ', tắt title thiết kế'}. Giữ audio, lời và mốc thời gian; bản cũ có trong Version history.`)
      committed = true
      // Do not rely on a debounced/background-tab timer for this explicit action.
      if (!await saveProjectSnapshot({ version: 3, name: `${titleOnly ? 'Title' : 'Style'} · ${template.name}`, aspectRatio: nextRatio, clips: nextClips, textCaptions: nextCaptions, timelineLayers: nextLayers, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality })) throw new Error('Đã áp dụng nhưng chưa lưu được. Hãy Save JSON trước khi reload; bản cũ còn trong Version history.')
    } catch (error) {
      setCreatorError(error instanceof Error ? error.message : 'Không đổi được phong cách.')
    } finally {
      if (!committed) staged.forEach(({ asset }) => { if (asset.url) { URL.revokeObjectURL(asset.url); objectUrlsRef.current.delete(asset.url) }; void deleteMediaFile(asset.id) })
      setCreatorStyleBusy(false)
    }
  }

  const applyTemplate = async (template: ShortTemplate, lyricLines?: string[]) => {
    const staged: Array<{ asset: MediaAsset; blob: Blob }> = []
    try {
      if (!projectReady) throw new Error('Project đang tải. Hãy thử lại sau một giây.')
      const workingTemplate = withTemplateLyrics(template, lyricLines ?? template.scenes.flatMap(scene => scene.lyrics ?? []))
      const batchId = `template-${crypto.randomUUID()}`
      workingTemplate.scenes.forEach((scene, index) => {
        const blob = new Blob([createTemplateSceneSvg(workingTemplate, index)], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        objectUrlsRef.current.add(url)
        staged.push({ asset: { id: `${batchId}-media-${index}`, name: `${template.name} · ${scene.label}`, type: 'IMAGE', duration: scene.duration, tone: 'local', url, source: 'local' }, blob })
      })
      const media = staged.map(({ asset }) => asset)
      const replaceDemo = clips.length === initialClips.length && textCaptions.length === initialTextCaptions.length && JSON.stringify(clips) === JSON.stringify(initialClips) && JSON.stringify(textCaptions) === JSON.stringify(initialTextCaptions) && JSON.stringify(timelineLayers) === JSON.stringify(initialTimelineLayers) && !Object.keys(hiddenLayers).length && !Object.keys(mutedLayers).length
      const baseClips = replaceDemo ? [] : clips
      const baseCaptions = replaceDemo ? [] : textCaptions
      const start = 0
      const track = timelineLayers.find(layer => layer.type === 'VIDEO' && !hiddenLayers[layer.id])?.index ?? 0
      const textTrack = Math.max(-1, ...timelineLayers.filter(l => l.type === 'TEXT').map(l => l.index)) + 1
      const sequence = createTemplateSequence(workingTemplate, media, start, track, textTrack, batchId)
      const stored = await Promise.all(staged.map(({ asset, blob }) => saveMediaFile(asset, blob)))
      if (stored.some(saved => !saved)) throw new Error('Không lưu được dữ liệu mẫu vào trình duyệt. Hãy kiểm tra dung lượng lưu trữ và thử lại.')
      const nextClips = [...sequence.clips, ...baseClips.map(clip => ({ ...clip, start: getClipStart(clip, baseClips) + sequence.duration }))]
      const nextText = [...sequence.captions, ...baseCaptions.map(caption => ({ ...caption, start: caption.start + sequence.duration }))]
      cancelCaptions()
      setTemplateUndo({ before: { clips, captions: textCaptions, layers: timelineLayers, ratio: aspectRatio }, after: { clips: nextClips, captions: nextText } })
      setAssets(current => [...current, ...media])
      setClips(nextClips); setTextCaptions(nextText)
      setTimelineLayers([...timelineLayers, { id: `text-template-${crypto.randomUUID()}`, type: 'TEXT', index: textTrack, name: template.name }])
      setAspectRatio(template.ratio)
      setSelectedClipId(sequence.clips[0].id); setSelectedClipIds([sequence.clips[0].id])
      setSelectedTextId(sequence.captions[0].id); setInspectorTab('Text')
      seekTo(0); setIsPlaying(false)
      pendingTemplateFocusRef.current = sequence.clips[0].id
      setNotice(`Đã import ${template.name} · ${sequence.duration.toFixed(1)}s từ 00:00${replaceDemo ? '' : '; nội dung cũ được dời về sau'}. Chọn clip hoặc chữ để tùy chỉnh.`)
    } catch (error) {
      staged.forEach(({ asset }) => { if (asset.url) { URL.revokeObjectURL(asset.url); objectUrlsRef.current.delete(asset.url) }; void deleteMediaFile(asset.id) })
      setNotice(error instanceof Error ? error.message : 'Không import được mẫu.')
    }
  }

  const undoTemplate = () => {
    if (!templateUndo || !canUndoTemplate) return
    setClips(templateUndo.before.clips); setTextCaptions(templateUndo.before.captions)
    setTimelineLayers(templateUndo.before.layers); setAspectRatio(templateUndo.before.ratio)
    setSelectedClipId(templateUndo.before.clips[0]?.id ?? null); setSelectedClipIds([])
    setSelectedTextId(null); setInspectorTab('Video'); setCurrentTime(0); setIsPlaying(false); setTemplateUndo(null)
    setNotice('Đã hoàn tác cảnh mẫu. Media mẫu vẫn có trong thư viện để dùng lại hoặc khôi phục phiên bản.')
  }

  useEffect(() => {
    const id = pendingTemplateFocusRef.current
    if (!id) return
    const clip = Array.from(document.querySelectorAll<HTMLElement>('.layered-timeline [data-clip-id]')).find(element => element.dataset.clipId === id)
    const scroller = document.querySelector<HTMLElement>('.layered-timeline .timeline-scroller')
    if (!clip || !scroller) return
    scroller.scrollLeft += clip.getBoundingClientRect().left - scroller.getBoundingClientRect().left - scroller.clientWidth / 3
    scroller.scrollTop += clip.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 32
    pendingTemplateFocusRef.current = null
  }, [assets, clips])

  const exportSubtitles = () => {
    const content = captionsToSrt(textCaptions.filter(c => c.origin === 'auto'))
    if (!content) return
    const url = URL.createObjectURL(new Blob([content], { type: 'application/x-subrip;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'opencut-subtitles.srt'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    const frame = previewRef.current
    const canvas = frame?.querySelector<HTMLDivElement>('.preview-canvas')
    if (!canvas || !frame) return
    const updateScale = () => {
      const ratio = aspectRatio === '9:16' ? 9 / 16 : aspectRatio === '1:1' ? 1 : 16 / 9
      const width = Math.max(1, Math.min(frame.clientWidth - 4, (frame.clientHeight - 4) * ratio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${width / ratio}px`
      setPreviewScale(width / DESIGN_WIDTH)
    }
    updateScale()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScale)
    observer?.observe(frame)
    return () => observer?.disconnect()
  }, [aspectRatio])

  useEffect(() => () => { captionJobRef.current?.cancel(); creatorJobRef.current?.cancel(); subtitleRunRef.current += 1; subtitleJobRef.current?.cancel() }, [])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.querySelectorAll<HTMLVideoElement>('[data-preview-clip-id]').forEach((media) => {
      const clip = clips.find((item) => item.id === media.dataset.previewClipId)
      if (!clip) return
      const explicitTime = Number(media.dataset.previewTime)
      const target = Number.isFinite(explicitTime) ? explicitTime : getClipSourceTime(clip, currentTime, clips)
      if (Math.abs(media.currentTime - target) > (isPlaying ? 0.28 : 0.035)) media.currentTime = target
      media.muted = true
      media.playbackRate = clip.speed ?? 1
      if (isPlaying && media.paused) void media.play().catch(() => undefined)
      else if (!isPlaying && !media.paused) media.pause()
    })
  }, [activeVisualClips, clips, currentTime, isPlaying, previewTransitionPairs])

  useEffect(() => () => { objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); objectUrlsRef.current.clear() }, [])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview || !selectedClip || selectedAsset?.type === 'AUDIO') return
    const targets = Array.from(preview.querySelectorAll<HTMLElement>('.preview-media:not(.preview-transition-media), .preview-art:not(.preview-transition-media)'))
    targets.forEach((target) => target.classList.add('preview-direct-target'))
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.preview-media:not(.preview-transition-media), .preview-art:not(.preview-transition-media)') : null
      if (!target || event.target instanceof Element && event.target.closest('.preview-overlay')) return
      previewTransformDragRef.current = { clipId: selectedClip.id, originX: selectedClip.positionX ?? 0, originY: selectedClip.positionY ?? 0, pointerX: event.clientX, pointerY: event.clientY, moved: false }
      target.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
    const handlePointerMove = (event: PointerEvent) => {
      const drag = previewTransformDragRef.current
      if (!drag) return
      const deltaX = event.clientX - drag.pointerX
      const deltaY = event.clientY - drag.pointerY
      if (Math.abs(deltaX) + Math.abs(deltaY) < 1) return
      if (!drag.moved) { setClipHistory((history) => [...history.slice(-29), clips]); setClipFuture([]); drag.moved = true }
      const rect = preview.querySelector<HTMLDivElement>('.preview-canvas')?.getBoundingClientRect() ?? preview.getBoundingClientRect()
      const designDeltaX = deltaX * DESIGN_WIDTH / Math.max(1, rect.width)
      const designDeltaY = deltaY * DESIGN_HEIGHT / Math.max(1, rect.height)
      setClips((current) => current.map((clip) => clip.id === drag.clipId ? { ...clip, positionX: drag.originX + designDeltaX, positionY: drag.originY + designDeltaY } : clip))
    }
    const handlePointerUp = () => {
      if (previewTransformDragRef.current?.moved) setNotice('Preview position updated.')
      previewTransformDragRef.current = null
    }
    const handleWheel = (event: WheelEvent) => {
      if (!event.altKey) return
      event.preventDefault()
      const nextScale = Math.max(0.1, Math.min(4, (selectedClip.scale ?? 1) - event.deltaY * 0.002))
      setClipHistory((history) => [...history.slice(-29), clips]); setClipFuture([])
      setClips((current) => current.map((clip) => clip.id === selectedClip.id ? { ...clip, scale: Number(nextScale.toFixed(2)) } : clip))
    }
    preview.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    preview.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      targets.forEach((target) => target.classList.remove('preview-direct-target'))
      preview.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      preview.removeEventListener('wheel', handleWheel)
    }
  }, [clips, selectedAsset?.type, selectedClip])

  useEffect(() => {
    const handleFullscreenChange = () => setIsPreviewFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!projectReady || !textCaptions.some(caption => (caption.id.endsWith('-pinyin') || caption.id.endsWith('-vietnamese')) && caption.lyricStyleVersion !== 2)) return
    setTextCaptions(current => applyProfessionalLyricStyle(current))
  }, [projectReady, textCaptions])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.classList.toggle('preview-fullscreen-fallback', isPreviewFullscreen && !document.fullscreenElement)
  }, [isPreviewFullscreen])

  useEffect(() => {
    const media = selectedAsset?.type === 'VIDEO' ? videoRef.current : selectedAsset?.type === 'AUDIO' ? audioRef.current : null
    if (!media || isPlaying) return
    media.currentTime = selectedClip ? getClipSourceTime(selectedClip, currentTime, clips) : 0
  }, [selectedAsset?.id, selectedClip?.id])

  useEffect(() => {
    if (!isPlaying) return
    playbackTimeRef.current = currentTime
    playbackTimestampRef.current = performance.now()
    let frame = 0
    let lastRender = 0
    const tick = (now: number) => {
      const elapsed = Math.max(0, (now - playbackTimestampRef.current) / 1000)
      playbackTimestampRef.current = now
      playbackTimeRef.current = Math.min(totalDuration, playbackTimeRef.current + elapsed)
      if (now - lastRender >= 30 || playbackTimeRef.current >= totalDuration) {
        setCurrentTime(playbackTimeRef.current)
        lastRender = now
      }
      if (playbackTimeRef.current >= totalDuration) { setIsPlaying(false); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, totalDuration])

  useEffect(() => {
    setVolume(selectedClip?.volume ?? 1)
    setSpeed(selectedClip?.speed ?? 1)
  }, [selectedClipId])

  useEffect(() => {
    clips.filter((clip) => assets.find((asset) => asset.id === clip.assetId)?.type === 'AUDIO').forEach((clip) => {
      const media = clip.id === selectedClipId ? audioRef.current : audioTrackRefs.current[clip.id]
      const asset = assets.find((item) => item.id === clip.assetId)
      if (!media || !asset?.url) return
      const start = getClipStart(clip, clips)
      const end = start + getClipDuration(clip)
      const inside = currentTime >= start && currentTime < end
      if (inside) {
        const target = clip.trimStart + currentTime - start
        if (Math.abs(media.currentTime - target) > (isPlaying ? 0.35 : 0.035)) media.currentTime = Math.max(clip.trimStart, Math.min(clip.trimEnd, target))
        media.volume = getEffectiveAudioVolume(clip, media.currentTime, clips, assets)
        const layer = getLayerForClip(clip, asset, timelineLayers)
        media.muted = Boolean(clip.muted || (layer && mutedLayers[layer.id]))
        media.playbackRate = clip.speed ?? 1
        if (isPlaying && media.paused) void media.play().catch(() => undefined)
        else if (!isPlaying && !media.paused) media.pause()
      } else {
        media.pause()
      }
    })
  }, [assets, clips, currentTime, isPlaying, mutedLayers, selectedClipId, timelineLayers])

  useEffect(() => {
    const storage = getEditorStorage()
    if (!storage) {
      setProjectReady(true)
      return
    }
    const savedSelectedClip = storage.getItem(selectedClipStorageKey)
    if (savedSelectedClip) setSelectedClipId(savedSelectedClip)
    setClips(loadSavedClips())
    setTextCaptions(loadSavedText())
  }, [])
  useEffect(() => {
    let cancelled = false
    void loadSubtitleDraft().then(draft => {
      if (cancelled) return
      setSubtitleDraft(draft)
      setSubtitleDraftReady(true)
    })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    void loadProjectSnapshot().then((snapshot) => {
      if (cancelled) return
      if (snapshot && Array.isArray(snapshot.clips) && Array.isArray(snapshot.textCaptions)) {
        const restoredClips = snapshot.clips.filter((clip): clip is TimelineClip => Boolean(clip && typeof clip === 'object' && typeof (clip as TimelineClip).id === 'string' && typeof (clip as TimelineClip).assetId === 'string'))
        const restoredText = snapshot.textCaptions.filter((caption): caption is TextCaption => Boolean(caption && typeof caption === 'object' && typeof (caption as TextCaption).id === 'string' && typeof (caption as TextCaption).text === 'string'))
        setClips(restoredClips)
        setTextCaptions(restoredText)
        if (isAspectRatio(snapshot.aspectRatio)) setAspectRatio(snapshot.aspectRatio)
        if (Array.isArray(snapshot.timelineLayers)) {
          const restoredLayers = snapshot.timelineLayers.filter((layer): layer is TimelineLayer => Boolean(layer && typeof layer === 'object' && typeof (layer as TimelineLayer).id === 'string' && ['VIDEO', 'AUDIO', 'TEXT'].includes((layer as TimelineLayer).type) && typeof (layer as TimelineLayer).index === 'number'))
          if (restoredLayers.length) setTimelineLayers(restoredLayers)
        }
        if (snapshot.hiddenLayers && typeof snapshot.hiddenLayers === 'object') setHiddenLayers(snapshot.hiddenLayers as Record<string, boolean>)
        if (snapshot.mutedLayers && typeof snapshot.mutedLayers === 'object') setMutedLayers(snapshot.mutedLayers as Record<string, boolean>)
        if (typeof snapshot.selectedClipId === 'string') { setSelectedClipId(snapshot.selectedClipId); setSelectedClipIds([snapshot.selectedClipId]) }
        if (snapshot.exportPreset === '2k' || snapshot.exportPreset === '1080p' || snapshot.exportPreset === '720p' || snapshot.exportPreset === '540p') setExportPreset(snapshot.exportPreset)
        if (snapshot.exportFps === 30 || snapshot.exportFps === 60) setExportFps(snapshot.exportFps)
        if (snapshot.exportFormat === 'mp4' || snapshot.exportFormat === 'webm') setExportFormat(snapshot.exportFormat)
        if (isExportBitrate(snapshot.exportBitrate)) setExportBitrate(snapshot.exportBitrate)
        if (snapshot.exportQuality === 'standard' || snapshot.exportQuality === 'high') setExportQuality(snapshot.exportQuality)
      }
      setProjectReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!projectReady) return
    const storage = getEditorStorage()
    if (!storage) return
    storage.setItem(clipsStorageKey, JSON.stringify(clips))
    storage.setItem(textStorageKey, JSON.stringify(textCaptions))
    if (selectedClipId) storage.setItem(selectedClipStorageKey, selectedClipId)
    else storage.removeItem(selectedClipStorageKey)
  }, [clips, textCaptions, selectedClipId, projectReady])

  useEffect(() => {
    if (!projectReady) return
    const timeout = window.setTimeout(() => void saveProjectSnapshot({ version: 3, name: 'Travel reel', aspectRatio, clips, textCaptions, timelineLayers, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality }), 500)
    return () => window.clearTimeout(timeout)
  }, [clips, textCaptions, timelineLayers, hiddenLayers, mutedLayers, selectedClipId, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality, projectReady, aspectRatio])

  useEffect(() => { if (projectReady) void countProjectVersions().then(setVersionCount) }, [projectReady, clips, textCaptions])

  useEffect(() => {
    let cancelled = false
    void loadMediaFiles().then((stored) => {
      if (cancelled || !stored.length) return
      const restoredAssets = stored.map((item) => { const url = URL.createObjectURL(item.blob); objectUrlsRef.current.add(url); return { id: item.id, name: item.name, type: item.type, duration: item.duration, tone: item.type === 'AUDIO' ? 'audio' : 'local', url, source: 'local' as const, waveform: item.type === 'AUDIO' ? makeFallbackWaveform(item.name) : undefined } })
      setAssets((current) => [...current, ...restoredAssets.filter((asset) => !current.some((item) => item.id === asset.id))])
      restoredAssets.filter((asset) => asset.type === 'AUDIO' && asset.url).forEach((asset) => void readWaveform(asset.url!).then((waveform) => setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, waveform } : item))))
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const handleSeek = (event: Event) => {
      const time = Number((event as CustomEvent<number>).detail)
      if (!Number.isFinite(time)) return
      const nextTime = Math.max(0, Math.min(totalDuration, time))
      const active = clips.filter((clip) => {
        const asset = assets.find((item) => item.id === clip.assetId)
        const start = getClipStart(clip, clips)
        return asset?.type !== 'AUDIO' && nextTime >= start && nextTime < start + getClipDuration(clip)
      }).sort((a, b) => getClipTrack(b) - getClipTrack(a) || getClipStart(b, clips) - getClipStart(a, clips))[0]
      if (active) {
        if (active.id !== selectedClipId) { setSelectedClipId(active.id); setSelectedClipIds([active.id]) }
        const media = active.id === selectedClipId ? (assets.find((item) => item.id === active.assetId)?.type === 'VIDEO' ? videoRef.current : null) : null
        if (media) media.currentTime = Math.max(active.trimStart, Math.min(active.trimEnd, active.trimStart + Math.max(0, nextTime - getClipStart(active, clips))))
      }
      seekTo(nextTime)
    }
    window.addEventListener('opencut:seek', handleSeek)
    return () => window.removeEventListener('opencut:seek', handleSeek)
  }, [assets, clips, selectedAsset?.id, selectedAsset?.type, selectedClip?.trimEnd, selectedClipId, totalDuration])

  useEffect(() => {
    const handleAddAsset = (event: Event) => {
      const assetId = String((event as CustomEvent<string>).detail)
      addAssetToTimeline(assetId)
    }
    window.addEventListener('opencut:add-asset', handleAddAsset)
    return () => window.removeEventListener('opencut:add-asset', handleAddAsset)
  }, [assets])

  useEffect(() => {
    const handleRenameAsset = (event: Event) => {
      const { assetId, name } = (event as CustomEvent<{ assetId: string; name: string }>).detail ?? {}
      if (!assetId || !name?.trim()) return
      setAssets((current) => current.map((asset) => asset.id === assetId ? { ...asset, name: name.trim() } : asset))
      setNotice('Media renamed.')
    }
    const handleDeleteAsset = (event: Event) => {
      const assetId = String((event as CustomEvent<string>).detail ?? '')
      if (!assetId) return
      const remaining = clips.filter((clip) => clip.assetId !== assetId)
      setAssets((current) => { const removed = current.find((asset) => asset.id === assetId); if (removed?.url) { URL.revokeObjectURL(removed.url); objectUrlsRef.current.delete(removed.url) }; return current.filter((asset) => asset.id !== assetId) })
      setClips(remaining)
      if (selectedClip?.assetId === assetId) setSelectedClipId(remaining[0]?.id ?? null)
      void deleteMediaFile(assetId)
      setNotice('Media removed from project.')
    }
    window.addEventListener('opencut:rename-asset', handleRenameAsset)
    window.addEventListener('opencut:delete-asset', handleDeleteAsset)
    return () => { window.removeEventListener('opencut:rename-asset', handleRenameAsset); window.removeEventListener('opencut:delete-asset', handleDeleteAsset) }
  }, [clips, selectedClip?.assetId])

  useEffect(() => {
    const handleAddText = (event: Event) => {
      const caption: TextCaption = { id: `caption-${Date.now()}`, text: String((event as CustomEvent<string>).detail || 'Your caption'), start: Math.max(0, currentTime - 0.2), duration: 4, color: '#ffffff', font: 'Inter', size: 34, x: 50, y: 78 }
      setTextCaptions((current) => [...current, caption])
      setSelectedTextId(caption.id)
      setInspectorTab('Text')
      setNotice('Caption added. Edit it in Inspector → Text.')
    }
    const handleAutoSubtitle = () => {
      setActiveTool('Captions')
    }
    const handleCycleTransition = () => {
      if (!selectedClipId) return setNotice('Select a video clip first.')
      const sequence: TransitionType[] = ['none', 'fade', 'dissolve', 'slide']
      const current = clips.find((clip) => clip.id === selectedClipId)?.transition?.type ?? 'none'
      const next = sequence[(sequence.indexOf(current) + 1) % sequence.length]
      commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, transition: { type: next, duration: next === 'none' ? 0 : 0.6 } } : clip))
      setNotice(next === 'none' ? 'Transition removed.' : `${next} transition applied.`)
    }
    const handleApplyFilter = (event: Event) => {
      if (!selectedClipId) return setNotice('Select a video clip first.')
      const preset = String((event as CustomEvent<string>).detail ?? '')
      const values: Record<string, Pick<TimelineClip, 'brightness' | 'contrast' | 'saturation'>> = {
        Original: { brightness: 100, contrast: 100, saturation: 100 },
        Cinema: { brightness: 94, contrast: 122, saturation: 86 },
        Warm: { brightness: 104, contrast: 108, saturation: 118 },
        Mono: { brightness: 100, contrast: 118, saturation: 0 },
      }
      const nextValues = values[preset]
      if (!nextValues) return
      commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, ...nextValues } : clip))
      setNotice(`${preset} filter applied.`)
    }
    const handleResetAdjust = () => {
      if (!selectedClipId) return setNotice('Select a clip to reset adjustments.')
      commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1, brightness: 100, contrast: 100, saturation: 100 } : clip))
      setNotice('Clip adjustments reset.')
    }
    const handleContextAction = (event: Event) => {
      const action = String((event as CustomEvent<string>).detail ?? '')
      if (action === 'split') splitSelectedClip()
      if (action === 'duplicate') duplicateSelectedClip()
      if (action === 'delete') deleteSelectedClip()
      if (action === 'mute') updateClipSetting('muted', !selectedClip?.muted)
      if (action === 'transition') handleCycleTransition()
    }
    const handleMoveClip = (event: Event) => {
      const { clipId, start, track, audioTrack, group, originStart } = (event as CustomEvent<{ clipId: string; start: number; track?: number; audioTrack?: number; originStart?: number; group?: Array<{ id: string; start: number; track: number; audioTrack: number; isAudio: boolean }> }>).detail ?? {}
      if (!clipId || !Number.isFinite(start)) return
      if (group?.length && Number.isFinite(originStart)) {
        const anchor = group.find(item => item.id === clipId)
        if (!anchor) return
        const delta = Math.max(-Math.min(...group.map(item => item.start)), start - originStart!)
        const trackDelta = track === undefined ? 0 : track - anchor.track
        const audioTrackDelta = audioTrack === undefined ? 0 : audioTrack - anchor.audioTrack
        const origins = new Map(group.map(item => [item.id, item]))
        setClips(current => current.map(clip => {
          const origin = origins.get(clip.id)
          if (!origin) return clip
          return { ...clip, start: Math.max(0, origin.start + delta), ...(origin.isAudio ? { audioTrack: Math.max(0, origin.audioTrack + audioTrackDelta) } : { track: Math.max(0, origin.track + trackDelta) }) }
        }))
        return
      }
      setClips((current) => current.map((clip) => clip.id === clipId ? { ...clip, start: Math.max(0, start), ...(track !== undefined && Number.isFinite(track) ? { track: Math.max(0, track) } : {}), ...(audioTrack !== undefined && Number.isFinite(audioTrack) ? { audioTrack: Math.max(0, audioTrack) } : {}) } : clip))
    }
    const handleTimelineEditStart = () => {
      setClipHistory((history) => [...history.slice(-29), clips])
      setClipFuture([])
    }
    const handleResizeClip = (event: Event) => {
      const { clipId, edge, delta, baseStart, baseTrimStart, baseTrimEnd } = (event as CustomEvent<{ clipId: string; edge: 'left' | 'right'; delta: number; baseStart: number; baseTrimStart: number; baseTrimEnd: number }>).detail ?? {}
      if (!clipId || !Number.isFinite(delta)) return
      setClips((current) => {
        const updated = current.map((clip) => {
        if (clip.id !== clipId) return clip
        if (edge === 'left') return { ...clip, trimStart: Math.max(0, Math.min(baseTrimEnd - 0.1, baseTrimStart + delta)), start: Math.max(0, baseStart + delta) }
        return { ...clip, trimEnd: Math.max(baseTrimStart + 0.1, baseTrimEnd + delta) }
        })
        return rippleEdit ? rippleTimeline(updated, current, clipId, assets) : updated
      })
      }
    const handleResizeTransition = (event: Event) => {
      const { clipId, delta, baseDuration } = (event as CustomEvent<{ clipId: string; delta: number; baseDuration: number }>).detail ?? {}
      if (!clipId || !Number.isFinite(delta)) return
      setClips((current) => current.map((clip) => clip.id === clipId && clip.transition ? { ...clip, transition: { ...clip.transition, duration: Math.max(0.1, Math.min(Math.min(3, getClipDuration(clip)), baseDuration + delta)) } } : clip))
    }
    const handleResizeFade = (event: Event) => {
      const { clipId, edge, delta, baseDuration } = (event as CustomEvent<{ clipId: string; edge: 'fadeIn' | 'fadeOut'; delta: number; baseDuration: number }>).detail ?? {}
      if (!clipId || !Number.isFinite(delta)) return
      setClips((current) => current.map((clip) => clip.id === clipId ? { ...clip, [edge]: Math.max(0, Math.min(getClipDuration(clip) / 2, baseDuration + (edge === 'fadeIn' ? delta : -delta))) } : clip))
    }
    window.addEventListener('opencut:add-text', handleAddText)
    window.addEventListener('opencut:auto-subtitle', handleAutoSubtitle)
    window.addEventListener('opencut:cycle-transition', handleCycleTransition)
    window.addEventListener('opencut:apply-filter', handleApplyFilter)
    window.addEventListener('opencut:reset-adjust', handleResetAdjust)
    window.addEventListener('opencut:context-action', handleContextAction)
    window.addEventListener('opencut:timeline-edit-start', handleTimelineEditStart)
    window.addEventListener('opencut:move-clip', handleMoveClip)
    window.addEventListener('opencut:resize-clip', handleResizeClip)
    window.addEventListener('opencut:resize-transition', handleResizeTransition)
    window.addEventListener('opencut:resize-fade', handleResizeFade)
    return () => { window.removeEventListener('opencut:add-text', handleAddText); window.removeEventListener('opencut:auto-subtitle', handleAutoSubtitle); window.removeEventListener('opencut:cycle-transition', handleCycleTransition); window.removeEventListener('opencut:apply-filter', handleApplyFilter); window.removeEventListener('opencut:reset-adjust', handleResetAdjust); window.removeEventListener('opencut:context-action', handleContextAction); window.removeEventListener('opencut:timeline-edit-start', handleTimelineEditStart); window.removeEventListener('opencut:move-clip', handleMoveClip); window.removeEventListener('opencut:resize-clip', handleResizeClip); window.removeEventListener('opencut:resize-transition', handleResizeTransition); window.removeEventListener('opencut:resize-fade', handleResizeFade) }
  }, [assets, clips, currentTime, rippleEdit, selectedClipId])

  const selectClip = (clipId: string) => {
    const clip = clips.find((item) => item.id === clipId)
    if (clip) seekTo(getClipStart(clip, clips))
    setSelectedClipId(clipId)
    setSelectedClipIds([clipId])
    setSelectedTextId(null)
    setSelectedTextIds([])
    setInspectorTab(assets.find(asset => asset.id === clips.find(clip => clip.id === clipId)?.assetId)?.type === 'AUDIO' ? 'Audio' : 'Video')
    setIsPlaying(false)
  }

  const selectClips = (clipId: string, additive = false) => {
    const clip = clips.find((item) => item.id === clipId)
    if (!additive && clip && clipId !== selectedClipId) seekTo(getClipStart(clip, clips))
    const next = additive ? (selectedClipIds.includes(clipId) ? selectedClipIds.filter((id) => id !== clipId) : [...selectedClipIds, clipId]) : [clipId]
    setSelectedClipIds(next)
    setSelectedClipId(next.includes(clipId) ? clipId : next.at(-1) ?? null)
    if (!additive) { setSelectedTextId(null); setSelectedTextIds([]) }
    setInspectorTab(assets.find(asset => asset.id === clips.find(clip => clip.id === clipId)?.assetId)?.type === 'AUDIO' ? 'Audio' : 'Video')
    setIsPlaying(false)
  }

  const selectClipGroup = (ids: string[], focusId?: string, captionIds: string[] = []) => {
    const validIds = ids.filter(id => clips.some(clip => clip.id === id))
    const validCaptionIds = captionIds.filter(id => textCaptions.some(caption => caption.id === id))
    const focused = focusId && validIds.includes(focusId) ? focusId : validIds.at(-1) ?? null
    setSelectedClipIds(validIds)
    setSelectedClipId(focused)
    setSelectedTextIds(validCaptionIds)
    setSelectedTextId(validCaptionIds.at(-1) ?? null)
    if (focused) setInspectorTab(assets.find(asset => asset.id === clips.find(clip => clip.id === focused)?.assetId)?.type === 'AUDIO' ? 'Audio' : 'Video')
    else if (validCaptionIds.length) setInspectorTab('Text')
    setIsPlaying(false)
  }

  const selectTextOnTimeline = (captionId: string, additive = false) => {
    const caption = textCaptions.find(item => item.id === captionId)
    const next = additive ? (selectedTextIds.includes(captionId) ? selectedTextIds.filter(id => id !== captionId) : [...selectedTextIds, captionId]) : [captionId]
    setSelectedTextIds(next)
    setSelectedTextId(next.includes(captionId) ? captionId : next.at(-1) ?? null)
    if (!additive) { setSelectedClipIds([]); setSelectedClipId(null) }
    setInspectorTab('Text')
    if (caption && !additive) setCurrentTime(caption.start + Math.min(0.2, caption.duration / 4))
    setIsPlaying(false)
  }

  const addAssetToTimeline = (assetId: string, requestedStart?: number, requestedTrack = 0) => {
    const asset = assets.find((item) => item.id === assetId)
    if (!asset) return
    const visualClips = clips.filter((clip) => assets.find((item) => item.id === clip.assetId)?.type !== 'AUDIO')
    const defaultStart = asset.type === 'AUDIO' ? 0 : Math.max(0, ...visualClips.map((clip) => getClipStart(clip, clips) + getClipDuration(clip)))
    const start = requestedStart === undefined ? defaultStart : Math.max(0, Math.round(requestedStart * 2) / 2)
    const clip = { id: `clip-${asset.id}-${Date.now()}`, assetId: asset.id, trimStart: 0, trimEnd: asset.duration, start, track: asset.type === 'AUDIO' ? 0 : requestedTrack, audioTrack: asset.type === 'AUDIO' ? requestedTrack : undefined }
    setClips((current) => [...current, clip])
    setSelectedClipId(clip.id)
    setSelectedClipIds([clip.id])
    setSelectedTextId(null)
    setSelectedTextIds([])
    setNotice(`${asset.name} added at ${formatTime(start)}.`)
  }

  const addTimelineLayer = (type: TimelineLayer['type']) => {
    setTimelineLayers((current) => {
      const sameType = current.filter((layer) => layer.type === type)
      const index = sameType.length
      const name = type === 'VIDEO' ? `Video ${index + 1}` : type === 'AUDIO' ? `Audio ${index + 1}` : `Text ${index + 1}`
      const next = [...current, { id: `${type.toLowerCase()}-${index}-${Date.now()}`, type, index, name }]
      return [...next.filter((layer) => layer.type === 'VIDEO'), ...next.filter((layer) => layer.type === 'AUDIO'), ...next.filter((layer) => layer.type === 'TEXT')]
    })
    setNotice(`${type === 'VIDEO' ? 'Video' : type === 'AUDIO' ? 'Audio' : 'Text'} layer added.`)
  }

  const commitClipEdit = (next: TimelineClip[]) => {
    setClipHistory((history) => [...history.slice(-29), clips])
    setClipFuture([])
    setClips(next)
  }

  const commitRippleEdit = (next: TimelineClip[], changedId: string, removedDuration = 0) => {
    const updated = removedDuration ? rippleTimeline(next, clips, changedId, assets, -removedDuration) : rippleTimeline(next, clips, changedId, assets)
    commitClipEdit(updated)
  }

  const undoClipEdit = () => {
    const previous = clipHistory.at(-1)
    if (!previous) return setNotice('Nothing to undo yet.')
    setClipFuture((future) => [...future, clips])
    setClipHistory((history) => history.slice(0, -1))
    setClips(previous)
    setNotice('Last clip edit undone.')
  }

  const redoClipEdit = () => {
    const next = clipFuture.at(-1)
    if (!next) return setNotice('Nothing to redo yet.')
    setClipHistory((history) => [...history, clips])
    setClipFuture((future) => future.slice(0, -1))
    setClips(next)
    setNotice('Clip edit restored.')
  }

  const undoTextEdit = () => {
    const previous = textHistory.at(-1)
    if (!previous) return setNotice('Nothing to undo yet.')
    setTextFuture((future) => [...future, textCaptions]); setTextHistory((history) => history.slice(0, -1)); setTextCaptions(previous); setNotice('Last text edit undone.')
  }

  const redoTextEdit = () => {
    const next = textFuture.at(-1)
    if (!next) return setNotice('Nothing to redo yet.')
    setTextHistory((history) => [...history, textCaptions]); setTextFuture((future) => future.slice(0, -1)); setTextCaptions(next); setNotice('Text edit restored.')
  }

  const undoProjectEdit = () => { if (inspectorTab === 'Text') undoTextEdit(); else undoClipEdit() }
  const redoProjectEdit = () => { if (inspectorTab === 'Text') redoTextEdit(); else redoClipEdit() }

  const splitSelectedClip = () => {
    const clipToSplit = selectedClip
    if (!selectedClipId || !clipToSplit) return setNotice('Select a clip to split.')
    const clipStart = getClipStart(clipToSplit, clips)
    const splitAt = Math.max(clipToSplit.trimStart + 0.1, Math.min(clipToSplit.trimEnd - 0.1, clipToSplit.trimStart + currentTime - clipStart))
    if (splitAt <= clipToSplit.trimStart + 0.05 || splitAt >= clipToSplit.trimEnd - 0.05) return setNotice('Move the playhead inside the clip first.')
    const newClipId = `${clipToSplit.id}-split-${Date.now()}`
    commitClipEdit(clips.flatMap((clip) => clip.id === clipToSplit.id ? [{ ...clip, trimEnd: splitAt }, { ...clip, id: newClipId, trimStart: splitAt, start: (clip.start ?? clipStart) + splitAt - clip.trimStart }] : [clip]))
    setSelectedClipId(newClipId)
    setNotice('Clip split at playhead.')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    for (const file of files) {
      const type: AssetType | null = file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : file.type.startsWith('image/') ? 'IMAGE' : null
      if (!type) continue
      const url = URL.createObjectURL(file)
      objectUrlsRef.current.add(url)
      const duration = await readMediaDuration(url, type)
      const assetId = `asset-${Date.now()}-${file.name}`
      const clipId = `clip-${assetId}`
      const asset: MediaAsset = { id: assetId, name: file.name, type, duration, tone: type === 'AUDIO' ? 'audio' : 'local', url, source: 'local', waveform: type === 'AUDIO' ? makeFallbackWaveform(file.name) : undefined }
      setAssets((current) => [...current, asset])
      if (type === 'AUDIO') void readWaveform(url).then((waveform) => setAssets((current) => current.map((item) => item.id === assetId ? { ...item, waveform } : item)))
      void saveMediaFile(asset, file)
      setClips((current) => [...current, { id: clipId, assetId, trimStart: 0, trimEnd: duration, start: type === 'AUDIO' ? 0 : current.filter((clip) => assets.find((item) => item.id === clip.assetId)?.type !== 'AUDIO').reduce((sum, clip) => sum + getClipDuration(clip), 0) }])
      setSelectedClipId(clipId)
    }
    event.target.value = ''
  }

  const replaceSelectedMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const clipId = selectedClipId
    if (!file || !clipId) return
    const type: AssetType | null = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : null
    if (!type) return setNotice('Chọn file ảnh hoặc video để thay cảnh.')
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.add(url)
    let assetId: string | null = null
    try {
      const duration = await readMediaDuration(url, type)
      const currentClips = latestEditRef.current.clips
      const clip = currentClips.find(item => item.id === clipId)
      if (!clip) throw new Error('Clip đã thay đổi. Hãy chọn lại cảnh cần thay.')
      const sceneDuration = getClipDuration(clip)
      if (type === 'VIDEO' && duration + 0.05 < sceneDuration) throw new Error(`Video thay thế cần dài ít nhất ${sceneDuration.toFixed(1)}s. Bạn có thể rút ngắn cảnh trước trong Inspector.`)
      assetId = `asset-replacement-${crypto.randomUUID()}`
      const asset: MediaAsset = { id: assetId, name: file.name, type, duration: type === 'IMAGE' ? Math.max(5, sceneDuration) : duration, tone: 'local', url, source: 'local' }
      if (!await saveMediaFile(asset, file)) throw new Error('Không lưu được media thay thế vào project.')
      setAssets(current => [...current, asset])
      commitClipEdit(currentClips.map(item => item.id === clipId ? { ...item, assetId: asset.id, trimStart: 0, trimEnd: sceneDuration, fit: 'cover' } : item))
      setInspectorTab('Video')
      setNotice(`Đã thay cảnh bằng ${file.name}. Chữ và hiệu ứng mẫu vẫn giữ nguyên.`)
    } catch (error) {
      URL.revokeObjectURL(url)
      objectUrlsRef.current.delete(url)
      if (assetId) void deleteMediaFile(assetId)
      setNotice(error instanceof Error ? error.message : 'Không thay được media cho cảnh.')
    }
  }

  const deleteSelectedClip = () => {
    const ids = selectedClipIds.length ? selectedClipIds : selectedClipId ? [selectedClipId] : []
    if (!ids.length) return setNotice('Chọn clip cần xoá.')
    let remaining = clips
    ids.forEach((id) => {
      const removed = remaining.find((clip) => clip.id === id)
      if (!removed) return
      remaining = rippleEdit ? rippleTimeline(remaining.filter((clip) => clip.id !== id), remaining, id, assets, -getClipDuration(removed)) : remaining.filter((clip) => clip.id !== id)
    })
    const index = clips.findIndex((clip) => clip.id === selectedClipId)
    const nextClip = remaining[index] ?? remaining[index - 1] ?? null
    commitClipEdit(remaining)
    setSelectedClipId(nextClip?.id ?? null)
    setSelectedClipIds(nextClip ? [nextClip.id] : [])
    setIsPlaying(false)
    setNotice(`Đã xoá ${ids.length} clip khỏi timeline.`)
  }

  const updateTrim = (key: 'trimStart' | 'trimEnd', value: number) => {
    if (!selectedClipId || !selectedAsset) return
    const next = clips.map((clip) => {
      if (clip.id !== selectedClipId) return clip
      if (key === 'trimStart') {
        const trimStart = Math.min(value, clip.trimEnd - 0.1)
        return { ...clip, trimStart, start: Math.max(0, getClipStart(clip, clips) + trimStart - clip.trimStart) }
      }
      return { ...clip, trimEnd: Math.max(value, clip.trimStart + 0.1) }
    })
    commitRippleEdit(next, selectedClipId)
  }

  const updateVolume = (value: number) => {
    setVolume(value)
    if (!selectedClipId) return
    commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, volume: value } : clip))
  }

  const updateSpeed = (value: number) => {
    setSpeed(value)
    if (!selectedClipId) return
    commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, speed: value } : clip))
  }

  const updateClipSetting = (key: keyof TimelineClip, value: number | boolean | TimelineClip['volumeKeyframes']) => {
    if (!selectedClipId) return
    commitClipEdit(clips.map((clip) => clip.id === selectedClipId ? { ...clip, [key]: value } : clip))
  }

  const updateText = (key: keyof TextCaption, value: string | number | boolean) => {
    const selection = selectedCaptions(textCaptions, selectedTextIds, selectedTextId)
    const next = updateCaptionSelection(textCaptions, selection.map(caption => caption.id), key, value)
    if (next === textCaptions) return
    setTextHistory((history) => [...history.slice(-29), textCaptions])
    setTextFuture([])
    setTextCaptions(next)
  }

  const addStyledText = (style: 'headline' | 'editorial' | 'lower-third' | 'quote') => {
    const presets: Record<typeof style, Partial<Caption> & { text: string }> = {
      headline: { text: 'YOUR HEADLINE', font: 'Montserrat Variable', fontWeight: 800, size: aspectRatio === '9:16' ? 98 : 72, color: '#ffffff', y: 40, stroke: '#101017', strokeWidth: 2, shadow: true, animation: 'pop' },
      editorial: { text: 'A beautiful moment', font: 'Noto Serif TC Variable', fontWeight: 600, size: aspectRatio === '9:16' ? 86 : 68, color: '#f6e8d4', y: 75, shadow: true, animation: 'fade' },
      'lower-third': { text: 'Your name · Story', font: 'Be Vietnam Pro', fontWeight: 700, size: aspectRatio === '9:16' ? 62 : 48, color: '#ffffff', y: 84, background: '#141414c9', animation: 'slide' },
      quote: { text: '“Words worth remembering”', font: 'Plus Jakarta Sans Variable', fontWeight: 600, size: aspectRatio === '9:16' ? 68 : 55, color: '#ffffff', y: 62, shadow: true, animation: 'fade' },
    }
    const caption: Caption = { id: `text-${crypto.randomUUID()}`, start: currentTime, duration: 4, x: 50, y: 50, color: '#fff', font: 'Inter Variable', size: 68, track: 0, ...presets[style] }
    setTextHistory(history => [...history.slice(-29), textCaptions]); setTextFuture([])
    setTextCaptions(current => [...current, caption])
    if (!timelineLayers.some(layer => layer.type === 'TEXT' && layer.index === 0)) setTimelineLayers(current => [...current, { id: `text-main-${crypto.randomUUID()}`, type: 'TEXT', index: 0, name: 'Text' }])
    setSelectedTextId(caption.id); setSelectedTextIds([caption.id]); setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text')
    setNotice('Đã thêm text. Kéo trực tiếp trên preview hoặc chỉnh trong Inspector.')
  }

  const addSticker = async (id: StickerId) => {
    const preset = STICKER_PRESETS.find(item => item.id === id)!
    const svg = new Blob([stickerSvg(id)], { type: 'image/svg+xml' })
    const asset: MediaAsset = { id: `sticker-${crypto.randomUUID()}`, name: preset.name, type: 'IMAGE', duration: 4, tone: 'sticker', source: 'local' }
    if (!await saveMediaFile(asset, svg)) return setNotice('Không lưu được sticker vào trình duyệt. Kiểm tra dung lượng trước khi thử lại.')
    const url = URL.createObjectURL(svg)
    objectUrlsRef.current.add(url)
    const layerIndex = Math.max(-1, ...timelineLayers.filter(layer => layer.type === 'VIDEO').map(layer => layer.index)) + 1
    const clip: TimelineClip = { id: `clip-${asset.id}`, assetId: asset.id, trimStart: 0, trimEnd: 4, start: currentTime, track: layerIndex, scale: .72 }
    setAssets(current => [...current, { ...asset, url }])
    setClipHistory(history => [...history.slice(-29), clips]); setClipFuture([])
    setClips(current => [...current, clip])
    setTimelineLayers(current => [...current, { id: `video-sticker-${crypto.randomUUID()}`, type: 'VIDEO', index: layerIndex, name: `Sticker · ${preset.name}` }])
    setSelectedClipId(clip.id); setSelectedClipIds([clip.id]); setSelectedTextId(null); setSelectedTextIds([]); setInspectorTab('Video')
    setNotice(`Đã thêm ${preset.name} ở ${formatTime(currentTime)}. Kéo, đổi kích thước hoặc cắt trên timeline.`)
  }

  const patchSelectedVisualClip = (patch: Partial<TimelineClip>) => {
    if (!selectedClipId || selectedAsset?.type === 'AUDIO') return setNotice('Chọn video, ảnh hoặc sticker trên timeline trước.')
    const numeric = Object.fromEntries(VISUAL_KEYS.filter(key => typeof patch[key] === 'number').map(key => [key, patch[key]])) as VisualValues
    commitClipEdit(clips.map(clip => clip.id === selectedClipId ? { ...clip, ...patch, visualKeyframes: patch.visualKeyframes ?? clip.visualKeyframes?.map(frame => ({ ...frame, values: { ...frame.values, ...numeric } })), creatorMotion: Object.keys(numeric).length || patch.visualKeyframes ? false : clip.creatorMotion } : clip))
  }

  const patchVisualAtPlayhead = (patch: Partial<TimelineClip>, animate = false) => {
    if (!animate) return patchSelectedVisualClip(patch)
    if (!selectedClipId || selectedAsset?.type === 'AUDIO') return setNotice('Chọn video, ảnh hoặc sticker trên timeline trước.')
    const clip = clips.find(item => item.id === selectedClipId)
    if (!clip) return
    const numeric = Object.fromEntries(VISUAL_KEYS.filter(key => typeof patch[key] === 'number').map(key => [key, patch[key]])) as VisualValues
    const staticPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => !VISUAL_KEYS.includes(key as typeof VISUAL_KEYS[number]))) as Partial<TimelineClip>
    commitClipEdit(clips.map(item => item.id === clip.id ? { ...item, ...staticPatch, visualKeyframes: upsertVisualKeyframe(clip, currentTime - getClipStart(clip, clips), numeric, getClipDuration(clip)), creatorMotion: false } : item))
  }

  const selectSubtitleGroup = (track?: number) => {
    const ids = subtitleSelection(textCaptions, track)
    if (!ids.length) return setNotice('Chưa có subtitle để chọn.')
    setSelectedTextIds(ids); setSelectedTextId(ids.includes(selectedTextId ?? '') ? selectedTextId : ids[0])
    setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text'); setIsPlaying(false)
    setNotice(`Đã chọn ${ids.length} subtitle${track === undefined ? '' : ' cùng track'}. Chỉnh chữ hàng loạt trong Inspector.`)
  }

  const deleteSelectedText = () => {
    const ids = selectedTextId && !selectedTextIds.includes(selectedTextId) ? [selectedTextId] : selectedTextIds.length ? selectedTextIds : selectedTextId ? [selectedTextId] : []
    if (!ids.length) return setNotice('Chọn caption cần xoá.')
    setTextHistory((history) => [...history.slice(-29), textCaptions])
    setTextFuture([])
    setTextCaptions(textCaptions.filter((caption) => !ids.includes(caption.id)))
    setSelectedTextId(null)
    setSelectedTextIds([])
    setNotice(`Đã xoá ${ids.length} caption khỏi timeline.`)
  }

  const deleteTimelineSelection = () => {
    const clipCount = selectedClipIds.length || (selectedClipId ? 1 : 0)
    const captionCount = selectedTextIds.length || (!clipCount && selectedTextId ? 1 : 0)
    if (!clipCount && !captionCount) return setNotice('Chọn clip hoặc caption cần xoá.')
    if (clipCount) deleteSelectedClip()
    if (captionCount) deleteSelectedText()
  }

  const duplicateSelectedClip = () => {
    if (!selectedClip) return setNotice('Select a clip to duplicate.')
    const duplicate = { ...selectedClip, id: `${selectedClip.id}-copy-${Date.now()}` }
    const index = clips.findIndex((clip) => clip.id === selectedClip.id)
    const next = [...clips]
    next.splice(index + 1, 0, duplicate)
    commitClipEdit(next)
    setSelectedClipId(duplicate.id)
    setNotice('Clip duplicated.')
  }

  const copySelectedClips = () => {
    const copied = clips.filter((clip) => selectedClipIds.includes(clip.id))
    if (!copied.length) return setNotice('Select one or more clips to copy.')
    setClipboardClips(copied)
    setNotice(`${copied.length} clip${copied.length > 1 ? 's' : ''} copied.`)
  }

  const pasteClips = () => {
    if (!clipboardClips.length) return setNotice('Nothing copied yet.')
    const offset = Math.max(0, currentTime)
    const pasted = clipboardClips.map((clip, index) => ({ ...clip, id: `${clip.id}-paste-${Date.now()}-${index}`, start: offset + (getClipStart(clip, clips) - getClipStart(clipboardClips[0], clips)) }))
    commitClipEdit([...clips, ...pasted])
    setSelectedClipId(pasted[0].id)
    setSelectedClipIds(pasted.map((clip) => clip.id))
    setNotice(`${pasted.length} clip${pasted.length > 1 ? 's' : ''} pasted.`)
  }

  const cancelExport = () => {
    exportCancelRef.current = true
    ffmpegRef.current?.terminate()
    setNotice('Stopping export…')
  }

  const exportTimeline = async () => {
    if (isExporting) return
    if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) return setNotice('This browser does not support native video export.')
    const renderClips = clips.filter((clip) => {
      const asset = assets.find((item) => item.id === clip.assetId)
      const layer = getLayerForClip(clip, asset, timelineLayers)
      return asset?.type !== 'AUDIO' && (!layer || !hiddenLayers[layer.id])
    }).sort((a, b) => getClipStart(a, clips) - getClipStart(b, clips))
    if (!renderClips.length) return setNotice('Add a video or image clip before exporting.')
    const dimensions = exportDimensions(exportPreset, aspectRatio)
    const { width, height } = dimensions
    exportCancelRef.current = false
    setIsExporting(true); setExportProgress(0); setIsPlaying(false)
    setNotice('Đang chuẩn bị audio để xuất liên tục, không tua lại trong lúc render…')
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.position = 'fixed'
    canvas.style.left = '-10000px'
    canvas.style.top = '0'
    canvas.style.width = '1px'
    canvas.style.height = '1px'
    document.body.appendChild(canvas)
    const context = canvas.getContext('2d')
    if (!context) { canvas.remove(); setIsExporting(false); return setNotice('Canvas export is unavailable in this browser.') }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    const canvasStream = canvas.captureStream(0)
    const canvasTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
    const audioContext = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' })
    const audioDestination = audioContext.createMediaStreamDestination()
    let stopExportAudio: (() => void) | null = null
    let recorder: MediaRecorder | null = null
    const audioWarnings: string[] = []
    const audioClips = clips.filter((clip) => {
      const asset = assets.find(item => item.id === clip.assetId)
      const layer = getLayerForClip(clip, asset, timelineLayers)
      return asset?.url && asset.type !== 'IMAGE' && !clip.muted && !(layer && mutedLayers[layer.id]) && !(asset.type === 'VIDEO' && layer && hiddenLayers[layer.id])
    })
    try {
      await Promise.all(fontLoadRequests(textCaptions.map(caption => ({ font: caption.font, text: caption.text, size: caption.size, weight: captionWeight(caption) })))
        .map(request => document.fonts.load(request.css, request.text)))
      const audioPlan: ExportAudioClip[] = audioClips.map(clip => {
        const asset = assets.find(item => item.id === clip.assetId)!
        return { ...clip, url: asset.url!, name: asset.name, start: getClipStart(clip, clips), duration: getClipDuration(clip), voice: isVoiceClip(clip, assets), optionalAudio: asset.type === 'VIDEO' }
      })
      const preparedAudio = await prepareExportAudio(audioContext, audioPlan, () => exportCancelRef.current, warning => audioWarnings.push(warning))
      const videoCache = new Map<string, HTMLVideoElement>()
      const imageCache = new Map<string, HTMLImageElement>()
      for (const clip of renderClips) {
        const asset = assets.find((item) => item.id === clip.assetId)
        if (!asset?.url) continue
        if (asset.type === 'VIDEO' && !videoCache.has(asset.id)) {
          const video = document.createElement('video')
          video.src = asset.url; video.muted = true; video.preload = 'auto'
          await new Promise<void>((resolve) => { video.onloadeddata = () => resolve(); video.onerror = () => resolve() })
          videoCache.set(asset.id, video)
        }
        if (asset.type === 'IMAGE' && !imageCache.has(asset.id)) {
          const image = new Image(); image.src = asset.url
          await new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve() })
          imageCache.set(asset.id, image)
        }
      }
      if (exportCancelRef.current) throw new DOMException('Export cancelled', 'AbortError')
      const hasAudioTrack = preparedAudio.length > 0
      let mimeType = chooseRecorderMime(exportFormat, hasAudioTrack, candidate => MediaRecorder.isTypeSupported(candidate), exportPreset === '2k')
      if (!mimeType) throw new Error('No supported video recorder format was found.')
      const stream = new MediaStream([...canvasStream.getVideoTracks(), ...(hasAudioTrack ? audioDestination.stream.getAudioTracks() : [])])
      const createRecorder = (type: string) => new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: recorderVideoBitrate(exportBitrate, !type.startsWith('video/mp4')), audioBitsPerSecond: exportQuality === 'high' ? 256000 : 192000 })
      try {
        recorder = createRecorder(mimeType)
      } catch (error) {
        if (!mimeType.startsWith('video/mp4')) throw error
        mimeType = chooseRecorderMime('webm', hasAudioTrack, candidate => MediaRecorder.isTypeSupported(candidate))
        if (!mimeType) throw new Error('Trình duyệt không hỗ trợ ghi MP4 hoặc WebM ở cấu hình này.', { cause: error })
        recorder = createRecorder(mimeType)
      }
      const chunks: Blob[] = []
      const finished = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
        recorder!.onerror = () => { exportCancelRef.current = true; reject(new Error('MediaRecorder failed')) }
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      })
      void finished.catch(() => undefined)
      await audioContext.suspend()
      const exportEpoch = audioContext.currentTime
      stopExportAudio = scheduleExportAudio(audioContext, audioDestination, preparedAudio, exportEpoch)
      recorder.start(1000)
      await audioContext.resume()
      setNotice('Đang render video · audio phát theo lịch riêng, không bị kéo lùi theo khung hình.')
      const totalDurationToRender = Math.max(totalDuration, ...renderClips.map((clip) => getClipStart(clip, clips) + getClipDuration(clip)))
      const frameDuration = 1 / exportFps
      let timelineTime = 0
      let lastProgress = -1
      let lastAudioClock = audioContext.currentTime
      let lastAudioClockAdvanceAt = performance.now()
      while (!exportCancelRef.current && timelineTime < totalDurationToRender) {
        if (audioContext.state !== 'running') throw new Error('Đồng hồ audio đã dừng. Hãy giữ tab editor mở và thử xuất lại.')
        if (audioContext.currentTime > lastAudioClock + .001) { lastAudioClock = audioContext.currentTime; lastAudioClockAdvanceAt = performance.now() }
        else if (performance.now() - lastAudioClockAdvanceAt > 5000) throw new Error('Đồng hồ audio không chạy nên đã dừng export an toàn. Hãy mở editor ở tab đang hiển thị và thử lại; không xuất file video thiếu tiếng.')
        timelineTime = exportClockTime(audioContext.currentTime, exportEpoch, totalDurationToRender)
        if (timelineTime >= totalDurationToRender) break
        context.fillStyle = '#09090b'; context.fillRect(0, 0, width, height)
        const visible = renderClips.filter((clip) => { const start = getClipStart(clip, clips); return timelineTime >= start && timelineTime < start + getClipDuration(clip) }).sort((a, b) => getClipTrack(a) - getClipTrack(b) || getClipStart(a, clips) - getClipStart(b, clips))
        for (const rawClip of visible) {
          const clip = visualClipAt(rawClip, timelineTime, clips)
          const asset = assets.find((item) => item.id === clip.assetId)
          if (!asset) continue
          const start = getClipStart(clip, clips)
          const elapsed = Math.max(0, timelineTime - start)
          let visual = transitionVisual('none', 1)
          const transition = clip.transition
          if (transition && transition.type !== 'none' && elapsed < transition.duration) {
            visual = transitionVisual(transition.type, getTransitionProgress(clip, timelineTime, clips), transition.easing, transition.direction)
            const previous = renderClips.filter((candidate) => candidate.id !== clip.id && getClipTrack(candidate) === getClipTrack(clip) && getClipStart(candidate, clips) + getClipDuration(candidate) <= start + 0.05).sort((a, b) => getClipStart(b, clips) - getClipStart(a, clips))[0]
            if (previous && timelineTime >= start) {
              const previousFrame = visualClipAt(previous, timelineTime, clips)
              const previousAsset = assets.find((item) => item.id === previous.assetId)
              const previousSource = previousAsset?.type === 'VIDEO' ? videoCache.get(previousAsset.id) : previousAsset?.type === 'IMAGE' ? imageCache.get(previousAsset.id) : null
              if (previousSource && !visible.some((candidate) => candidate.id === previous.id)) {
                if (previousSource instanceof HTMLVideoElement) previousSource.currentTime = Math.max(previous.trimStart, Math.min(previous.trimEnd, previous.trimEnd - transition.duration + elapsed * (previous.speed ?? 1)))
                drawExportSource(context, previousSource, previousFrame, width, height, visual.outgoingOpacity)
              }
              else if (previousAsset && !visible.some((candidate) => candidate.id === previous.id)) drawExportFrame(context, previousAsset, { ...previousFrame, opacity: (previousFrame.opacity ?? 1) * visual.outgoingOpacity }, elapsed, width, height)
            }
          }
          const video = asset.type === 'VIDEO' ? videoCache.get(asset.id) : null
          const image = asset.type === 'IMAGE' ? imageCache.get(asset.id) : null
          if (video) { video.currentTime = Math.min(video.duration || clip.trimEnd, getClipSourceTime(clip, timelineTime, clips)); try { drawExportSource(context, video, clip, width, height, visual.incomingOpacity, visual.incomingOffset, visual.incomingOffsetY) } catch { drawExportFrame(context, asset, { ...clip, opacity: (clip.opacity ?? 1) * visual.incomingOpacity }, elapsed, width, height, visual.incomingOffset, visual.incomingOffsetY) } }
          else if (image) drawExportSource(context, image, clip, width, height, visual.incomingOpacity, visual.incomingOffset, visual.incomingOffsetY)
          else drawExportFrame(context, asset, { ...clip, opacity: (clip.opacity ?? 1) * visual.incomingOpacity }, elapsed, width, height, visual.incomingOffset, visual.incomingOffsetY)
        }
        resolveCaptionFrames(textCaptions, timelineTime, (caption) => {
          const textLayer = timelineLayers.find((layer) => layer.type === 'TEXT' && layer.index === (caption.track ?? 0))
          return Boolean(textLayer && hiddenLayers[textLayer.id])
        }).forEach(frame => drawExportCaption(context, frame.caption, timelineTime, width, height, frame))
        canvasTrack?.requestFrame()
        const progress = Math.min(89, Math.round((timelineTime / totalDurationToRender) * 89))
        if (progress !== lastProgress) { lastProgress = progress; setExportProgress(progress) }
        const nextFrameTime = (Math.floor(timelineTime / frameDuration) + 1) * frameDuration
        const clockNow = audioContext.currentTime - exportEpoch
        await new Promise(resolve => window.setTimeout(resolve, Math.max(1, (nextFrameTime - clockNow) * 1000)))
      }
      videoCache.forEach((video) => video.pause())
      stopExportAudio(); stopExportAudio = null
      if (recorder.state === 'recording') recorder.requestData()
      recorder.stop()
      const blob = await finished
      preparedAudio.length = 0
      videoCache.forEach(video => { video.pause(); video.removeAttribute('src'); video.load() })
      videoCache.clear(); imageCache.clear()
      audioDestination.stream.getTracks().forEach(track => track.stop())
      await audioContext.close()
      canvasStream.getTracks().forEach(track => track.stop())
      canvas.width = 1; canvas.height = 1; canvas.remove()
      if (!blob.size) throw new Error('The recorder produced an empty video. Please retry the export.')
      if (!exportCancelRef.current) {
        let outputBlob = blob
        let extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
        try {
          if (exportFormat === 'webm' || extension === 'mp4') {
            setExportProgress(99)
          } else {
            setNotice('Preparing MP4 encoder…')
            setExportProgress(90)
            const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')])
            const ffmpeg = new FFmpeg()
            ffmpegRef.current = ffmpeg
            ffmpeg.on('progress', ({ progress }) => {
              const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
              setExportProgress(90 + Math.min(9, Math.round(safeProgress * 9)))
            })
            await withExportTimeout(ffmpeg.load({
              coreURL: await toBlobURL(ffmpegCoreURL, 'text/javascript'),
              wasmURL: await toBlobURL(ffmpegWasmURL, 'application/wasm'),
            }), 60000)
            await ffmpeg.writeFile('opencut-input.webm', await fetchFile(blob))
            const encodeTimeout = Math.min(1800000, Math.max(60000, totalDurationToRender * 1000 * (width * height >= 2560 * 1440 ? 6 : 3)))
            const code = await withExportTimeout(ffmpeg.exec(mp4ExportArgs(exportFps, exportBitrate, exportQuality, totalDurationToRender)), encodeTimeout)
            if (code !== 0) throw new Error(`MP4 encoder failed (${code}).`)
            const mp4Data = await withExportTimeout(ffmpeg.readFile('opencut-output.mp4') as Promise<Uint8Array>, 10000)
            if (!mp4Data.byteLength) throw new Error('The MP4 encoder produced an empty file.')
            const mp4Bytes = new Uint8Array(mp4Data.byteLength)
            mp4Bytes.set(mp4Data)
            outputBlob = new Blob([mp4Bytes.buffer], { type: 'video/mp4' })
            extension = 'mp4'
            await ffmpeg.deleteFile('opencut-input.webm')
            await ffmpeg.deleteFile('opencut-output.mp4')
            ffmpeg.terminate()
            ffmpegRef.current = null
          }
        } catch (error) {
          ffmpegRef.current?.terminate()
          ffmpegRef.current = null
          outputBlob = blob
          extension = 'webm'
          setNotice(`Không mã hóa được MP4 (${error instanceof Error ? error.message : 'lỗi không xác định'}). Đang kiểm tra file WebM thay thế.`)
        }
        if (exportCancelRef.current) {
          setNotice('Export cancelled.')
          return
        }
        await validateExportBlob(outputBlob, dimensions)
        const url = URL.createObjectURL(outputBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `opencut-timeline-${exportPreset}.${extension}`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 60000)
        setExportProgress(100)
        setNotice(`Đã xuất ${width}×${height} · ${exportFps} FPS · ${extension.toUpperCase()} · ${Math.round(outputBlob.size / 1024)} KB.${exportFormat === 'mp4' && extension !== 'mp4' ? ' MP4 không khả dụng trên trình duyệt này; đã tải WebM.' : ''}${audioWarnings.length ? ` Lưu ý: ${audioWarnings.join(' ')}` : ''}`)
      } else {
        setNotice('Export cancelled.')
      }
    } catch (error) {
      setNotice(exportCancelRef.current ? 'Export cancelled.' : error instanceof Error ? error.message : 'Export failed.')
    } finally {
      stopExportAudio?.()
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      audioDestination.stream.getTracks().forEach(track => track.stop())
      if (audioContext.state !== 'closed') await audioContext.close()
      canvasStream.getTracks().forEach((track) => track.stop())
      canvas.remove()
      ffmpegRef.current = null
      setIsExporting(false)
    }
  }

  const handleExport = () => void exportTimeline()

  const exportProject = async () => {
    try {
      const stored = await loadMediaFiles()
      const media = await Promise.all(stored.map(async (item) => ({ id: item.id, name: item.name, type: item.type, duration: item.duration, dataUrl: await blobToDataUrl(item.blob) })))
      const project = { version: 3, name: 'Travel reel', aspectRatio, timelineLayers, hiddenLayers, mutedLayers, exportPreset, exportFps, exportFormat, exportBitrate, exportQuality, clips, textCaptions, assets: assets.map(({ id, name, type, duration, source }) => ({ id, name, type, duration, source })), media, exportedAt: new Date().toISOString() }
      const url = URL.createObjectURL(new Blob([JSON.stringify(project)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = 'opencut-travel-reel.project.json'; link.click(); URL.revokeObjectURL(url)
      setNotice('Project exported with local media.')
    } catch { setNotice('Could not package this project.') }
  }

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const project = JSON.parse(await file.text()) as { aspectRatio?: AspectRatio; timelineLayers?: TimelineLayer[]; hiddenLayers?: Record<string, boolean>; mutedLayers?: Record<string, boolean>; clips?: TimelineClip[]; textCaptions?: TextCaption[]; media?: Array<{ id: string; name: string; type: AssetType; duration: number; dataUrl: string }>; exportPreset?: ExportPreset; exportFps?: 30 | 60; exportFormat?: 'mp4' | 'webm'; exportBitrate?: ExportBitrate; exportQuality?: 'standard' | 'high' }
      if (!Array.isArray(project.clips) || !Array.isArray(project.textCaptions)) throw new Error('Invalid project file')
      const packagedMedia = Array.isArray(project.media) ? project.media : []
      if (packagedMedia.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || !['VIDEO', 'AUDIO', 'IMAGE'].includes(item.type) || typeof item.dataUrl !== 'string' || !item.dataUrl.startsWith('data:'))) throw new Error('Invalid packaged media')
      const importedAssets = packagedMedia.map((item) => { const blob = dataUrlToBlob(item.dataUrl); const url = URL.createObjectURL(blob); objectUrlsRef.current.add(url); return { asset: { id: item.id, name: item.name, type: item.type, duration: item.duration, tone: item.type === 'AUDIO' ? 'audio' : 'local', url, source: 'local' as const, waveform: item.type === 'AUDIO' ? makeFallbackWaveform(item.name) : undefined }, blob } })
      await Promise.all(importedAssets.map(({ asset, blob }) => saveMediaFile(asset, blob)))
      cancelCaptions()
      setTemplateUndo(null)
      setAspectRatio(isAspectRatio(project.aspectRatio) ? project.aspectRatio : '16:9')
      if (project.exportPreset === '2k' || project.exportPreset === '1080p' || project.exportPreset === '720p' || project.exportPreset === '540p') setExportPreset(project.exportPreset)
      if (project.exportFps === 30 || project.exportFps === 60) setExportFps(project.exportFps)
      if (project.exportFormat === 'mp4' || project.exportFormat === 'webm') setExportFormat(project.exportFormat)
      if (isExportBitrate(project.exportBitrate)) setExportBitrate(project.exportBitrate)
      if (project.exportQuality === 'standard' || project.exportQuality === 'high') setExportQuality(project.exportQuality)
      if (Array.isArray(project.timelineLayers)) setTimelineLayers(project.timelineLayers.filter(l => l && ['VIDEO', 'AUDIO', 'TEXT'].includes(l.type) && Number.isFinite(l.index)))
      setHiddenLayers(project.hiddenLayers ?? {})
      setMutedLayers(project.mutedLayers ?? {})
      const restoredClips = project.clips.filter((clip) => clip && typeof clip.id === 'string' && typeof clip.assetId === 'string')
      setClips(restoredClips)
      setTextCaptions(project.textCaptions.filter((caption) => caption && typeof caption.id === 'string' && typeof caption.text === 'string'))
      setSelectedClipId(restoredClips[0]?.id ?? null)
      setSelectedClipIds(restoredClips[0] ? [restoredClips[0].id] : [])
      setSelectedTextId(null)
      setCurrentTime(restoredClips[0]?.start ?? 0)
      setIsPlaying(false)
      if (importedAssets.length) {
        const replacementIds = new Set(importedAssets.map(({ asset }) => asset.id))
        assets.filter(asset => replacementIds.has(asset.id) && asset.url).forEach(asset => { URL.revokeObjectURL(asset.url!); objectUrlsRef.current.delete(asset.url!) })
        setAssets((current) => [...current.filter((asset) => !replacementIds.has(asset.id)), ...importedAssets.map(({ asset }) => asset)])
        importedAssets.map(({ asset }) => asset).filter((asset) => asset.type === 'AUDIO').forEach((asset) => void readWaveform(asset.url!).then((waveform) => setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, waveform } : item))))
      }
      setNotice('Project imported with packaged local media.')
    } catch { setNotice('Could not read this project JSON.') }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) { void document.exitFullscreen(); return }
    if (isPreviewFullscreen) { setIsPreviewFullscreen(false); return }
    const preview = previewRef.current
    if (!preview) return
    setIsPreviewFullscreen(true)
    void preview.requestFullscreen?.().catch(() => setNotice('Preview fullscreen mode enabled.'))
  }

  const toggleMute = () => {
    const nextVolume = volume === 0 ? selectedClip?.volume || 1 : 0
    updateVolume(nextVolume)
    setNotice(nextVolume === 0 ? 'Audio muted.' : 'Audio restored.')
  }

  const toggleLayer = (layer: TimelineLayer) => {
    if (layer.type === 'AUDIO') {
      setMutedLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))
      setNotice(`${layer.name} ${mutedLayers[layer.id] ? 'unmuted' : 'muted'}.`)
      return
    }
    setHiddenLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))
    setNotice(`${layer.name} ${hiddenLayers[layer.id] ? 'shown' : 'hidden'}.`)
  }

  const openVersionHistory = async () => {
    setShowVersionHistory(true)
    setVersionLoading(true)
    setVersionSnapshots(await loadProjectVersions())
    setVersionLoading(false)
  }

  const restoreVersion = (snapshot: Record<string, unknown>) => {
    cancelCaptions()
    setTemplateUndo(null)
    setAspectRatio(isAspectRatio(snapshot.aspectRatio) ? snapshot.aspectRatio : '16:9')
    if (Array.isArray(snapshot.clips)) setClips(snapshot.clips as TimelineClip[])
    if (Array.isArray(snapshot.textCaptions)) setTextCaptions(snapshot.textCaptions as TextCaption[])
    if (Array.isArray(snapshot.timelineLayers)) setTimelineLayers(snapshot.timelineLayers as TimelineLayer[])
    if (snapshot.hiddenLayers && typeof snapshot.hiddenLayers === 'object') setHiddenLayers(snapshot.hiddenLayers as Record<string, boolean>)
    if (snapshot.mutedLayers && typeof snapshot.mutedLayers === 'object') setMutedLayers(snapshot.mutedLayers as Record<string, boolean>)
    if (snapshot.exportPreset === '2k' || snapshot.exportPreset === '1080p' || snapshot.exportPreset === '720p' || snapshot.exportPreset === '540p') setExportPreset(snapshot.exportPreset)
    if (snapshot.exportFps === 30 || snapshot.exportFps === 60) setExportFps(snapshot.exportFps)
    if (snapshot.exportFormat === 'mp4' || snapshot.exportFormat === 'webm') setExportFormat(snapshot.exportFormat)
    if (isExportBitrate(snapshot.exportBitrate)) setExportBitrate(snapshot.exportBitrate)
    if (snapshot.exportQuality === 'standard' || snapshot.exportQuality === 'high') setExportQuality(snapshot.exportQuality)
    if (typeof snapshot.selectedClipId === 'string') { setSelectedClipId(snapshot.selectedClipId); setSelectedClipIds([snapshot.selectedClipId]) }
    setShowVersionHistory(false)
    setNotice('Version restored. Autosave updated.')
  }

  const beginCaptionDrag = (event: ReactPointerEvent<HTMLButtonElement>, caption: TextCaption) => {
    const preview = previewRef.current
    if (!preview) return
    const rect = (preview.querySelector('.preview-canvas') ?? preview).getBoundingClientRect()
    captionDragRef.current = { id: caption.id, offsetX: event.clientX - rect.left - rect.width * caption.x / 100, offsetY: event.clientY - rect.top - rect.height * caption.y / 100 }
    const move = (moveEvent: PointerEvent) => {
      const drag = captionDragRef.current
      if (!drag) return
      const nextX = Math.max(4, Math.min(96, ((moveEvent.clientX - rect.left - drag.offsetX) / rect.width) * 100))
      const nextY = Math.max(6, Math.min(94, ((moveEvent.clientY - rect.top - drag.offsetY) / rect.height) * 100))
      setTextCaptions((current) => current.map((item) => item.id === drag.id ? { ...item, x: nextX, y: nextY } : item))
    }
    const end = () => { captionDragRef.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end, { once: true })
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redoProjectEdit(); else undoProjectEdit(); return }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redoProjectEdit(); return }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && inspectorTab === 'Text') { event.preventDefault(); selectSubtitleGroup(); return }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteTimelineSelection() }
      if (event.key === ' ') { event.preventDefault(); togglePlayback() }
      if (event.key.toLowerCase() === 's') splitSelectedClip()
      if (event.key.toLowerCase() === 'd') duplicateSelectedClip()
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelectedClips() }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteClips() }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  })

  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.topbar-center .topbar-action'))
      const handleHistoryClick = (event: Event) => {
        const button = event.currentTarget as HTMLButtonElement
        if (buttons[0] === button) undoProjectEdit()
        if (buttons[1] === button) redoProjectEdit()
        if (buttons[2] === button) void openVersionHistory()
      }
    buttons.forEach((button) => button.addEventListener('click', handleHistoryClick))
    return () => buttons.forEach((button) => button.removeEventListener('click', handleHistoryClick))
  }, [clips, clipHistory, clipFuture, textCaptions, textHistory, textFuture, inspectorTab, selectedTextId, selectedTextIds])

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <div className="topbar-left"><button className="icon-button back-button" aria-label="Back to projects" onClick={() => void navigate({ to: '/' })}><ArrowLeft size={18} /></button><div className="brand-lockup"><div className="brand-mark">O</div><span>OpenCut</span></div><div className="topbar-divider" /><div className="project-name">Travel reel <ChevronDown size={14} /></div><span className="autosave"><Check size={13} /> Saved</span></div>
        <div className="topbar-center"><button className="topbar-action" onClick={() => setNotice('Nothing to undo yet.')}><Undo2 size={16} /></button><button className="topbar-action muted" onClick={() => setNotice('Nothing to redo yet.')}><Redo2 size={16} /></button><div className="topbar-divider short" /><button className="topbar-action" onClick={() => setNotice(`${versionCount} autosave version${versionCount === 1 ? '' : 's'} available in this browser.`)}><Clock3 size={16} /><span>Version history</span></button></div>
      <div className="topbar-right"><button className="help-link" onClick={() => setNotice('Tip: import a file, then select its clip to edit.')}><CircleHelp size={16} /> Help</button><button className="share-button" onClick={handleExport} title="Export the edited timeline"><Download size={15} /> Export</button><div className="avatar"><UserRound size={15} /></div></div>
      </header>
      <ProjectBar exportPreset={exportPreset} exportFps={exportFps} exportFormat={exportFormat} exportBitrate={exportBitrate} exportQuality={exportQuality} setExportPreset={setExportPreset} setExportFps={setExportFps} setExportFormat={setExportFormat} setExportBitrate={setExportBitrate} setExportQuality={setExportQuality} onSave={exportProject} onOpen={() => projectInputRef.current?.click()} />
      <input ref={projectInputRef} className="file-input" type="file" accept="application/json,.json" onChange={importProject} />
      <input ref={replaceMediaInputRef} className="file-input" type="file" accept="image/*,video/*" onChange={replaceSelectedMedia} />

      <div className="editor-workspace">
        <aside className="tool-rail"><div className="rail-tools">{tools.map(({ label, icon: Icon }) => <button key={label} className={`rail-tool ${activeTool === label ? 'active' : ''}`} onClick={() => setActiveTool(label)} aria-label={label === 'Intelligence' ? 'Intelligence Creator' : label}><Icon size={19} strokeWidth={activeTool === label ? 2.2 : 1.8} /><span>{label === 'Intelligence' ? 'AI Creator' : label}</span></button>)}</div><div className="rail-bottom"><button className="rail-tool" onClick={() => setNotice('Speed controls are available in Inspector → Timing & audio.')}><Gauge size={18} /><span>Speed</span></button><button className={`rail-tool ${showGrid ? 'active' : ''}`} onClick={() => setShowGrid((grid) => !grid)}><Grid2X2 size={18} /><span>Canvas</span></button></div></aside>
        <section className="asset-panel"><div className="panel-heading"><div><h2>{activeTool === 'Intelligence' ? 'Intelligence Creator' : activeTool}</h2><p>{activeTool === 'Intelligence' ? 'Audio → video tự động' : 'Build your story'}</p></div><button className="icon-button" onClick={() => setNotice(`${activeTool} panel options.`)}><MoreHorizontal size={18} /></button></div>
{activeTool === 'Intelligence' ? <IntelligenceCreatorPanel
  currentTitle={currentCreatorTitle} currentRatio={aspectRatio} currentStyleId={currentCreatorStyleId} canApplyStyle={clips.some(clip => clip.id.startsWith('intelligence-') && clip.id.endsWith('-audio'))}
  onApplyTitle={title => void applyIntelligenceStyle([...CREATOR_STYLES, ...SHORT_TEMPLATES].find(template => template.id === currentCreatorStyleId) ?? CREATOR_STYLES[0], title, true)}
  styleBusy={creatorStyleBusy} onApplyStyle={(template, title) => void applyIntelligenceStyle(template, title)} busy={creatorBusy} ready={projectReady && subtitleDraftReady}
  progress={creatorProgress} error={creatorError} result={creatorResult} sourceCount={chineseCaptions.length} derivedCount={derivedCount}
  subtitleBusy={subtitleBusy} subtitleApplying={subtitleApplying} subtitleProgress={subtitleProgress} subtitleError={subtitleError}
  onCreate={(file, template, language, title) => void createFromAudio(file, template, language, title)} onCancel={cancelIntelligenceCreator}
  onGenerateSubtitles={(mode, options) => void generateBilingualSubtitles(mode, options)} onCancelSubtitles={cancelBilingualSubtitles}
  onResumeSubtitles={autoApply => { if (subtitleDraft) void generateBilingualSubtitles('vietnamese', { ...subtitleDraft.options, autoApply }, true) }}
  onShowTranslation={() => void showDraftVietnameseSubtitles()}
  subtitleDraft={subtitleDraft} captions={textCaptions} onReviewChange={rows => { if (subtitleDraft) { const draft = { ...subtitleDraft, rows }; setSubtitleDraft(draft); void saveSubtitleDraft(draft).then(saved => { if (!saved) setSubtitleError('Chưa lưu được chỉnh sửa bản nháp. Đừng reload trước khi áp dụng.') }) } }}
  onApplyTranslation={() => void applyReviewedTranslation()} onDiscardTranslation={() => { setSubtitleDraft(null); setSubtitleError(null); void saveSubtitleDraft(null) }}
  onListenCaption={caption => { setSelectedTextId(caption.id); setSelectedTextIds([caption.id]); setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text'); seekTo(caption.start); setIsPlaying(false) }}
/> : activeTool === 'Media' ? <MediaPanel assets={assets} clips={clips} selectedClipId={selectedClipId} onSelect={selectClip} onImport={() => fileInputRef.current?.click()} onNotify={setNotice} /> : activeTool === 'Templates' ? <TemplatePanel onApply={applyTemplate} onUndo={undoTemplate} canUndo={canUndoTemplate} /> : activeTool === 'Captions' ? <AutoCaptionPanel sources={clips.flatMap(clip => { const asset = assets.find(a => a.id === clip.assetId); return asset?.url && asset.type !== 'IMAGE' ? [{ id: clip.id, name: asset.name, start: getClipStart(clip, clips), duration: getClipDuration(clip) }] : [] })} selectedClipId={selectedClipId} captions={textCaptions} busy={captionBusy} progress={captionProgress} error={captionError} onGenerate={(...args) => void generateCaptions(...args)} onCancel={cancelCaptions} onSelect={caption => { setSelectedTextId(caption.id); setSelectedTextIds([caption.id]); setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text'); setCurrentTime(caption.start); setIsPlaying(false) }} onExport={exportSubtitles} onImport={() => fileInputRef.current?.click()} /> : <ToolPanel tool={activeTool} selectedClip={selectedAsset?.type === 'AUDIO' ? null : selectedClip} currentTime={currentTime} clipStart={selectedClip ? getClipStart(selectedClip, clips) : 0} onPatchClip={patchVisualAtPlayhead} onAddText={addStyledText} onAddSticker={id => void addSticker(id)} onNotify={setNotice} />}
          <input ref={fileInputRef} className="file-input" type="file" accept="video/*,audio/*,image/*" multiple onChange={handleImport} />
        </section>

        <section className="stage-column"><div className={`stage ${showGrid ? 'show-grid' : ''}`}><div className="stage-topline"><span>Preview</span><label className="preview-ratio-control">Khung hình <select aria-label="Project aspect ratio" value={aspectRatio} onChange={event => { if (isAspectRatio(event.target.value)) setAspectRatio(event.target.value) }}><option value="16:9">16:9</option><option value="9:16">9:16</option><option value="1:1">1:1</option></select></label><span className="stage-quality">{exportPreset === '2k' ? '2K' : exportPreset} <ChevronDown size={13} /></span></div><div ref={previewRef} className="preview-frame"><div className="preview-canvas" style={{ '--preview-scale': previewScale, aspectRatio: aspectRatio.replace(':', ' / ') } as CSSProperties}>
          {previewTransitionPairs.map(({ clip, previous, progress }) => { const asset = assets.find((item) => item.id === previous.assetId); if (!asset) return null; const transitionDuration = clip.transition?.duration ?? 0; const previewTime = Math.max(previous.trimStart, Math.min(previous.trimEnd, previous.trimEnd - transitionDuration + transitionDuration * progress)); const frame = visualClipAt(previous, currentTime, clips); return <PreviewVisualLayer key={`transition-${previous.id}`} asset={asset} clip={previous} transition previewTime={previewTime} style={{ ...getVisualStyle(frame), opacity: (frame.opacity ?? 1) * transitionVisual(clip.transition?.type ?? 'none', progress).outgoingOpacity }} /> })}
          {activeVisualClips.map((clip) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; const transition = clip.transition; const start = getClipStart(clip, clips); const progress = transition && transition.type !== 'none' && currentTime >= start && currentTime < start + transition.duration ? getTransitionProgress(clip, currentTime, clips) : 1; const visual = transitionVisual(transition?.type ?? 'none', progress, transition?.easing, transition?.direction); const frame = visualClipAt(clip, currentTime, clips); const base = getVisualStyle(frame); return <PreviewVisualLayer key={clip.id} asset={asset} clip={clip} style={{ ...base, transform: visual.incomingOffset || visual.incomingOffsetY ? `translate(${visual.incomingOffset * 100}%, ${visual.incomingOffsetY * 100}%) ${base.transform}` : base.transform, opacity: (frame.opacity ?? 1) * visual.incomingOpacity }} videoRef={clip.id === selectedClipId ? videoRef : undefined} /> })}
          {selectedAsset?.type === 'AUDIO' && <>{selectedAsset.url && <audio ref={audioRef} className="hidden-audio" src={selectedAsset.url} />} {!activeVisualClips.length && <div className="audio-preview"><div className="audio-preview-icon"><Music2 size={27} /></div><span>{selectedAsset.url ? 'Now playing' : 'Audio track'}</span><strong>{selectedAsset.name}</strong><div className="large-waveform">{(selectedAsset.waveform ?? makeFallbackWaveform(selectedAsset.name, 42)).map((value, i) => <i key={i} style={{ height: `${Math.max(12, value * 100)}%` }} />)}</div></div>}</>}
          {!activeVisualClips.length && selectedAsset?.type !== 'AUDIO' && <PreviewVisualLayer asset={selectedAsset ?? demoMedia[0]} clip={selectedClip ?? initialClips[0]} style={getVisualStyle(selectedClip)} />}
          <PreviewCaptionLayer captions={textCaptions} currentTime={currentTime} isPlaying={isPlaying} totalDuration={totalDuration}
            clock={playbackTimeRef} timestamp={playbackTimestampRef} previewScale={previewScale} aspectRatio={aspectRatio} hiddenTracks={hiddenTextTracks}
            selectedId={selectedTextId} onDrag={beginCaptionDrag}
            onSelect={(caption, focusTime) => { setSelectedTextId(caption.id); setSelectedTextIds([caption.id]); setSelectedClipId(null); setSelectedClipIds([]); setInspectorTab('Text'); if (focusTime !== undefined) { setIsPlaying(false); seekTo(focusTime) } }} />
          <div className="preview-overlay"><button className="overlay-icon" onClick={toggleFullscreen} aria-label="Fullscreen preview"><Maximize2 size={16} /></button></div>
        </div></div><div className="transport"><span className="timecode">{formatTime(currentTime)} <b>/ {formatTime(totalDuration)}</b></span><div className="transport-controls"><button className="transport-icon" onClick={splitSelectedClip} aria-label="Split clip"><Scissors size={16} /></button><button className="play-button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="transport-icon" onClick={toggleMute} aria-label={volume === 0 ? 'Unmute' : 'Mute'}><Volume2 size={16} /></button></div><div className="transport-right"><button className="transport-icon" onClick={() => setShowGrid((grid) => !grid)} aria-label="Toggle canvas grid"><Grid2X2 size={16} /></button><button className="transport-icon" onClick={() => setNotice('Preview settings are ready for project preferences.')} aria-label="Preview settings"><Settings2 size={16} /></button></div></div></div><SelectedStrip selectedAsset={selectedAsset} onReplace={() => replaceMediaInputRef.current?.click()} onNotify={setNotice} /><InspectorPanel selectedAsset={selectedAsset} onDelete={deleteSelectedClip} /></section>

        <EditorInspector selectedAsset={selectedAsset} selectedClip={selectedClip} timelineLayers={timelineLayers} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} volume={volume} speed={speed} currentTime={currentTime} updateTrim={updateTrim} updateVolume={updateVolume} updateSpeed={updateSpeed} updateClipSetting={updateClipSetting} textCaptions={textCaptions} selectedTextId={selectedTextId} selectedTextIds={selectedTextIds} onSelectSubtitles={selectSubtitleGroup} updateText={updateText} onDelete={deleteSelectedClip} onDeleteText={deleteSelectedText} />
      </div>
      <TimelineDropLayer clips={clips} layers={timelineLayers} onDropAsset={addAssetToTimeline} onAddLayer={addTimelineLayer}><LayeredTimeline assets={assets} clips={clips} layers={timelineLayers} textCaptions={textCaptions} selectedClipIds={selectedClipIds} selectedTextIds={selectedTextIds} selectedTextId={selectedTextId} setSelectedClip={selectClips} setSelectedClipGroup={selectClipGroup} setSelectedText={selectTextOnTimeline} currentTime={currentTime} totalDuration={totalDuration} zoom={zoom} setZoom={setZoom} rippleEdit={rippleEdit} setRippleEdit={setRippleEdit} snapEnabled={snapEnabled} setSnapEnabled={setSnapEnabled} hiddenLayers={hiddenLayers} mutedLayers={mutedLayers} onSplit={splitSelectedClip} onToggleLayer={toggleLayer} onDelete={deleteTimelineSelection} /></TimelineDropLayer>
      <AudioMixer assets={assets} clips={clips} selectedClipId={selectedClipId} audioTrackRefs={audioTrackRefs} />
      {isExporting && <div className="export-progress" role="status"><div className="export-progress-head"><span>Rendering timeline</span><b>{exportProgress}%</b></div><div className="export-progress-track"><span style={{ width: `${exportProgress}%` }} /></div><button onClick={cancelExport}>Cancel export</button></div>}
      {showVersionHistory && <VersionHistoryPanel snapshots={versionSnapshots} loading={versionLoading} onClose={() => setShowVersionHistory(false)} onRestore={restoreVersion} />}
      {notice && <div className="editor-toast" role="status">{notice}</div>}
    </main>
  )
}

function EditorInspector({ selectedAsset, selectedClip, timelineLayers, inspectorTab, setInspectorTab, volume, speed, currentTime, updateTrim, updateVolume, updateSpeed, updateClipSetting, textCaptions, selectedTextId, selectedTextIds, updateText, onDelete, onDeleteText, onSelectSubtitles }: { selectedAsset: MediaAsset | null; selectedClip: TimelineClip | null; timelineLayers: TimelineLayer[]; inspectorTab: 'Video' | 'Audio' | 'Text' | 'Animation'; setInspectorTab: (tab: 'Video' | 'Audio' | 'Text' | 'Animation') => void; volume: number; speed: number; currentTime: number; updateTrim: (key: 'trimStart' | 'trimEnd', value: number) => void; updateVolume: (value: number) => void; updateSpeed: (value: number) => void; updateClipSetting: (key: keyof TimelineClip, value: number | boolean | TimelineClip['volumeKeyframes']) => void; textCaptions: TextCaption[]; selectedTextId: string | null; selectedTextIds: string[]; onSelectSubtitles(track?: number): void; updateText: (key: keyof TextCaption, value: string | number | boolean) => void; onDelete: () => void; onDeleteText: () => void }) {
  const numberControl = (label: string, key: keyof TimelineClip, value: number, step = 1) => <label className="value-control"><span>{label}</span><input type="number" step={step} value={value} onChange={(event) => updateClipSetting(key, Number(event.target.value))} /></label>
return <aside className="inspector-panel"><div className="inspector-heading"><h2>Inspector</h2><button className="icon-button" onClick={() => setInspectorTab('Video')}><Settings2 size={16} /></button></div><div className="inspector-tabs">{(['Video', 'Audio', 'Text', 'Animation'] as const).map((tab) => <button key={tab} className={inspectorTab === tab ? 'active' : ''} onClick={() => setInspectorTab(tab)}>{tab}</button>)}</div>{inspectorTab === 'Text' ? <CaptionInspector captions={textCaptions} selected={selectedCaptions(textCaptions, selectedTextIds, selectedTextId)} focusedId={selectedTextId} onChange={updateText} onDelete={onDeleteText} onSelectAll={() => onSelectSubtitles()} onSelectTrack={onSelectSubtitles} /> : inspectorTab === 'Animation' ? <div className="inspector-empty"><Sparkles size={22} /><b>Add motion to this clip.</b><span>Choose an entrance or exit animation.</span><button>Browse presets</button></div> : <><InspectorSection title="Transform" defaultOpen={inspectorTab === 'Video'}><div className="control-grid"><label className="field-label"><span>Video track</span><select value={selectedClip?.track ?? 0} onChange={(event) => updateClipSetting('track', Number(event.target.value))}>{timelineLayers.filter(layer => layer.type === 'VIDEO').sort((a, b) => a.index - b.index).map(layer => <option key={layer.id} value={layer.index}>{layer.name}</option>)}</select></label>{numberControl('Position X', 'positionX', selectedClip?.positionX ?? 0)}{numberControl('Position Y', 'positionY', selectedClip?.positionY ?? 0)}{numberControl('Scale', 'scale', selectedClip?.scale ?? 1, 0.05)}{numberControl('Rotation', 'rotation', selectedClip?.rotation ?? 0)}</div><div className="slider-label"><span>Opacity</span><span>{Math.round((selectedClip?.opacity ?? 1) * 100)}%</span></div><input className="range-input" aria-label="Opacity" type="range" min="0" max="1" step="0.01" value={selectedClip?.opacity ?? 1} onChange={(event) => updateClipSetting('opacity', Number(event.target.value))} /></InspectorSection><InspectorSection title="Filter" defaultOpen={false}><FilterSlider label="Brightness" value={selectedClip?.brightness ?? 100} onChange={(value) => updateClipSetting('brightness', value)} /><FilterSlider label="Contrast" value={selectedClip?.contrast ?? 100} onChange={(value) => updateClipSetting('contrast', value)} /><FilterSlider label="Saturation" value={selectedClip?.saturation ?? 100} onChange={(value) => updateClipSetting('saturation', value)} /></InspectorSection><InspectorSection title="Timing & audio" defaultOpen><div className="inspector-range"><div><span>In point</span><b>{formatTime(selectedClip?.trimStart ?? 0)}</b></div><input aria-label="In point" type="range" min="0" max={Math.max(0.1, (selectedAsset?.duration ?? 1) - 0.1)} step="0.1" value={selectedClip?.trimStart ?? 0} onChange={(event) => updateTrim('trimStart', Number(event.target.value))} /></div><div className="inspector-range"><div><span>Out point</span><b>{formatTime(selectedClip?.trimEnd ?? selectedAsset?.duration ?? 0)}</b></div><input aria-label="Out point" type="range" min="0.1" max={selectedAsset?.duration ?? 1} step="0.1" value={selectedClip?.trimEnd ?? selectedAsset?.duration ?? 0} onChange={(event) => updateTrim('trimEnd', Number(event.target.value))} /></div><div className="slider-label"><span>Volume</span><span>{Math.round(volume * 100)}%</span></div><input className="range-input" aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => updateVolume(Number(event.target.value))} /><button className="secondary-action" onClick={() => updateClipSetting('volumeKeyframes', [...(selectedClip?.volumeKeyframes ?? []), { time: Math.max(0, currentTime), value: volume } ])}>Add volume keyframe</button><div className="slider-label"><span>Speed</span><span>{speed}x</span></div><div className="speed-options">{[0.5, 1, 1.5, 2].map((value) => <button key={value} className={speed === value ? 'active' : ''} onClick={() => updateSpeed(value)}>{value}x</button>)}</div><div className="slider-label"><span>Fade in / out</span><span>{selectedClip?.fadeIn ?? 0}s · {selectedClip?.fadeOut ?? 0}s</span></div><div className="fade-options">{[0, 0.5, 1, 2].map((value) => <button key={value} className={(selectedClip?.fadeIn ?? 0) === value ? 'active' : ''} onClick={() => updateClipSetting('fadeIn', value)}>In {value}s</button>)}{[0, 0.5, 1, 2].map((value) => <button key={`out-${value}`} className={(selectedClip?.fadeOut ?? 0) === value ? 'active' : ''} onClick={() => updateClipSetting('fadeOut', value)}>Out {value}s</button>)}</div><label className="mute-toggle"><input type="checkbox" checked={selectedClip?.muted ?? false} onChange={(event) => updateClipSetting('muted', event.target.checked)} /> Mute this track</label><label className="mute-toggle"><input type="checkbox" checked={selectedClip?.ducking ?? true} onChange={(event) => updateClipSetting('ducking', event.target.checked)} /> Duck music under voice</label></InspectorSection><InspectorSection title="Blend" defaultOpen={false} /><InspectorSection title="Border" defaultOpen={false} /><InspectorSection title="Shadow" defaultOpen={false} /><div className="clip-actions"><span>{selectedAsset ? 'Clip selected' : 'No clip selected'}</span><button onClick={onDelete} disabled={!selectedAsset}><Trash2 size={14} /> Delete clip</button></div></>}</aside>
}

function VersionHistoryPanel({ snapshots, loading, onClose, onRestore }: { snapshots: Record<string, unknown>[]; loading: boolean; onClose: () => void; onRestore: (snapshot: Record<string, unknown>) => void }) {
  return <div className="version-history-backdrop" role="presentation" onClick={onClose}><aside className="version-history-panel" role="dialog" aria-label="Version history" onClick={(event) => event.stopPropagation()}><div className="version-history-head"><div><span className="eyebrow">Project recovery</span><h2>Version history</h2></div><button className="icon-button" onClick={onClose} aria-label="Close version history">×</button></div>{loading ? <div className="version-history-empty"><Clock3 size={22} /><span>Loading autosaves…</span></div> : snapshots.length ? <div className="version-history-list">{snapshots.slice(0, 20).map((snapshot, index) => { const savedAt = String(snapshot.savedAt ?? ''); const date = savedAt ? new Date(savedAt) : null; return <button key={String(snapshot.id ?? index)} className="version-history-item" onClick={() => onRestore(snapshot)}><span className="version-history-icon"><Clock3 size={14} /></span><span className="version-history-copy"><b>{index === 0 ? 'Latest autosave' : `Autosave ${snapshots.length - index}`}</b><small>{date && !Number.isNaN(date.getTime()) ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Saved in this browser'}</small></span><ChevronRight size={15} /></button> })}</div> : <div className="version-history-empty"><Clock3 size={22} /><b>No autosaves yet</b><span>Make an edit and the project will appear here automatically.</span></div>}<div className="version-history-foot">Restoring replaces the current timeline and captions.</div></aside></div>
}

function ProjectBar({ exportPreset, exportFps, exportFormat, exportBitrate, exportQuality, setExportPreset, setExportFps, setExportFormat, setExportBitrate, setExportQuality, onSave, onOpen }: { exportPreset: ExportPreset; exportFps: 30 | 60; exportFormat: 'mp4' | 'webm'; exportBitrate: ExportBitrate; exportQuality: 'standard' | 'high'; setExportPreset: (value: ExportPreset) => void; setExportFps: (value: 30 | 60) => void; setExportFormat: (value: 'mp4' | 'webm') => void; setExportBitrate: (value: ExportBitrate) => void; setExportQuality: (value: 'standard' | 'high') => void; onSave: () => void; onOpen: () => void }) {
  return <div className="project-bar"><span className="project-bar-label">Project</span><button onClick={onSave}>Save JSON</button><button onClick={onOpen}>Open JSON</button><span className="project-bar-divider" /><label>Size<select value={exportPreset} onChange={(event) => { const preset = event.target.value as ExportPreset; setExportPreset(preset); if (preset === '2k' && Number(exportBitrate) < 24) setExportBitrate(recommendedExportBitrate(preset, exportFps)) }}><option value="2k">2K · 1440p</option><option value="1080p">1080p</option><option value="720p">720p</option><option value="540p">540p</option></select></label><label>FPS<select value={exportFps} onChange={(event) => { const fps = Number(event.target.value) as 30 | 60; setExportFps(fps); if (exportPreset === '2k' && exportBitrate === '24' && fps === 60) setExportBitrate(recommendedExportBitrate(exportPreset, fps)) }}><option value="30">30</option><option value="60">60</option></select></label><label>Quality<select value={exportQuality} onChange={(event) => setExportQuality(event.target.value as 'standard' | 'high')}><option value="standard">Standard</option><option value="high">High</option></select></label><label>Bitrate<select value={exportBitrate} onChange={(event) => setExportBitrate(event.target.value as ExportBitrate)}><option value="4">4 Mbps</option><option value="8">8 Mbps</option><option value="12">12 Mbps</option><option value="16">16 Mbps</option><option value="24">24 Mbps · 2K</option><option value="32">32 Mbps · 2K/60</option></select></label><label>Format<select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as 'mp4' | 'webm')}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label></div>
}

function FilterSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <div className="inspector-range"><div><span>{label}</span><b>{Math.round(value)}%</b></div><input className="range-input" type="range" min="0" max="200" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} /></div> }

function MediaPanel({ assets, clips, selectedClipId, onSelect, onImport, onNotify }: { assets: MediaAsset[]; clips: TimelineClip[]; selectedClipId: string | null; onSelect: (clipId: string) => void; onImport: () => void; onNotify: (message: string) => void }) {
  const [mediaTab, setMediaTab] = useState<'Library' | 'Stock' | 'Cloud'>('Library')
  const [query, setQuery] = useState('')
  const visibleAssets = assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.media-grid')
    if (!grid) return
    const handleDoubleClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const card = target.closest<HTMLButtonElement>('.media-card')
      if (!card) return
      const index = Array.from(grid.querySelectorAll('.media-card')).indexOf(card)
      const asset = assets[index]
      if (asset) window.dispatchEvent(new CustomEvent('opencut:add-asset', { detail: asset.id }))
    }
    grid.addEventListener('dblclick', handleDoubleClick)
    return () => grid.removeEventListener('dblclick', handleDoubleClick)
  }, [assets])
  return <div className="media-panel-content"><div className="media-tabs">{(['Library', 'Stock', 'Cloud'] as const).map((tab) => <button key={tab} className={mediaTab === tab ? 'active' : ''} onClick={() => { setMediaTab(tab); if (tab !== 'Library') onNotify(`${tab} media is coming soon.`) }}>{tab}</button>)}</div>{mediaTab !== 'Library' && <div className="source-note"><Sparkles size={15} /><span>Use the Library tab to edit imported files.</span></div>}<label className="search-box"><Search size={15} /><input aria-label="Search media" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media" /><kbd>⌘ K</kbd></label><button className="upload-card" onClick={onImport}><div className="upload-icon"><Upload size={17} /></div><div><b>Import media</b><span>Drag & drop or browse files</span></div><span className="small-plus"><Plus size={15} /></span></button><div className="asset-section-title"><span>Project media</span><span>{visibleAssets.length} of {assets.length} items</span></div>{visibleAssets.length ? <div className="media-grid">{visibleAssets.map((asset) => { const clip = assetToClip(asset, selectedClipId, clips); return <button key={asset.id} draggable onDragStart={(event) => { event.currentTarget.classList.add('dragging'); event.dataTransfer.setData('application/x-opencut-asset', asset.id); event.dataTransfer.setData('application/x-opencut-type', asset.type); event.dataTransfer.effectAllowed = 'copy' }} onDragEnd={(event) => event.currentTarget.classList.remove('dragging')} className={`media-card ${clip?.id === selectedClipId ? 'selected' : ''}`} onClick={() => clip && onSelect(clip.id)}><div className={`thumb ${asset.tone}`}><AssetThumbnail asset={asset} />{asset.type !== 'IMAGE' && <span className="duration">{formatTime(asset.duration)}</span>}{clip?.id === selectedClipId && <span className="selected-check"><Check size={11} /></span>}</div><span className="media-name">{asset.name}</span><span className="media-type">{asset.type}{asset.source === 'local' ? ' · LOCAL' : ''}</span></button> })}</div> : <div className="media-empty-search">No media matches “{query}”.</div>}<div className="folders-title"><FolderOpen size={14} /> My folders <Plus size={14} /></div><div className="folder-row"><FolderOpen size={15} /><span>Travel reel</span><span className="folder-count">{assets.length}</span></div><div className="folder-row muted-row"><FolderOpen size={14} /><span>Brand assets</span><span className="folder-count">12</span></div></div>
}

function assetToClip(asset: MediaAsset, selectedClipId: string | null, clips: TimelineClip[] = []) {
  const defaultIds: Record<string, string> = { 'city-sunset': 'clip-city', 'ocean-waves': 'clip-ocean', 'portrait-cover': 'clip-portrait', 'lofi-beat': 'clip-lofi' }
  const id = clips.find((clip) => clip.assetId === asset.id)?.id ?? defaultIds[asset.id] ?? `clip-${asset.id}`
  return { id, assetId: asset.id, trimStart: 0, trimEnd: asset.duration, selected: id === selectedClipId }
}

function AssetThumbnail({ asset }: { asset: MediaAsset }) {
  if (asset.url && asset.type === 'IMAGE') return <img className="thumb-media" src={asset.url} alt="" />
  if (asset.url && asset.type === 'VIDEO') return <video className="thumb-media" src={asset.url} muted preload="metadata" />
  return <ThumbArt tone={asset.tone} />
}

function LegacyToolPanel({ tool, onNotify }: { tool: PanelKey; onNotify: (message: string) => void }) {
  const labels: Record<Exclude<PanelKey, 'Media'>, string> = { Intelligence: 'Audio to video', Templates: 'Short video templates', Captions: 'Auto captions', Audio: 'Music & sound effects', Text: 'Titles and captions', Stickers: 'Make it pop', Effects: 'Add some magic', Transitions: 'Smooth scene changes', Filters: 'Find your look', Adjust: 'Tune every detail' }
  const label = tool === 'Media' ? 'Project assets' : labels[tool]
  return <div className="empty-tool-panel"><div className="empty-tool-icon">{tool === 'Text' ? <Text size={28} /> : tool === 'Audio' ? <Headphones size={28} /> : <Sparkles size={28} />}</div><h3>{label}</h3><p>{tool === 'Text' ? 'Add a caption to the active timeline and style it in Inspector.' : tool === 'Transitions' ? 'Apply a transition to the selected video clip.' : 'Choose an asset from the library to start editing your video.'}</p><button className="primary-outline" onClick={() => tool === 'Text' ? window.dispatchEvent(new CustomEvent('opencut:add-text', { detail: 'Your caption' })) : tool === 'Transitions' ? window.dispatchEvent(new CustomEvent('opencut:cycle-transition')) : onNotify(`${tool} presets will be available in the next editing pass.`)}><Plus size={15} /> {tool === 'Text' ? 'Add text' : tool === 'Transitions' ? 'Cycle transition' : `Explore ${tool.toLowerCase()}`}</button>{tool === 'Text' && <button className="secondary-action" onClick={() => window.dispatchEvent(new CustomEvent('opencut:auto-subtitle'))}><Captions size={14} /> Generate auto subtitles</button>}</div>
}
void LegacyToolPanel

function ToolPanel({ tool, selectedClip, currentTime, clipStart, onPatchClip, onAddText, onAddSticker, onNotify }: {
  tool: PanelKey; selectedClip: TimelineClip | null; currentTime: number; clipStart: number; onPatchClip(patch: Partial<TimelineClip>, animate?: boolean): void
  onAddText(style: 'headline' | 'editorial' | 'lower-third' | 'quote'): void; onAddSticker(id: StickerId): void; onNotify(message: string): void
}) {
  const [animate, setAnimate] = useState(false)
  const label = tool === 'Audio' ? 'Music & sound effects' : tool === 'Text' ? 'Titles and captions' : tool === 'Stickers' ? 'Stickers & overlays' : tool === 'Effects' ? 'Effects library' : tool === 'Transitions' ? 'Scene transitions' : tool === 'Filters' ? 'Color presets' : 'Fine adjustments'
  const displayClip = selectedClip?.visualKeyframes?.length ? { ...selectedClip, ...resolveVisualValues(selectedClip, currentTime - clipStart) } : selectedClip
  const transition = selectedClip?.transition ?? { type: 'none' as const, duration: .6 }
  const adjustment = (name: string, key: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'sepia' | 'opacity' | 'positionX' | 'positionY' | 'scale' | 'rotation', min: number, max: number, step = 1) => {
    const value = displayClip?.[key] ?? (key === 'opacity' || key === 'scale' ? 1 : key === 'hue' || key === 'sepia' || key === 'positionX' || key === 'positionY' || key === 'rotation' ? 0 : 100)
    const display = key === 'opacity' ? `${Math.round(value * 100)}%` : key === 'hue' || key === 'rotation' ? `${value}°` : key === 'scale' ? `${value.toFixed(2)}×` : key === 'positionX' || key === 'positionY' ? `${value}px` : `${value}%`
    return <label key={key} className="tool-range"><span>{name}<b>{display}</b></span><input aria-label={name} type="range" min={min} max={max} step={step} value={value} disabled={!selectedClip} onChange={event => onPatchClip({ [key]: Number(event.target.value) }, animate)} /></label>
  }
  return <div className="tool-panel-pro"><div className="tool-panel-hero"><div className={`tool-panel-icon ${tool.toLowerCase()}`}><Sparkles size={22} /></div><div><h3>{label}</h3><p>{tool === 'Text' ? 'Thêm chữ, kéo trực tiếp trên preview và chỉnh trong Inspector.' : tool === 'Stickers' ? 'Sticker trong suốt nằm trên video track riêng.' : 'Chỉnh clip đang chọn; preview và export dùng cùng thông số.'}</p></div></div>
    {selectedClip && ['Adjust', 'Filters', 'Effects', 'Stickers'].includes(tool) && <div className="tool-keyframes"><button className="tool-secondary" aria-pressed={animate} onClick={() => setAnimate(value => !value)}>◆ {animate ? 'Keyframe đang bật' : 'Bật keyframe'}</button><button className="tool-secondary" onClick={() => onPatchClip({}, true)}>+ Keyframe · {Math.max(0, currentTime - clipStart).toFixed(2)}s</button><span>{selectedClip.visualKeyframes?.length ?? 0} keyframe · {animate ? 'Kéo thanh trượt sẽ lưu tại playhead' : 'Kéo thanh trượt sẽ chỉnh toàn clip'}</span>{selectedClip.visualKeyframes?.some(frame => Math.abs(frame.time - (currentTime - clipStart)) < .025) && <button className="tool-secondary" onClick={() => onPatchClip({ visualKeyframes: selectedClip.visualKeyframes?.filter(frame => Math.abs(frame.time - (currentTime - clipStart)) >= .025) })}>Xoá keyframe tại playhead</button>}</div>}
    {tool === 'Audio' && <div className="tool-action-grid"><button onClick={() => window.dispatchEvent(new CustomEvent('opencut:add-asset', { detail: 'lofi-beat' }))}><Music2 size={15} /><span>Use Lo-fi beat</span><small>18s</small></button><button onClick={() => onNotify('Import audio từ tab Media rồi kéo vào timeline.')}><Upload size={15} /><span>Import audio</span><small>Local</small></button></div>}
    {tool === 'Text' && <><p className="tool-section-label">Thiết kế chữ</p><div className="tool-action-grid">{([['headline', 'Bold headline'], ['editorial', 'Editorial serif'], ['lower-third', 'Lower third'], ['quote', 'Quote card']] as const).map(([id, name]) => <button key={id} onClick={() => onAddText(id)}><Text size={15} /><span>{name}</span><small>4s · sửa được</small></button>)}</div><button className="tool-secondary" onClick={() => window.dispatchEvent(new CustomEvent('opencut:auto-subtitle'))}><Captions size={14} /> Auto captions từ audio</button></>}
    {tool === 'Stickers' && <><p className="tool-section-label">Thêm tại vị trí playhead</p><div className="sticker-preset-grid">{STICKER_PRESETS.map(preset => <button key={preset.id} onClick={() => onAddSticker(preset.id)} title={`Thêm sticker ${preset.name}`}><img src={`data:image/svg+xml,${encodeURIComponent(stickerSvg(preset.id))}`} alt="" /><span>{preset.name}</span></button>)}</div><p className="tool-panel-help">Mỗi sticker là image clip 4 giây: kéo trên timeline, đổi vị trí/scale trong preview, thay opacity trong Inspector.</p></>}
    {tool === 'Transitions' && <><p className="tool-section-label">Clip đang chọn {selectedClip ? `· ${selectedClip.id.slice(0, 22)}` : '· chưa chọn'}</p><div className="tool-action-grid">{(['none', 'fade', 'dissolve', 'slide'] as const).map(type => <button key={type} disabled={!selectedClip} aria-pressed={transition.type === type} onClick={() => onPatchClip({ transition: { ...transition, type, duration: type === 'none' ? 0 : Math.max(.1, transition.duration || .6) } })}><WandSparkles size={15} /><span>{type === 'none' ? 'None' : type === 'fade' ? 'Fade' : type === 'dissolve' ? 'Dissolve' : 'Slide'}</span><small>{type === 'none' ? 'Tắt' : 'Preview + export'}</small></button>)}</div>{transition.type !== 'none' && <><label className="tool-range"><span>Duration <b>{transition.duration.toFixed(1)}s</b></span><input aria-label="Transition duration" type="range" min="0.1" max={Math.min(3, selectedClip ? getClipDuration(selectedClip) : 3)} step="0.1" value={transition.duration} disabled={!selectedClip} onChange={event => onPatchClip({ transition: { ...transition, duration: Number(event.target.value) } })} /></label><label className="tool-select">Easing<select aria-label="Transition easing" value={transition.easing ?? 'linear'} onChange={event => onPatchClip({ transition: { ...transition, easing: event.target.value as TransitionEasing } })}><option value="linear">Linear</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option><option value="ease-in-out">Ease in/out</option></select></label>{transition.type === 'slide' && <label className="tool-select">Hướng di chuyển<select aria-label="Slide direction" value={transition.direction ?? 'right'} onChange={event => onPatchClip({ transition: { ...transition, direction: event.target.value as TransitionDirection } })}><option value="right">Từ phải</option><option value="left">Từ trái</option><option value="up">Từ trên</option><option value="down">Từ dưới</option></select></label>}</>}</>}
    {tool === 'Filters' && <><p className="tool-section-label">Bộ lọc màu · giữ nguyên effect</p><div className="preset-grid">{FILTER_PRESETS.map(preset => <button key={preset.name} disabled={!selectedClip} onClick={() => onPatchClip(preset.look, animate)}><span className="preset-swatch" style={{ filter: visualFilter(preset.look) }} /><b>{preset.name}</b></button>)}</div></>}
    {tool === 'Effects' && <><p className="tool-section-label">Hiệu ứng · độc lập với bộ lọc</p><div className="tool-action-grid">{EFFECT_PRESETS.map(preset => <button key={preset.id} disabled={!selectedClip} aria-pressed={(selectedClip?.effect ?? 'none') === preset.id} onClick={() => onPatchClip({ effect: preset.id })}><Sparkles size={15} /><span>{preset.name}</span><small>{preset.description}</small></button>)}</div>{selectedClip?.effect && selectedClip.effect !== 'none' && <label className="tool-range"><span>Intensity <b>{Math.round(displayClip?.effectStrength ?? 65)}%</b></span><input aria-label="Effect intensity" type="range" min="0" max="100" value={displayClip?.effectStrength ?? 65} onChange={event => onPatchClip({ effectStrength: Number(event.target.value) }, animate)} /></label>}</>}
    {tool === 'Adjust' && <><p className="tool-section-label">Color</p>{adjustment('Brightness', 'brightness', 0, 200)}{adjustment('Contrast', 'contrast', 0, 200)}{adjustment('Saturation', 'saturation', 0, 200)}{adjustment('Hue', 'hue', -180, 180)}{adjustment('Sepia', 'sepia', 0, 100)}{adjustment('Opacity', 'opacity', 0, 1, .01)}<p className="tool-section-label">Transform</p>{adjustment('Position X', 'positionX', -960, 960, 1)}{adjustment('Position Y', 'positionY', -540, 540, 1)}{adjustment('Scale', 'scale', .1, 4, .01)}{adjustment('Rotation', 'rotation', -180, 180, 1)}<label className="tool-select">Media fit<select aria-label="Media fit" value={selectedClip?.fit ?? 'contain'} disabled={!selectedClip} onChange={event => onPatchClip({ fit: event.target.value as 'contain' | 'cover' })}><option value="contain">Contain · đủ khung</option><option value="cover">Cover · lấp đầy</option></select></label><button className="tool-secondary" disabled={!selectedClip} onClick={() => onPatchClip({ brightness: 100, contrast: 100, saturation: 100, hue: 0, sepia: 0, opacity: 1, positionX: 0, positionY: 0, scale: 1, rotation: 0, fit: 'contain', effect: 'none', effectStrength: 65 })}><SlidersHorizontal size={14} /> Reset tất cả</button></>}
    {tool !== 'Audio' && tool !== 'Text' && tool !== 'Stickers' && !selectedClip && <p className="tool-panel-help">Chọn một video hoặc ảnh trên timeline để dùng công cụ này.</p>}
    <div className="tool-panel-tip"><Check size={14} /><span>Thay đổi được autosave, Undo và có trong video export.</span></div>
  </div>
}

function ThumbArt({ tone }: { tone: string }) {
  if (tone === 'audio') return <div className="audio-wave"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
  return <><div className="thumb-sun" /><div className="thumb-hill hill-one" /><div className="thumb-hill hill-two" /><div className={`thumb-subject ${tone}`} /></>
}

function SelectedStrip({ selectedAsset, onReplace, onNotify }: { selectedAsset: MediaAsset | null; onReplace: () => void; onNotify: (message: string) => void }) {
  if (!selectedAsset) return <div className="selected-strip empty-selected"><span>Select a clip to edit</span></div>
  return <div className="selected-strip"><div className="selected-thumbnail"><AssetThumbnail asset={selectedAsset} /></div><div className="selected-strip-name"><b>{selectedAsset.name}</b><span>{selectedAsset.type} clip · {formatTime(selectedAsset.duration)}</span></div>{selectedAsset.type !== 'AUDIO' && <button className="strip-action" onClick={onReplace}>Thay media</button>}<button className="strip-action" onClick={() => { const name = window.prompt('Rename media', selectedAsset.name); if (name?.trim()) window.dispatchEvent(new CustomEvent('opencut:rename-asset', { detail: { assetId: selectedAsset.id, name } })) }}>Rename</button><button className="strip-action danger" onClick={() => window.dispatchEvent(new CustomEvent('opencut:delete-asset', { detail: selectedAsset.id }))}>Remove</button><button className="icon-button" onClick={() => onNotify('Clip options are available in Inspector.')}><MoreHorizontal size={16} /></button></div>
}

function InspectorPanel({ selectedAsset, onDelete }: { selectedAsset: MediaAsset | null; onDelete: () => void }) {
  return <div className="clip-actions"><span>{selectedAsset ? 'Clip selected' : 'No clip selected'}</span><button onClick={onDelete} disabled={!selectedAsset}><Trash2 size={14} /> Delete clip</button></div>
}

function InspectorSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return <div className="inspector-section"><button className="section-toggle" onClick={() => setOpen((value) => !value)}><span>{title}</span>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>{open && children && <div className="section-body">{children}</div>}</div>
}

function ValueControl({ label, value }: { label: string; value: string }) { return <div className="value-control"><span>{label}</span><b>{value}</b></div> }
void ValueControl

function AudioMixer({ assets, clips, selectedClipId, audioTrackRefs }: { assets: MediaAsset[]; clips: TimelineClip[]; selectedClipId: string | null; audioTrackRefs: { current: Record<string, HTMLAudioElement | null> } }) {
  return <div className="audio-mixer-preload" aria-hidden="true">{clips.filter((clip) => clip.id !== selectedClipId && assets.find((asset) => asset.id === clip.assetId)?.type === 'AUDIO').map((clip) => { const asset = assets.find((item) => item.id === clip.assetId); return asset?.url ? <audio key={clip.id} ref={(node) => { audioTrackRefs.current[clip.id] = node }} className="hidden-audio" src={asset.url} preload="auto" /> : null })}</div>
}

function LayeredTimeline({ assets, clips, layers: sourceLayers, textCaptions, selectedClipIds, selectedTextIds, selectedTextId, setSelectedClip, setSelectedClipGroup, setSelectedText, currentTime, totalDuration, zoom, setZoom, rippleEdit, setRippleEdit, snapEnabled, setSnapEnabled, hiddenLayers, mutedLayers, onSplit, onToggleLayer, onDelete }: { assets: MediaAsset[]; clips: TimelineClip[]; layers: TimelineLayer[]; textCaptions: TextCaption[]; selectedClipIds: string[]; selectedTextIds: string[]; selectedTextId: string | null; setSelectedClip: (clipId: string, additive?: boolean) => void; setSelectedClipGroup: (ids: string[], focusId?: string, captionIds?: string[]) => void; setSelectedText: (captionId: string, additive?: boolean) => void; currentTime: number; totalDuration: number; zoom: number; setZoom: (value: number) => void; rippleEdit: boolean; setRippleEdit: (value: boolean) => void; snapEnabled: boolean; setSnapEnabled: (value: boolean) => void; hiddenLayers: Record<string, boolean>; mutedLayers: Record<string, boolean>; onSplit: () => void; onToggleLayer: (layer: TimelineLayer) => void; onDelete: () => void }) {
  const layers = [...sourceLayers.filter(layer => layer.type === 'VIDEO').sort((a, b) => a.index - b.index), ...sourceLayers.filter(layer => layer.type === 'AUDIO').sort((a, b) => a.index - b.index), ...sourceLayers.filter(layer => layer.type === 'TEXT').sort((a, b) => a.index - b.index)]
  const videoClips = clips.filter((clip) => ['VIDEO', 'IMAGE'].includes(assets.find((asset) => asset.id === clip.assetId)?.type ?? ''))
  const audioClips = clips.filter((clip) => assets.find((asset) => asset.id === clip.assetId)?.type === 'AUDIO')
  const videoTracks = layers.filter((layer) => layer.type === 'VIDEO').sort((a, b) => a.index - b.index).map((layer) => layer.index)
  const audioTracks = layers.filter((layer) => layer.type === 'AUDIO').sort((a, b) => a.index - b.index).map((layer) => layer.index)
  const textTracks = layers.filter((layer) => layer.type === 'TEXT').sort((a, b) => a.index - b.index).map((layer) => layer.index)
  const timelineLength = Math.max(1, totalDuration)
  const [marqueeMode, setMarqueeMode] = useState(false)
  const dragRef = useRef<{ clipId: string; edge: 'move' | 'left' | 'right' | 'transition' | 'fadeIn' | 'fadeOut'; originX: number; originStart: number; originTrimStart: number; originTrimEnd: number; originTransition: number; originFade: number; secondsPerPixel: number; isAudio: boolean; group: Array<{ id: string; start: number; track: number; audioTrack: number; isAudio: boolean }> } | null>(null)
  const timelineLengthRef = useRef(timelineLength)
  timelineLengthRef.current = timelineLength
  const timelineDataRef = useRef({ clips, assets, videoClips, videoTracks, audioTracks, selectedClipIds, selectedTextIds, marqueeMode, setSelectedClip, setSelectedClipGroup, setSelectedText })
  timelineDataRef.current = { clips, assets, videoClips, videoTracks, audioTracks, selectedClipIds, selectedTextIds, marqueeMode, setSelectedClip, setSelectedClipGroup, setSelectedText }
  const suppressSeekClickRef = useRef(false)
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.layered-timeline')
    const tracks = root?.querySelector<HTMLElement>('.tracks')
    if (!root || !tracks) return
    const getSnap = (value: number, movingIds: string[], movingId: string, minimum = 0) => {
      const next = Math.max(minimum, value)
      if (!snapEnabled) return next
      const { clips, videoClips } = timelineDataRef.current
      const movingClip = clips.find((clip) => clip.id === movingId)
      const duration = movingClip ? getClipDuration(movingClip) : 0
      const points = [0, ...videoClips.filter((clip) => !movingIds.includes(clip.id)).flatMap((clip) => [getClipStart(clip, clips), getClipStart(clip, clips) + getClipDuration(clip)])]
      const candidates = points.flatMap((point) => [point, point - duration]).filter((point) => point >= minimum)
      const nearest = candidates.reduce((best, point) => Math.abs(point - next) < Math.abs(best - next) ? point : best, candidates[0] ?? next)
      const threshold = Math.min(0.25, 8 * timelineLengthRef.current / Math.max(1, tracks.getBoundingClientRect().width))
      return Math.abs(nearest - next) <= threshold ? nearest : next
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (event.button !== 0 || timelineDataRef.current.marqueeMode || event.shiftKey) return
      const textElement = target.closest<HTMLElement>('[data-caption-id]')
      if (textElement?.dataset.captionId) { timelineDataRef.current.setSelectedText(textElement.dataset.captionId); return }
      const handle = target.closest<HTMLElement>('[data-transition-handle]')
      const element = target.closest<HTMLElement>('.layered-timeline .clip, .layered-timeline .audio-clip')
      if (!element?.dataset.clipId) return
      const { clips, assets, selectedClipIds, setSelectedClip, setSelectedClipGroup } = timelineDataRef.current
      const clip = clips.find((item) => item.id === element.dataset.clipId)
      if (!clip) return
      if (event.metaKey || event.ctrlKey) {
        setSelectedClip(clip.id, true)
        event.preventDefault()
        return
      }
      const groupIds = selectedClipIds.includes(clip.id) ? selectedClipIds : [clip.id]
      if (groupIds.length > 1) setSelectedClipGroup(groupIds, clip.id)
      else setSelectedClip(clip.id)
      const group = groupIds.flatMap(id => {
        const item = clips.find(candidate => candidate.id === id)
        if (!item) return []
        return [{ id, start: getClipStart(item, clips), track: getClipTrack(item), audioTrack: getAudioTrack(item), isAudio: assets.find(asset => asset.id === item.assetId)?.type === 'AUDIO' }]
      })
      const rect = element.getBoundingClientRect()
      const isAudio = element.classList.contains('audio-clip')
      const audioEdge = isAudio && (event.clientX - rect.left < 13 || rect.right - event.clientX < 13) ? (event.clientX - rect.left < 13 ? 'fadeIn' : 'fadeOut') : null
      const edge = handle ? 'transition' : audioEdge ?? (event.clientX - rect.left < 9 ? 'left' : rect.right - event.clientX < 9 ? 'right' : 'move')
      const trackRect = tracks.getBoundingClientRect()
      dragRef.current = { clipId: clip.id, edge, originX: event.clientX, originStart: getClipStart(clip, clips), originTrimStart: clip.trimStart, originTrimEnd: clip.trimEnd, originTransition: clip.transition?.duration ?? 0.6, originFade: edge === 'fadeOut' ? clip.fadeOut ?? 0 : clip.fadeIn ?? 0, secondsPerPixel: timelineLengthRef.current / trackRect.width, isAudio, group }
      window.dispatchEvent(new CustomEvent('opencut:timeline-edit-start', { detail: { clipId: clip.id } }))
      element.setPointerCapture?.(event.pointerId); event.preventDefault()
    }
    let pendingDrag: PointerEvent | null = null
    let dragFrame = 0
    const applyDrag = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = (event.clientX - drag.originX) * drag.secondsPerPixel
      if (drag.edge === 'transition') window.dispatchEvent(new CustomEvent('opencut:resize-transition', { detail: { clipId: drag.clipId, delta, baseDuration: drag.originTransition } }))
      else if (drag.edge === 'fadeIn' || drag.edge === 'fadeOut') window.dispatchEvent(new CustomEvent('opencut:resize-fade', { detail: { clipId: drag.clipId, edge: drag.edge, delta, baseDuration: drag.originFade } }))
      else if (drag.edge === 'move') {
        const trackRect = tracks.getBoundingClientRect()
        const rowY = Math.max(0, event.clientY - trackRect.top)
        const { videoTracks, audioTracks } = timelineDataRef.current
        const videoHeight = videoTracks.length * 67
        const sourceTracks = drag.isAudio ? audioTracks : videoTracks
        const rowHeight = drag.isAudio ? 45 : 67
        const rowIndex = drag.isAudio ? Math.floor(Math.max(0, rowY - videoHeight) / rowHeight) : Math.floor(rowY / rowHeight)
        const nextTrack = sourceTracks[Math.min(Math.max(0, sourceTracks.length - 1), rowIndex)] ?? 0
        const minimum = drag.originStart - Math.min(...drag.group.map(item => item.start))
        window.dispatchEvent(new CustomEvent('opencut:move-clip', { detail: { clipId: drag.clipId, start: getSnap(drag.originStart + delta, drag.group.map(item => item.id), drag.clipId, minimum), originStart: drag.originStart, group: drag.group, ...(drag.isAudio ? { audioTrack: nextTrack } : { track: nextTrack }) } }))
      } else window.dispatchEvent(new CustomEvent('opencut:resize-clip', { detail: { clipId: drag.clipId, edge: drag.edge, delta, baseStart: drag.originStart, baseTrimStart: drag.originTrimStart, baseTrimEnd: drag.originTrimEnd } }))
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current) return
      pendingDrag = event
      if (dragFrame) return
      dragFrame = requestAnimationFrame(() => {
        dragFrame = 0
        if (pendingDrag) applyDrag(pendingDrag)
        pendingDrag = null
      })
    }
    const handlePointerUp = () => {
      if (dragFrame) cancelAnimationFrame(dragFrame)
      if (pendingDrag) applyDrag(pendingDrag)
      pendingDrag = null
      dragFrame = 0
      dragRef.current = null
    }
    const marquee = document.createElement('div')
    marquee.className = 'timeline-marquee'
    document.body.appendChild(marquee)
    let marqueeStart: { x: number; y: number; additive: boolean; previous: string[]; previousText: string[]; originClip?: string; originCaption?: string } | null = null
    let marqueeActive = false
    const handleMarqueeDown = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target as Element | null)?.closest('.playhead')) return
      const target = event.target as Element | null
      const clip = target?.closest<HTMLElement>('[data-clip-id]')
      const caption = target?.closest<HTMLElement>('[data-caption-id]')
      if (target?.closest('button') && !clip && !caption) return
      if ((clip || caption) && !timelineDataRef.current.marqueeMode && !event.shiftKey) return
      marqueeStart = { x: event.clientX, y: event.clientY, additive: event.shiftKey || event.metaKey || event.ctrlKey, previous: timelineDataRef.current.selectedClipIds, previousText: timelineDataRef.current.selectedTextIds, originClip: clip?.dataset.clipId, originCaption: caption?.dataset.captionId }
      marqueeActive = false
      if (clip || caption) event.preventDefault()
    }
    const handleMarqueeMove = (event: PointerEvent) => {
      if (!marqueeStart) return
      if (!marqueeActive && Math.hypot(event.clientX - marqueeStart.x, event.clientY - marqueeStart.y) < 5) return
      marqueeActive = true
      const left = Math.min(marqueeStart.x, event.clientX)
      const top = Math.min(marqueeStart.y, event.clientY)
      marquee.style.display = 'block'
      marquee.style.left = `${left}px`
      marquee.style.top = `${top}px`
      marquee.style.width = `${Math.abs(event.clientX - marqueeStart.x)}px`
      marquee.style.height = `${Math.abs(event.clientY - marqueeStart.y)}px`
      const bounds = marquee.getBoundingClientRect()
      tracks.querySelectorAll<HTMLElement>('[data-clip-id], [data-caption-id]').forEach(element => {
        const rect = element.getBoundingClientRect()
        element.classList.toggle('marquee-candidate', rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top)
      })
    }
    const handleMarqueeUp = (event: PointerEvent) => {
      if (!marqueeStart) return
      if (marqueeActive) {
        handleMarqueeMove(event)
        const bounds = marquee.getBoundingClientRect()
        const candidates = Array.from(tracks.querySelectorAll<HTMLElement>('[data-clip-id], [data-caption-id]')).filter(element => {
          const rect = element.getBoundingClientRect()
          return rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top
        })
        const found = candidates.map(element => element.dataset.clipId).filter((id): id is string => Boolean(id))
        const foundText = candidates.map(element => element.dataset.captionId).filter((id): id is string => Boolean(id))
        timelineDataRef.current.setSelectedClipGroup(marqueeStart.additive ? [...new Set([...marqueeStart.previous, ...found])] : found, undefined, marqueeStart.additive ? [...new Set([...marqueeStart.previousText, ...foundText])] : foundText)
        suppressSeekClickRef.current = true
      } else if (marqueeStart.originClip) {
        timelineDataRef.current.setSelectedClip(marqueeStart.originClip, marqueeStart.additive)
      } else if (marqueeStart.originCaption) {
        timelineDataRef.current.setSelectedText(marqueeStart.originCaption, marqueeStart.additive)
      }
      tracks.querySelectorAll<HTMLElement>('.marquee-candidate').forEach(element => element.classList.remove('marquee-candidate'))
      marquee.style.display = 'none'
      marqueeStart = null
      marqueeActive = false
    }
    const handleClipClickCapture = (event: MouseEvent) => {
      if (suppressSeekClickRef.current) { event.stopPropagation(); event.preventDefault(); suppressSeekClickRef.current = false; return }
      if (event.detail > 0 && (event.target as Element | null)?.closest('.clip, .audio-clip, .text-clip')) event.stopPropagation()
    }
    tracks.addEventListener('pointerdown', handlePointerDown); tracks.addEventListener('pointerdown', handleMarqueeDown); tracks.addEventListener('click', handleClipClickCapture, true)
    window.addEventListener('pointermove', handlePointerMove); window.addEventListener('pointermove', handleMarqueeMove); window.addEventListener('pointerup', handlePointerUp); window.addEventListener('pointerup', handleMarqueeUp)
    return () => { if (dragFrame) cancelAnimationFrame(dragFrame); marquee.remove(); tracks.removeEventListener('pointerdown', handlePointerDown); tracks.removeEventListener('pointerdown', handleMarqueeDown); tracks.removeEventListener('click', handleClipClickCapture, true); window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointermove', handleMarqueeMove); window.removeEventListener('pointerup', handlePointerUp); window.removeEventListener('pointerup', handleMarqueeUp) }
  }, [snapEnabled])
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.layered-timeline')
    const tracks = root?.querySelector<HTMLElement>('.tracks')
    const ruler = root?.querySelector<HTMLElement>('.timeline-ruler')
    if (!tracks || !ruler) return
    let scrubbing = false
    let seekFrame = 0
    let pointerX = 0
    const seekAt = (x: number) => { const rect = tracks.getBoundingClientRect(); window.dispatchEvent(new CustomEvent('opencut:seek', { detail: Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * totalDuration })) }
    const handleClick = (event: MouseEvent) => {
      if (suppressSeekClickRef.current) { suppressSeekClickRef.current = false; return }
      if (!(event.target as Element | null)?.closest('button, .playhead')) seekAt(event.clientX)
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest('.playhead, .timeline-ruler')) return
      scrubbing = true
      pointerX = event.clientX
      seekAt(pointerX)
      event.preventDefault()
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!scrubbing) return
      pointerX = event.clientX
      if (seekFrame) return
      seekFrame = requestAnimationFrame(() => { seekFrame = 0; seekAt(pointerX) })
    }
    const handlePointerUp = () => {
      if (!scrubbing) return
      scrubbing = false
      if (seekFrame) cancelAnimationFrame(seekFrame)
      seekFrame = 0
      seekAt(pointerX)
    }
    tracks.addEventListener('click', handleClick); tracks.addEventListener('pointerdown', handlePointerDown); ruler.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove); window.addEventListener('pointerup', handlePointerUp)
    return () => { if (seekFrame) cancelAnimationFrame(seekFrame); tracks.removeEventListener('click', handleClick); tracks.removeEventListener('pointerdown', handlePointerDown); ruler.removeEventListener('pointerdown', handlePointerDown); window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp) }
  }, [totalDuration])
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.layered-timeline')
    if (!root) return
    const snapButton = root.querySelectorAll<HTMLButtonElement>('.timeline-toolbar-right .snap-toggle')[1]
    const toolButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.timeline-toolbar-left .tool-square'))
    const layerButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.track-visibility'))
    const handleSnap = () => setSnapEnabled(!snapEnabled)
    const handleSplit = () => onSplit()
    const handleLayer = (event: Event) => {
      const button = event.currentTarget as HTMLButtonElement
      const index = layerButtons.indexOf(button)
      const layer = layers[index]
      if (!layer) return
      onToggleLayer(layer)
      button.classList.toggle('disabled')
      button.setAttribute('aria-pressed', String(button.classList.contains('disabled')))
    }
    snapButton?.addEventListener('click', handleSnap)
    toolButtons[2]?.addEventListener('click', handleSplit)
    toolButtons[3]?.addEventListener('click', handleSplit)
    layerButtons.forEach((button) => button.addEventListener('click', handleLayer))
    if (snapButton) {
      snapButton.classList.toggle('active', snapEnabled)
      snapButton.setAttribute('aria-pressed', String(snapEnabled))
    }
    layerButtons.forEach((button, index) => {
      const layer = layers[index]
      const disabled = Boolean(layer && (layer.type === 'AUDIO' ? mutedLayers[layer.id] : hiddenLayers[layer.id]))
      button.classList.toggle('disabled', disabled)
      button.setAttribute('aria-pressed', String(disabled))
    })
    return () => {
      snapButton?.removeEventListener('click', handleSnap)
      toolButtons[2]?.removeEventListener('click', handleSplit)
      toolButtons[3]?.removeEventListener('click', handleSplit)
      layerButtons.forEach((button) => button.removeEventListener('click', handleLayer))
    }
  }, [hiddenLayers, layers, mutedLayers, onSplit, onToggleLayer, snapEnabled, setSnapEnabled])
  void onDelete
  return <section className={`timeline-panel advanced-timeline layered-timeline ${marqueeMode ? 'marquee-mode' : ''}`}><div className="timeline-toolbar"><div className="timeline-toolbar-left"><button className={`tool-square ${!marqueeMode ? 'active' : ''}`} onClick={() => setMarqueeMode(false)} aria-label="Di chuyển clip" title="Di chuyển clip"><MousePointer2 size={15} /></button><button className={`tool-square ${marqueeMode ? 'active' : ''}`} onClick={() => setMarqueeMode(true)} aria-label="Chọn vùng trên timeline" title="Kéo chuột để chọn nhiều clip và caption"><SquareDashedMousePointer size={15} /></button><div className="toolbar-divider" /><button className="tool-square"><Scissors size={15} /></button><button className="tool-square"><Split size={15} /></button><button className="tool-square" onClick={onDelete} aria-label="Xoá các mục đã chọn" title="Xoá các mục đã chọn"><Trash2 size={15} /></button><span className="timeline-toolbar-status">{selectedClipIds.length + selectedTextIds.length ? `${selectedClipIds.length + selectedTextIds.length} đã chọn · Delete để xoá` : marqueeMode ? 'Kéo chuột để chọn vùng' : 'Shift + kéo để chọn nhiều'}</span></div><div className="timeline-toolbar-center"><span>{formatTime(currentTime)}</span><i>/</i><span>{formatTime(totalDuration)}</span></div><div className="timeline-toolbar-right"><span>Ripple</span><button className={`snap-toggle ${rippleEdit ? 'active' : ''}`} onClick={() => setRippleEdit(!rippleEdit)} aria-label="Toggle ripple editing"><span /></button><span>Snap</span><button className="snap-toggle active" aria-label="Toggle snapping"><span /></button><button className="zoom-control" onClick={() => setZoom(Math.max(20, zoom - 10))} aria-label="Zoom out"><ZoomOut size={15} /></button><div className="zoom-value">{zoom}%</div><button className="zoom-control" onClick={() => setZoom(Math.min(400, zoom + 10))} aria-label="Zoom in"><ZoomIn size={15} /></button></div></div><div className="timeline-scroller"><div className="timeline-ruler" style={{ minWidth: timelineContentWidth(timelineLength, zoom) }}><div className="ruler-spacer" /><div className="timeline-ruler-ticks">{Array.from({ length: 7 }, (_, index) => <span key={index} style={{ left: `${index / 6 * 100}%` }}>{formatTime(index * timelineLength / 6)}</span>)}</div></div><div className="timeline-body" style={{ minWidth: timelineContentWidth(timelineLength, zoom) }}><div className="track-labels">{layers.map((layer) => <div key={layer.id} data-layer-type={layer.type} title={layer.name} className={`track-label ${layer.type === 'VIDEO' && layer.index === 0 ? 'main-label' : ''}`}><span className={`track-label-icon ${layer.type === 'AUDIO' ? 'audio-label-icon' : layer.type === 'TEXT' ? 'text-label-icon' : ''}`}>{layer.type === 'VIDEO' ? <Film size={14} /> : layer.type === 'AUDIO' ? <Music2 size={14} /> : <Captions size={14} />}</span><span>{layer.name}</span><button className="track-visibility" aria-label={`Toggle ${layer.name}`}>{layer.type === 'TEXT' ? <Lock size={13} /> : layer.type === 'AUDIO' ? <Volume2 size={14} /> : <Eye size={14} />}</button></div>)}</div><div className="tracks" data-timeline-length={timelineLength}><div className="playhead" style={{ left: `${Math.min(100, currentTime / totalDuration * 100)}%` }} />{videoTracks.map((track) => <div key={`video-${track}`} className="track video-track advanced-video-track">{videoClips.filter((clip) => getClipTrack(clip) === track).map((clip, index) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} data-clip-id={clip.id} className={`clip ${selectedClipIds.includes(clip.id) ? 'selected' : ''} ${index === 0 ? 'clip-main' : index === 1 ? 'clip-second' : 'clip-third'}`} style={timelineSpan(getClipStart(clip, clips), getClipDuration(clip), timelineLength)} onClick={(event) => setSelectedClip(clip.id, event.shiftKey)} title="Drag to move · drag either edge to resize"><div className={`clip-thumbs ${asset.tone}-strip`}>{asset.url ? <AssetThumbnail asset={asset} /> : <><span /><span /><span /><span /></>}</div>{clip.transition && clip.transition.type !== 'none' && <span className="transition-handle" data-transition-handle title={`Transition ${clip.transition.type} · drag to change ${clip.transition.duration.toFixed(1)}s`} /> }<span className="clip-title">{asset.name}</span><span className="clip-length">{formatTime(getClipDuration(clip))}</span></button> })}</div>)}{audioTracks.map((track) => <div key={`audio-${track}`} className="track audio-track advanced-audio-track">{audioClips.filter((clip) => getAudioTrack(clip) === track).map((clip) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} data-clip-id={clip.id} className={`audio-clip ${selectedClipIds.includes(clip.id) ? 'selected' : ''}`} style={timelineSpan(getClipStart(clip, clips), getClipDuration(clip), timelineLength)} onClick={(event) => setSelectedClip(clip.id, event.shiftKey)}><div className="waveform">{(asset.waveform ?? makeFallbackWaveform(asset.name, 50)).map((value, index) => <span key={index} style={{ height: `${Math.max(12, value * 100)}%` }} />)}{(clip.volumeKeyframes ?? []).map((keyframe, index) => <i className="wave-keyframe" key={`${clip.id}-key-${index}`} style={{ left: `${Math.min(100, keyframe.time / Math.max(0.1, getClipDuration(clip)) * 100)}%` }} />)}</div><Music2 size={12} /><span>{asset.name}{clip.muted ? ' · muted' : ''}</span></button> })}</div>)}{textTracks.map((track) => <div key={`text-${track}`} className="track text-track advanced-text-track">{textCaptions.filter((caption) => (caption.track ?? 0) === track).map((caption) => <TimelineCaptionClip key={caption.id} caption={caption} timelineLength={timelineLength} selected={selectedTextIds.includes(caption.id) || selectedTextId === caption.id} onSelect={setSelectedText} />)}</div>)}</div></div></div></section>
}

function AdvancedTimeline({ assets, clips, layers, textCaptions, selectedClipIds, selectedTextId, setSelectedClip, setSelectedText, currentTime, totalDuration, zoom, setZoom, rippleEdit, setRippleEdit, onDropAsset, onDelete }: { assets: MediaAsset[]; clips: TimelineClip[]; layers: TimelineLayer[]; textCaptions: TextCaption[]; selectedClipIds: string[]; selectedTextId: string | null; setSelectedClip: (clipId: string, additive?: boolean) => void; setSelectedText: (captionId: string) => void; currentTime: number; totalDuration: number; zoom: number; setZoom: (value: number) => void; rippleEdit: boolean; setRippleEdit: (value: boolean) => void; onDropAsset: (assetId: string, start?: number, track?: number) => void; onDelete: () => void }) {
  const videoClips = clips.filter((clip) => ['VIDEO', 'IMAGE'].includes(assets.find((asset) => asset.id === clip.assetId)?.type ?? ''))
  const audioClips = clips.filter((clip) => assets.find((asset) => asset.id === clip.assetId)?.type === 'AUDIO')
  const videoTracks = layers.filter((layer) => layer.type === 'VIDEO').sort((a, b) => a.index - b.index).map((layer) => layer.index)
  const audioTracks = layers.filter((layer) => layer.type === 'AUDIO').sort((a, b) => a.index - b.index).map((layer) => layer.index)
  const timelineLength = Math.max(18, totalDuration)
  void onDropAsset
  void getAudioTrack
  const dragRef = useRef<{ clipId: string; edge: 'move' | 'left' | 'right' | 'transition' | 'fadeIn' | 'fadeOut'; originX: number; originStart: number; originTrimStart: number; originTrimEnd: number; originTransition: number; originFade: number; secondsPerPixel: number; isAudio: boolean } | null>(null)
  useEffect(() => {
    const panel = document.querySelector<HTMLElement>('.advanced-timeline')
    const track = panel?.querySelector<HTMLElement>('.tracks')
    if (!panel || !track) return
    const getSnap = (value: number, movingId: string) => {
      if (!panel.querySelectorAll('.snap-toggle')[1]?.classList.contains('active')) return Math.max(0, value)
      const points = [0, ...videoClips.filter((clip) => clip.id !== movingId).flatMap((clip) => [getClipStart(clip, clips), getClipStart(clip, clips) + getClipDuration(clip)])]
      const candidate = Math.round(value * 2) / 2
      const nearest = points.find((point) => Math.abs(point - candidate) < 0.18)
      return Math.max(0, nearest ?? candidate)
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const handle = target.closest<HTMLElement>('[data-transition-handle]')
      const fadeHandle = target.closest<HTMLElement>('[data-fade-handle]')
      const element = target.closest<HTMLElement>('.advanced-timeline .clip, .advanced-timeline .audio-clip')
      if (!element) return
      const clipId = element.dataset.clipId
      if (!clipId) return
      const clip = clips.find((item) => item.id === clipId)
      if (!clip) return
      const rect = element.getBoundingClientRect()
      const audioEdge = element.classList.contains('audio-clip') && (event.clientX - rect.left < 13 || rect.right - event.clientX < 13) ? (event.clientX - rect.left < 13 ? 'fadeIn' : 'fadeOut') : null
      const edge: 'move' | 'left' | 'right' | 'transition' | 'fadeIn' | 'fadeOut' = handle ? 'transition' : fadeHandle ? fadeHandle.dataset.fadeHandle as 'fadeIn' | 'fadeOut' : audioEdge ?? (event.clientX - rect.left < 9 ? 'left' : rect.right - event.clientX < 9 ? 'right' : 'move')
      const trackRect = track.getBoundingClientRect()
      dragRef.current = { clipId, edge, originX: event.clientX, originStart: getClipStart(clip, clips), originTrimStart: clip.trimStart, originTrimEnd: clip.trimEnd, originTransition: clip.transition?.duration ?? 0.6, originFade: edge === 'fadeOut' ? clip.fadeOut ?? 0 : clip.fadeIn ?? 0, secondsPerPixel: timelineLength / trackRect.width, isAudio: element.classList.contains('audio-clip') }
      window.dispatchEvent(new CustomEvent('opencut:timeline-edit-start', { detail: { clipId } }))
      element.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = (event.clientX - drag.originX) * drag.secondsPerPixel
      if (drag.edge === 'transition') window.dispatchEvent(new CustomEvent('opencut:resize-transition', { detail: { clipId: drag.clipId, delta, baseDuration: drag.originTransition } }))
      else if (drag.edge === 'fadeIn' || drag.edge === 'fadeOut') window.dispatchEvent(new CustomEvent('opencut:resize-fade', { detail: { clipId: drag.clipId, edge: drag.edge, delta, baseDuration: drag.originFade } }))
      else if (drag.edge === 'move') {
        const rowY = Math.max(0, event.clientY - track.getBoundingClientRect().top)
        const videoHeight = videoTracks.length * 67
        const sourceTracks = drag.isAudio ? audioTracks : videoTracks
        const rowHeight = drag.isAudio ? 45 : 67
        const rowIndex = drag.isAudio ? Math.floor(Math.max(0, rowY - videoHeight) / rowHeight) : Math.floor(rowY / rowHeight)
        const nextTrack = sourceTracks[Math.min(Math.max(0, sourceTracks.length - 1), rowIndex)] ?? 0
        window.dispatchEvent(new CustomEvent('opencut:move-clip', { detail: { clipId: drag.clipId, start: getSnap(drag.originStart + delta, drag.clipId), ...(drag.isAudio ? { audioTrack: nextTrack } : { track: nextTrack }) } }))
      }
      else window.dispatchEvent(new CustomEvent('opencut:resize-clip', { detail: { clipId: drag.clipId, edge: drag.edge, delta, baseStart: drag.originStart, baseTrimStart: drag.originTrimStart, baseTrimEnd: drag.originTrimEnd } }))
    }
    const handlePointerUp = () => { dragRef.current = null }
    track.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => { track.removeEventListener('pointerdown', handlePointerDown); window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp) }
  }, [clips, timelineLength, videoClips])
  useEffect(() => {
    const tracks = document.querySelector<HTMLElement>('.advanced-timeline .tracks')
    if (!tracks) return
    const handleTrackClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('button')) return
      const rect = tracks.getBoundingClientRect()
      window.dispatchEvent(new CustomEvent('opencut:seek', { detail: Math.max(0, Math.min(1, ((event as MouseEvent).clientX - rect.left) / rect.width)) * totalDuration }))
    }
    tracks.addEventListener('click', handleTrackClick)
    return () => tracks.removeEventListener('click', handleTrackClick)
  }, [totalDuration])
  useEffect(() => {
    const tracks = document.querySelector<HTMLElement>('.advanced-timeline .tracks')
    if (!tracks) return
    let menu: HTMLDivElement | null = null
    const closeMenu = (event?: Event) => {
      if (event && (event.target as Element | null)?.closest('.timeline-context-menu')) return
      menu?.remove(); menu = null
    }
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const clip = target.closest<HTMLElement>('.advanced-timeline .clip, .advanced-timeline .audio-clip, .advanced-timeline .text-clip')
      const clipId = clip?.dataset.clipId
      if (!clipId) return
      event.preventDefault()
      closeMenu()
      setSelectedClip(clipId)
      menu = document.createElement('div')
      menu.className = 'timeline-context-menu'
      menu.style.left = `${Math.min(event.clientX, window.innerWidth - 190)}px`
      menu.style.top = `${Math.min(event.clientY, window.innerHeight - 210)}px`
      const actions = [{ id: 'split', label: 'Split at playhead' }, { id: 'duplicate', label: 'Duplicate clip' }, { id: 'mute', label: 'Mute / unmute' }, { id: 'transition', label: 'Cycle transition' }, { id: 'delete', label: 'Delete clip', danger: true }]
      actions.forEach(({ id, label, danger }) => {
        const button = document.createElement('button')
        button.type = 'button'; button.textContent = label
        if (danger) button.className = 'danger'
        button.addEventListener('click', () => { window.dispatchEvent(new CustomEvent('opencut:context-action', { detail: id })); closeMenu() })
        menu?.append(button)
      })
      document.body.append(menu)
    }
    tracks.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('pointerdown', closeMenu)
    return () => { tracks.removeEventListener('contextmenu', handleContextMenu); window.removeEventListener('pointerdown', closeMenu); menu?.remove() }
  }, [setSelectedClip])
  useEffect(() => {
    const tracks = document.querySelector<HTMLElement>('.advanced-timeline .tracks')
    if (!tracks) return
    const playheadPosition = (event: PointerEvent) => {
      const rect = tracks.getBoundingClientRect()
      window.dispatchEvent(new CustomEvent('opencut:seek', { detail: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * totalDuration }))
    }
    let dragging = false
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.playhead')) return
      dragging = true; playheadPosition(event); event.preventDefault()
    }
    const handlePointerMove = (event: PointerEvent) => { if (dragging) playheadPosition(event) }
    const handlePointerUp = () => { dragging = false }
    tracks.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => { tracks.removeEventListener('pointerdown', handlePointerDown); window.removeEventListener('pointermove', handlePointerMove); window.removeEventListener('pointerup', handlePointerUp) }
  }, [totalDuration])
  useEffect(() => {
    const panel = document.querySelector<HTMLElement>('.advanced-timeline')
    if (!panel) return
    const handleToolbarClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const snapButton = target.closest<HTMLButtonElement>('.timeline-toolbar-right .snap-toggle:nth-of-type(2)')
      if (snapButton) { snapButton.classList.toggle('active'); return }
      const button = target.closest<HTMLButtonElement>('.tool-square')
      if (!button) return
      const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.timeline-toolbar-left .tool-square'))
      const index = buttons.indexOf(button)
      if (index < 2) buttons.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === index))
      if (index === 2 || index === 3) document.querySelector<HTMLButtonElement>('[aria-label="Split clip"]')?.click()
    }
    panel.addEventListener('click', handleToolbarClick)
    return () => panel.removeEventListener('click', handleToolbarClick)
  }, [])
  return <section className="timeline-panel advanced-timeline"><div className="timeline-toolbar"><div className="timeline-toolbar-left"><button className="tool-square active"><MousePointer2 size={15} /></button><button className="tool-square"><Hand size={15} /></button><div className="toolbar-divider" /><button className="tool-square"><Scissors size={15} /></button><button className="tool-square"><Split size={15} /></button><button className="tool-square" onClick={onDelete}><Trash2 size={15} /></button></div><div className="timeline-toolbar-right"><span>Ripple</span><button className={`snap-toggle ${rippleEdit ? 'active' : ''}`} onClick={() => setRippleEdit(!rippleEdit)} aria-label="Toggle ripple editing"><span /></button><span>Snap</span><button className="snap-toggle active"><span /></button><button className="zoom-control" onClick={() => setZoom(Math.max(40, zoom - 10))}><ZoomOut size={15} /></button><div className="zoom-value">{zoom}%</div><button className="zoom-control" onClick={() => setZoom(Math.min(120, zoom + 10))}><ZoomIn size={15} /></button></div></div><div className="timeline-scroller"><div className="timeline-ruler"><div className="ruler-spacer" />{['00:00', '00:03', '00:06', '00:09', '00:12', '00:15', '00:18'].map((time) => <span key={time}>{time}</span>)}</div><div className="timeline-body"><div className="track-labels">{videoTracks.map((track) => <div key={track} className={`track-label ${track === 0 ? 'main-label' : ''}`}><Film size={14} /><span>Video {track + 1}</span><Eye size={14} /></div>)}<div className="track-label"><Music2 size={14} /><span>Audio</span><Volume2 size={14} /></div><div className="track-label"><Captions size={14} /><span>Text</span><Lock size={13} /></div></div><div className="tracks"><div className="playhead" style={{ left: `${Math.min(100, currentTime / totalDuration * 100)}%` }} />{videoTracks.map((track) => <div key={track} className="track video-track advanced-video-track">{videoClips.filter((clip) => getClipTrack(clip) === track).map((clip, index) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} data-clip-id={clip.id} className={`clip ${selectedClipIds.includes(clip.id) ? 'selected' : ''} ${index === 0 ? 'clip-main' : index === 1 ? 'clip-second' : 'clip-third'}`} style={{ left: `${getClipStart(clip, clips) / timelineLength * 100}%`, width: `${Math.max(3, getClipDuration(clip) / timelineLength * 100)}%` }} onClick={(event) => setSelectedClip(clip.id, event.shiftKey)} title="Drag to move · drag either edge to resize"><div className={`clip-thumbs ${asset.tone}-strip`}>{asset.url ? <AssetThumbnail asset={asset} /> : <><span /><span /><span /><span /></>}</div>{clip.transition && clip.transition.type !== 'none' && <span className="transition-handle" data-transition-handle title={`Transition ${clip.transition.type} · drag to change ${clip.transition.duration.toFixed(1)}s`} /> }<span className="clip-title">{asset.name}</span><span className="clip-length">{formatTime(getClipDuration(clip))}</span></button> })}</div>)}<div className="track audio-track advanced-audio-track">{audioClips.map((clip) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} data-clip-id={clip.id} className={`audio-clip ${selectedClipIds.includes(clip.id) ? 'selected' : ''}`} style={{ left: `${getClipStart(clip, clips) / timelineLength * 100}%`, width: `${Math.max(12, getClipDuration(clip) / timelineLength * 100)}%` }} onClick={(event) => setSelectedClip(clip.id, event.shiftKey)}><div className="waveform">{(asset.waveform ?? makeFallbackWaveform(asset.name, 50)).map((value, index) => <span key={index} style={{ height: `${Math.max(12, value * 100)}%` }} />)}{(clip.volumeKeyframes ?? []).map((keyframe, index) => <i className="wave-keyframe" key={`${clip.id}-key-${index}`} style={{ left: `${Math.min(100, keyframe.time / Math.max(0.1, getClipDuration(clip)) * 100)}%` }} />)}</div><Music2 size={12} /><span>{asset.name}{clip.muted ? ' · muted' : ''}</span></button> })}</div><div className="track text-track advanced-text-track">{textCaptions.map((caption) => <button key={caption.id} className={`text-clip ${selectedTextId === caption.id ? 'selected' : ''}`} style={{ left: `${caption.start / timelineLength * 100}%`, width: `${Math.max(12, caption.duration / timelineLength * 100)}%` }} onClick={() => setSelectedText(caption.id)}><Text size={12} /><span>{caption.text}</span></button>)}</div></div></div></div></section>
}

void AdvancedTimeline

function Timeline({ assets, clips, selectedClipId, setSelectedClip, currentTime, totalDuration, zoom, setZoom, onDelete }: { assets: MediaAsset[]; clips: TimelineClip[]; selectedClipId: string | null; setSelectedClip: (clipId: string) => void; currentTime: number; totalDuration: number; zoom: number; setZoom: (value: number) => void; onDelete: () => void }) {
  const videoClips = clips.filter((clip) => { const type = assets.find((asset) => asset.id === clip.assetId)?.type; return type === 'VIDEO' || type === 'IMAGE' })
  const audioClips = clips.filter((clip) => assets.find((asset) => asset.id === clip.assetId)?.type === 'AUDIO')
  const timelineLength = Math.max(18, videoClips.reduce((sum, clip) => sum + clip.trimEnd - clip.trimStart, 0))
  useEffect(() => {
    const tracks = document.querySelector<HTMLElement>('.tracks')
    if (!tracks) return
    const handleTrackClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element) || target.closest('button')) return
      const rect = tracks.getBoundingClientRect()
      const position = Math.max(0, Math.min(1, (event as MouseEvent).clientX - rect.left) / rect.width)
      window.dispatchEvent(new CustomEvent('opencut:seek', { detail: position * totalDuration }))
    }
    tracks.addEventListener('click', handleTrackClick)
    return () => tracks.removeEventListener('click', handleTrackClick)
  }, [totalDuration])
  useEffect(() => {
    const panel = document.querySelector<HTMLElement>('.timeline-panel')
    if (!panel) return
    const handleToolbarClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      if (!button || !panel.contains(button)) return
      if (button.classList.contains('snap-toggle')) {
        button.classList.toggle('active')
        return
      }
      const toolButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.timeline-toolbar-left .tool-square'))
      const toolIndex = toolButtons.indexOf(button as HTMLButtonElement)
      if (toolIndex === 0 || toolIndex === 1) {
        toolButtons.forEach((toolButton, index) => toolButton.classList.toggle('active', index === toolIndex))
      }
      if (toolIndex === 2 || toolIndex === 3) {
        document.querySelector<HTMLButtonElement>('[aria-label="Split clip"]')?.click()
      }
    }
    panel.addEventListener('click', handleToolbarClick)
    return () => panel.removeEventListener('click', handleToolbarClick)
  }, [])
  return <section className="timeline-panel"><div className="timeline-toolbar"><div className="timeline-toolbar-left"><button className="tool-square active"><MousePointer2 size={15} /></button><button className="tool-square"><Hand size={15} /></button><div className="toolbar-divider" /><button className="tool-square"><Scissors size={15} /></button><button className="tool-square"><Split size={15} /></button><button className="tool-square" onClick={onDelete}><Trash2 size={15} /></button></div><div className="timeline-toolbar-right"><span>Snap</span><button className="snap-toggle active"><span /></button><button className="zoom-control" onClick={() => setZoom(Math.max(40, zoom - 10))}><ZoomOut size={15} /></button><div className="zoom-value">{zoom}%</div><button className="zoom-control" onClick={() => setZoom(Math.min(120, zoom + 10))}><ZoomIn size={15} /></button></div></div><div className="timeline-scroller"><div className="timeline-ruler"><div className="ruler-spacer" />{['00:00', '00:03', '00:06', '00:09', '00:12', '00:15', '00:18'].map((time) => <span key={time}>{time}</span>)}</div><div className="timeline-body"><div className="track-labels"><div className="track-label main-label"><Film size={14} /><span>Video</span><Eye size={14} /></div><div className="track-label"><Music2 size={14} /><span>Audio</span><Volume2 size={14} /></div><div className="track-label"><Captions size={14} /><span>Text</span><Lock size={13} /></div></div><div className="tracks"><div className="playhead" style={{ left: `${Math.min(100, currentTime / totalDuration * 100)}%` }} /><div className="track video-track">{videoClips.map((clip, index) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} className={`clip ${selectedClipId === clip.id ? 'selected' : ''} ${index === 0 ? 'clip-main' : index === 1 ? 'clip-second' : 'clip-third'}`} style={{ width: `${Math.max(12, (clip.trimEnd - clip.trimStart) / timelineLength * 100)}%` }} onClick={() => setSelectedClip(clip.id)}><div className={`clip-thumbs ${asset.tone}-strip`}>{asset.url ? <AssetThumbnail asset={asset} /> : <><span /><span /><span /><span /></>}</div><span className="clip-title">{asset.name}</span><span className="clip-length">{formatTime(clip.trimEnd - clip.trimStart)}</span></button> })}</div><div className="track audio-track">{audioClips.map((clip) => { const asset = assets.find((item) => item.id === clip.assetId); if (!asset) return null; return <button key={clip.id} className={`audio-clip ${selectedClipId === clip.id ? 'selected' : ''}`} onClick={() => setSelectedClip(clip.id)}><div className="waveform">{Array.from({ length: 50 }, (_, index) => <span key={index} style={{ height: `${18 + ((index * 17) % 25)}%` }} />)}</div><Music2 size={12} /><span>{asset.name}</span></button> })}</div><div className="track text-track"><div className="text-clip"><Text size={12} /><span>Find your next horizon.</span></div></div></div></div></div></section>
}
void Timeline
