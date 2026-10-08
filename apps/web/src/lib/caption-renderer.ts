import type { CSSProperties } from 'react'
import type { AspectRatio, Caption } from './short-video.ts'
import { lyricDisplayText, lyricRole } from './bilingual-captions.ts'
import { captionFontStack } from './font-catalog.ts'
import { trackedTextLayout } from './creator-titles.ts'
import type { CaptionFrame } from './lyric-scroll.ts'

const DESIGN_WIDTH = 1920
const trackingCache = new WeakMap<CanvasRenderingContext2D, Map<string, ReturnType<typeof trackedTextLayout>>>()

function cachedTracking(context: CanvasRenderingContext2D, text: string, spacing: number) {
  let cache = trackingCache.get(context)
  if (!cache) { cache = new Map(); trackingCache.set(context, cache) }
  const key = `${context.font}:${spacing}:${text}`
  const existing = cache.get(key)
  if (existing) return existing
  const layout = trackedTextLayout(text, glyph => context.measureText(glyph).width, spacing)
  if (cache.size >= 128) cache.delete(cache.keys().next().value!)
  cache.set(key, layout)
  return layout
}

export function getCaptionMotion(caption: Caption, timelineTime: number, renderScale: number) {
  const local = Math.max(0, timelineTime - caption.start)
  const entrance = caption.animation === 'scroll' ? Math.min(1, 0.65 + local) : caption.animation === 'none' || !caption.animation ? 1 : Math.min(1, local / Math.max(.01, caption.animationInDuration ?? .35))
  const exit = caption.animation === 'scroll' || (caption.creatorTitle && caption.animation !== 'none') || caption.animationOutDuration ? Math.min(1, Math.max(0, (caption.duration - local) / Math.max(.01, caption.animationOutDuration ?? .45))) : 1
  const progress = Math.min(1, local / Math.max(0.1, caption.duration))
  return {
    opacity: entrance * exit,
    scale: caption.animation === 'pop' ? 0.7 + entrance * 0.3 : 1,
    shiftY: caption.animation === 'scroll' ? (0.5 - progress) * 320 * renderScale : caption.animation === 'slide' ? (1 - entrance) * 16 * renderScale : 0,
  }
}

export function captionWeight(caption: Caption) {
  if (caption.fontWeight) return caption.fontWeight
  return caption.lyricStyleVersion ? lyricRole(caption) === 'pinyin' ? 500 : lyricRole(caption) === 'vietnamese' ? 600 : 700 : 700
}

function captionStrokeWidth(caption: Caption, renderScale: number) {
  return Number.isFinite(caption.strokeWidth) ? Math.max(0, caption.strokeWidth ?? 0) * renderScale : 0
}

export function drawExportCaption(context: CanvasRenderingContext2D, caption: Caption, timelineTime: number, width: number, height: number, frame?: CaptionFrame) {
  const renderScale = width / ((caption.lyricStyleVersion || caption.creatorStyleId) && height > width ? 1080 : DESIGN_WIDTH)
  const motion = getCaptionMotion(caption, timelineTime, renderScale)
  const lines = lyricDisplayText(caption).split(/\r?\n/)
  const lineHeight = caption.size * (caption.lyricStyleVersion ? 1.12 : 1.08) * renderScale
  const paddingX = caption.creatorTitle ? 0 : 9 * renderScale
  const paddingY = caption.creatorTitle ? 0 : 5 * renderScale
  context.save()
  if (frame?.clipBand) { context.beginPath(); context.rect(0, height * frame.clipBand[0] / 100, width, height * (frame.clipBand[1] - frame.clipBand[0]) / 100); context.clip() }
  context.font = `${captionWeight(caption)} ${caption.size * renderScale}px ${captionFontStack(caption.font)}`
  const tracked = caption.letterSpacing !== undefined
  if (tracked) context.fontKerning = 'none'
  const layouts = tracked ? lines.map(line => cachedTracking(context, line, (caption.letterSpacing ?? 0) * renderScale)) : []
  const textWidths = lines.map((line, index) => tracked ? layouts[index].width : context.measureText(line).width)
  const textWidth = Math.max(1, ...textWidths)
  const textHeight = lineHeight * lines.length
  const centerX = width * caption.x / 100
  const centerY = height * (frame?.y ?? caption.y) / 100
  context.globalAlpha = (frame?.opacity ?? motion.opacity) * (caption.opacity ?? 1)
  context.translate(centerX, centerY + motion.shiftY)
  if (caption.rotation) context.rotate(caption.rotation * Math.PI / 180)
  context.scale(motion.scale * (caption.scale ?? 1) * (frame?.scale ?? 1), motion.scale * (caption.scale ?? 1) * (frame?.scale ?? 1))
  const x = 0
  const y = 0
  const align = caption.textAlign ?? 'center'
  context.textAlign = tracked ? 'left' : align
  context.textBaseline = 'middle'
  const clearShadow = () => { context.shadowColor = 'transparent'; context.shadowBlur = 0; context.shadowOffsetX = 0; context.shadowOffsetY = 0 }
  clearShadow()
  context.fillStyle = caption.background ?? 'transparent'
  if (caption.background) context.fillRect(x - (align === 'left' ? 0 : align === 'right' ? textWidth : textWidth / 2) - paddingX, y - textHeight / 2 - paddingY, textWidth + paddingX * 2, textHeight + paddingY * 2)
  context.fillStyle = caption.color
  const drawLines = (stroke: boolean) => lines.forEach((line, index) => {
    const lineY = y + (index - (lines.length - 1) / 2) * lineHeight
    // DOM aligns multiline text within its widest line, not each line separately.
    const anchorX = align === 'left' ? 0 : align === 'right' ? -textWidth : -textWidth / 2
    const lineX = anchorX + (align === 'left' ? 0 : align === 'right' ? textWidth - textWidths[index] : (textWidth - textWidths[index]) / 2)
    if (tracked) layouts[index].positions.forEach(({ glyph, x: offset }) => stroke ? context.strokeText(glyph, lineX + offset, lineY) : context.fillText(glyph, lineX + offset, lineY))
    else if (stroke) context.strokeText(line, x, lineY)
    else context.fillText(line, x, lineY)
  })
  // Shadow/outline belong behind the opaque letter fill. Drawing them over
  // compound font contours exposes seams inside CJK glyphs and accented text.
  if (caption.shadow !== false) {
    context.shadowColor = 'rgb(0 0 0 / 62%)'; context.shadowBlur = 8 * renderScale; context.shadowOffsetY = 3 * renderScale
    drawLines(false)
    clearShadow()
  }
  const strokeWidth = captionStrokeWidth(caption, renderScale)
  if (strokeWidth) { context.strokeStyle = caption.stroke ?? '#000'; context.lineWidth = strokeWidth; context.lineJoin = 'round'; drawLines(true) }
  drawLines(false)
  context.restore()
}

