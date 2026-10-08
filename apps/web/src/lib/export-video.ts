export const EXPORT_BITRATES = ['4', '8', '12', '16', '24', '32'] as const
export type ExportBitrate = typeof EXPORT_BITRATES[number]

export function isExportBitrate(value: unknown): value is ExportBitrate {
  return EXPORT_BITRATES.includes(value as ExportBitrate)
}

export function recommendedExportBitrate(preset: string, fps: 30 | 60): ExportBitrate {
  return preset === '2k' ? fps === 60 ? '32' : '24' : '8'
}

export function recorderVideoBitrate(bitrate: ExportBitrate, intermediary = true) {
  // WebM is an intermediary for MP4 conversion; native MP4 honors the selected bitrate.
  return Math.round(Number(bitrate) * (intermediary ? 1.25 : 1) * 1_000_000)
}

export function chooseRecorderMime(format: 'mp4' | 'webm', hasAudio: boolean, supported: (mime: string) => boolean, is2k = false) {
  const mp4 = hasAudio
    ? is2k ? ['video/mp4;codecs="avc1.640033,mp4a.40.2"', 'video/mp4'] : ['video/mp4;codecs="avc1.640028,mp4a.40.2"', 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4']
    : is2k ? ['video/mp4;codecs="avc1.640033"', 'video/mp4'] : ['video/mp4;codecs="avc1.640028"', 'video/mp4;codecs="avc1.42E01E"', 'video/mp4']
  const webm = hasAudio
    ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
    : ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm']
  return (format === 'mp4' ? [...mp4, ...webm] : webm).find(supported)
}

export function mp4ExportArgs(fps: 30 | 60, bitrate: ExportBitrate, quality: 'standard' | 'high', duration: number) {
  const mbps = Number(bitrate)
  return [
    '-i', 'opencut-input.webm', '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-preset', quality === 'high' ? 'veryfast' : 'ultrafast',
    '-b:v', `${mbps}M`, '-maxrate', `${Math.round(mbps * 1.25)}M`, '-bufsize', `${mbps * 2}M`,
    '-r', String(fps), '-fps_mode', 'cfr', '-g', String(fps * 2),
    '-c:a', 'aac', '-b:a', quality === 'high' ? '256k' : '192k', '-ar', '48000',
    '-af', 'aresample=async=1:first_pts=0', '-t', String(duration),
    '-movflags', '+faststart', 'opencut-output.mp4',
  ]
}
