export const STICKER_PRESETS = [
  { id: 'star', name: 'Pop Star', color: '#f9d76b', path: 'M512 70 615 354 914 365 678 548 765 835 512 668 259 835 346 548 110 365 409 354Z' },
  { id: 'heart', name: 'Love Note', color: '#ff79a7', path: 'M512 853 166 522C-2 353 208 101 404 236l108 94 108-94C816 101 1026 353 858 522Z' },
  { id: 'bolt', name: 'Electric', color: '#c5f36b', path: 'M574 82 236 548h236l-48 394 366-515H540Z' },
  { id: 'sparkle', name: 'Shine', color: '#c8b6ff', path: 'M512 75c54 270 91 307 361 361-270 54-307 91-361 361-54-270-91-307-361-361 270-54 307-91 361-361Z' },
  { id: 'arrow', name: 'Motion Arrow', color: '#79d8f4', path: 'M94 415h537V239l309 273-309 273V609H94Z' },
  { id: 'flower', name: 'Bloom', color: '#ffad83', path: 'M512 204c109-178 293-76 215 105 183-72 280 122 100 221 180 105 79 293-111 219-105 180-293 79-215-101-183 72-280-122-100-221-180-105-79-293 111-223Z' },
  { id: 'moon', name: 'Moonlight', color: '#d5caff', path: 'M686 92C468 164 369 325 393 502c24 178 164 295 342 309-71 72-169 111-272 101C243 894 98 715 112 495 126 273 301 107 523 92c55-4 110-4 163 0Z' },
  { id: 'crown', name: 'Royal', color: '#f6cf76', path: 'M112 334 323 507 512 193l189 314 211-173-91 477H203Z' },
  { id: 'diamond', name: 'Prism', color: '#90eddf', path: 'M264 199h496l170 247-418 435L94 446Zm54 62L196 438l316 329 316-329-122-177Z' },
  { id: 'bubble', name: 'Speak', color: '#ffb1c8', path: 'M512 143c230 0 416 143 416 320S742 783 512 783c-43 0-84-5-123-15L189 883l46-192C149 633 96 552 96 463c0-177 186-320 416-320Z' },
  { id: 'note', name: 'Music Note', color: '#99a9ff', path: 'M620 151 873 97v482c0 136-115 220-238 211-105-8-158-113-94-190 44-54 132-71 212-53V324l-213 45v329c0 137-116 219-239 210-104-8-157-112-94-190 45-55 132-72 213-53V196Z' },
  { id: 'sun', name: 'Sunrise', color: '#ffbd73', path: 'M512 220a292 292 0 1 0 0 584 292 292 0 0 0 0-584Zm0-152 44 101h-88Zm0 888-44-101h88ZM68 512l101-44v88Zm888 0-101 44v-88ZM166 166l103 40-63 63Zm692 692-103-40 63-63ZM858 166l-40 103-63-63ZM166 858l40-103 63 63Z' },
] as const

export type StickerId = typeof STICKER_PRESETS[number]['id']

export function stickerSvg(id: StickerId) {
  const preset = STICKER_PRESETS.find(item => item.id === id)
  if (!preset) throw new Error('Sticker không tồn tại.')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><path d="${preset.path}" fill="#0e1016" stroke="#0e1016" stroke-width="64" stroke-linejoin="round" transform="translate(8 14)" opacity=".4"/><path d="${preset.path}" fill="${preset.color}" stroke="#fffaf2" stroke-width="35" stroke-linejoin="round"/><path d="${preset.path}" fill="none" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" opacity=".45" transform="translate(-8 -10)"/></svg>`
}