export function getPreviewCaptionStyle(caption: Caption, timelineTime: number, previewScale: number, aspectRatio: AspectRatio, frame?: CaptionFrame): CSSProperties {
  const renderScale = (caption.lyricStyleVersion || caption.creatorStyleId) && aspectRatio === '9:16' ? previewScale * DESIGN_WIDTH / 1080 : previewScale
  const motion = getCaptionMotion(caption, timelineTime, renderScale)
  const height = previewScale * DESIGN_WIDTH * (aspectRatio === '9:16' ? 16 / 9 : aspectRatio === '16:9' ? 9 / 16 : 1)
  const scrollShift = frame?.y === undefined ? 0 : height * (frame.y - caption.y) / 100
  let clipPath: string | undefined
  if (frame?.clipBand) {
    const boxHeight = (lyricDisplayText(caption).split('\n').length * caption.size * (caption.lyricStyleVersion ? 1.12 : 1.08) + (caption.creatorTitle ? 0 : 10)) * renderScale * (frame.scale ?? 1)
    const top = height * (frame.y ?? caption.y) / 100 - boxHeight / 2
    clipPath = `inset(${Math.max(0, height * frame.clipBand[0] / 100 - top)}px 0 ${Math.max(0, top + boxHeight - height * frame.clipBand[1] / 100)}px 0)`
  }
  return {
    left: `${caption.x}%`,
    // Anchor layout once; per-frame scrolling uses compositor transforms,
    // not top/left layout updates. Canvas uses the same logical frame.y.
    top: `${caption.y}%`,
    clipPath,
    color: caption.color,
    fontFamily: captionFontStack(caption.font),
    fontSize: `${caption.size * renderScale}px`,
    fontWeight: captionWeight(caption),
    letterSpacing: caption.letterSpacing === undefined ? undefined : `${caption.letterSpacing * renderScale}px`,
    fontKerning: caption.letterSpacing === undefined ? undefined : 'none',
    fontVariantLigatures: caption.letterSpacing === undefined ? undefined : 'none',
    textAlign: caption.textAlign ?? 'center',
    lineHeight: caption.lyricStyleVersion ? 1.12 : 1.08,
    padding: caption.creatorTitle ? 0 : `${5 * renderScale}px ${9 * renderScale}px`,
    background: caption.background ?? 'transparent',
    opacity: (frame?.opacity ?? motion.opacity) * (caption.opacity ?? 1),
    transform: `translate3d(${caption.textAlign === 'left' ? '0' : caption.textAlign === 'right' ? '-100%' : '-50%'}, calc(-50% + ${motion.shiftY + scrollShift}px), 0) rotate(${caption.rotation ?? 0}deg) scale(${motion.scale * (caption.scale ?? 1) * (frame?.scale ?? 1)})`,
    transformOrigin: `${caption.textAlign === 'left' ? 'left' : caption.textAlign === 'right' ? 'right' : 'center'} center`,
    textShadow: caption.shadow === false ? 'none' : `0 ${3 * renderScale}px ${8 * renderScale}px rgb(0 0 0 / 62%)`,
    paintOrder: 'stroke fill',
    WebkitTextStroke: `${captionStrokeWidth(caption, renderScale)}px ${caption.stroke ?? '#000'}`,
  }
}
