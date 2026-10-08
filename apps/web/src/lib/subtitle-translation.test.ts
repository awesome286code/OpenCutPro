import assert from 'node:assert/strict'
import test from 'node:test'
import { auditTranslation, canAutoApplyTranslation, compactTranslationBatch, parseTranslations, revisionMessages, translateWithOllama, translationBatches, translationIsComplete, translationMessages, translationReviewIssues, translationSchema, translationSourceSignature, visibleTranslationRows, type TranslationOptions, type TranslationRow, type TranslationSource } from './subtitle-translation.ts'

const options: TranslationOptions = { engine: 'contextual', style: 'natural', notes: 'Người con nhớ quê.', songTitle: '北方' }
const sources: TranslationSource[] = ['你知道嗎', '走得越遠', '才越知道什麼叫故鄉'].map((text, i) => ({ id: `line-${i}`, text, start: i * 2, duration: 2, sourceClipId: 'audio-a' }))
const rows = sources.map((source, i) => ({ id: source.id, text: ['Bạn biết không?', 'Càng đi xa', 'Càng hiểu thế nào là quê hương'][i], needsReview: false, reason: '' }))
const batch = translationBatches(sources)[0]
const json = (translations = rows) => JSON.stringify({ translations })
const wireJson = (translations = rows) => json(translations.map((row, i) => ({ ...row, id: `s${i + 1}` })))

test('Tự thêm Việt sub chỉ khi đủ câu, không có cảnh báo và người dùng bật lựa chọn', () => {
  assert.equal(canAutoApplyTranslation(sources, rows, { ...options, autoApply: true }), true)
  assert.equal(canAutoApplyTranslation(sources, rows, options), false)
  assert.equal(canAutoApplyTranslation(sources, rows.slice(1), { ...options, autoApply: true }), false)
  assert.equal(canAutoApplyTranslation(sources, [{ ...rows[0], text: ' ' }, ...rows.slice(1)], { ...options, autoApply: true }), false)
  assert.equal(canAutoApplyTranslation(sources, [{ ...rows[0], needsReview: true, reviewed: true }, ...rows.slice(1)], { ...options, autoApply: true }), false)
})

test('Việt sub có bản dịch hiện cùng Pinyin dù nhóm chưa đủ hoặc có cảnh báo; bỏ câu rỗng/placeholder', () => {
  const partial = [{ ...rows[0], needsReview: true, reason: 'Nghe lại lời hát' }, { ...rows[1], text: '[Cần kiểm tra lời gốc]' }, { ...rows[2], text: ' ' }]
  assert.deepEqual(visibleTranslationRows(sources, partial).map(row => row.id), [sources[0].id])
  assert.deepEqual(visibleTranslationRows(sources, [partial[0]]).map(row => row.id), [sources[0].id])
  assert.deepEqual(visibleTranslationRows(sources, [{ ...rows[0], id: 'foreign' }]), [])
})

test('ID ngắn giảm token nhưng khôi phục đúng ID timeline kể cả AI đảo thứ tự', () => {
  const long = { ...batch, lines: batch.lines.map(line => ({ ...line, id: `intelligence-${'x'.repeat(90)}-${line.id}` })) }
  const wire = compactTranslationBatch(long)
  assert.deepEqual(wire.batch.lines.map(line => line.id), ['s1', 's2', 's3'])
  assert.equal(wire.batch.context, batch.context)
  assert.deepEqual(wire.restore(wireJson()), rows.map((row, i) => ({ ...row, id: long.lines[i].id })))
  const reversed = rows.map((row, i) => ({ ...row, id: `s${i + 1}` })).reverse()
  assert.deepEqual(wire.restore(json(reversed)).map(row => row.id), long.lines.map(line => line.id))
  assert.throws(() => wire.restore(json()), /không khớp ID/)
})

test('Nhóm tối đa 8 câu, giữ ngữ cảnh cả bài và không trộn audio', () => {
  const all = Array.from({ length: 19 }, (_, i) => ({ ...sources[0], id: `a-${i}`, start: i, text: `第${i}句` }))
  const batches = translationBatches([...all, { ...sources[0], id: 'b', sourceClipId: 'audio-b', text: '另一首歌' }])
  assert.deepEqual(batches.map(item => item.lines.length), [8, 8, 3, 1])
  assert.ok(batches[0].context.includes('第18句'))
  assert.ok(!batches[0].context.includes('另一首歌'))
  assert.equal(batches[3].context, '另一首歌')
  assert.deepEqual(translationBatches([...sources].reverse())[0].lines.map(line => line.id), sources.map(line => line.id))
})

test('Nguồn và JSON phải đủ câu, ID duy nhất, không chấp nhận bản dịch trống', () => {
  assert.throws(() => translationBatches([]))
  assert.throws(() => translationBatches([sources[0], sources[0]]))
  assert.throws(() => translationBatches([{ ...sources[0], duration: NaN }]))
  assert.deepEqual(parseTranslations(json([...rows].reverse()), batch), rows)
  for (const invalid of [rows.slice(1), [rows[0], rows[0], rows[2]], [{ ...rows[0], id: 'other' }, ...rows.slice(1)], [{ ...rows[0], text: ' ' }, ...rows.slice(1)]]) assert.throws(() => parseTranslations(json(invalid), batch))
  assert.throws(() => parseTranslations('not-json', batch))
})

test('Bài dài luôn giữ câu đang dịch và câu lân cận trong cửa sổ ngữ cảnh', () => {
  const long = Array.from({ length: 15 }, (_, i) => ({ ...sources[0], id: `long-${i}`, start: i, text: `${i}:` + '长'.repeat(800) }))
  const chunks = translationBatches(long)
  for (const item of chunks) {
    assert.equal(item.scope, 'nearby-lines')
    assert.ok(item.context.length <= 3500)
    assert.ok(item.context.includes(item.lines[0].text))
  }
  assert.ok(chunks[10].context.includes(long[9].text))
  assert.ok(chunks[10].context.includes(long[11].text))
})

test('Prompt dùng ngữ cảnh, giọng văn, ghi chú và bảo vệ chủ thể; revision đối chiếu bản nháp', () => {
  const messages = translationMessages(batch, { ...options, style: 'lyrical' })
  assert.match(messages[0].content, /không thêm hình ảnh/i)
  assert.match(messages[0].content, /không phải lệnh/i)
  const input = JSON.parse(messages[1].content)
  assert.equal(input.editorialNotes, options.notes)
  assert.ok(input.wholeSongContext.includes('故鄉'))
  assert.match(revisionMessages(batch, options, rows)[0].content, /BIÊN TẬP CUỐI/)
  assert.equal(translationSchema(batch).properties.translations.minItems, 3)
})

test('Đánh dấu nghĩa sai, xưng hô cổ trang, ASR lặp và nguồn không rõ', () => {
  assert.match(auditTranslation('故鄉', 'cố nhân'), /quê hương/)
  assert.match(auditTranslation('你知道嗎', 'Ngươi biết đấy'), /cổ trang/)
  assert.match(auditTranslation('你知道嗎', 'Người ta biết không'), /chủ thể/)
  assert.match(auditTranslation('我都我都我都我都', 'tôi'), /lặp/)
  assert.equal(auditTranslation('走得越遠', 'Càng đi xa'), '')
  const flagged = parseTranslations(json([{ ...rows[0], text: 'Ngươi biết đấy' }, ...rows.slice(1)]), batch)
  assert.equal(flagged[0].needsReview, true)
  assert.equal(translationReviewIssues(flagged).length, 1)
  assert.equal(translationReviewIssues(flagged.map(row => ({ ...row, reviewed: true }))).length, 0)
  assert.equal(translationReviewIssues([{ ...rows[0], text: '[Cần kiểm tra lời gốc]', reviewed: true }]).length, 1)
  assert.equal(translationReviewIssues([{ ...rows[0], text: ' ' }]).length, 1)
})

test('Dịch hai lượt local, không đổi thứ tự/thời gian và không xoá cảnh báo nguồn', async () => {
  const calls: Array<{ url: string; body?: Record<string, any> }> = []
  const before = structuredClone(sources)
  const fetcher = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body })
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }] })
    return Response.json({ message: { content: wireJson(body.messages[0].content.includes('BIÊN TẬP CUỐI') ? rows : [{ ...rows[0], needsReview: true, reason: 'Ngôi kể chưa rõ.' }, ...rows.slice(1)]) } })
  }) as typeof fetch
  const result = await translateWithOllama(sources, options, () => {}, new AbortController().signal, fetcher)
  assert.equal(calls.length, 3)
  assert.ok(calls.every(call => call.url.startsWith('http://127.0.0.1:11434/')))
  assert.equal(calls[1].body?.think, false)
  assert.equal(calls[2].body?.think, false)
  assert.equal(calls[1].body?.options.num_ctx, 4096)
  assert.deepEqual(calls[1].body?.format.properties.translations.items.properties.id.enum, ['s1', 's2', 's3'])
  assert.match(calls[2].body?.messages[0].content, /BIÊN TẬP CUỐI/)
  assert.deepEqual(result.map(row => row.id), sources.map(source => source.id))
  assert.equal(result[0].needsReview, true)
  assert.match(result[0].reason, /Ngôi kể/)
  assert.deepEqual(sources, before)
})

test('Đổi font/vị trí không làm bản dịch hết hạn; đổi lời, thời gian hoặc audio thì có', () => {
  const signature = translationSourceSignature(sources)
  assert.equal(translationSourceSignature(sources.map(source => ({ ...source, font: 'Inter', size: 72, x: 10 }))), signature)
  for (const patch of [{ text: '你知道吗?' }, { start: 1 }, { duration: 9 }, { sourceClipId: 'other' }]) assert.notEqual(translationSourceSignature([{ ...sources[0], ...patch }, ...sources.slice(1)]), signature)
  assert.equal(translationIsComplete(sources, rows), true)
  assert.equal(translationIsComplete(sources, rows.slice(1)), false)
  assert.equal(translationIsComplete(sources, [rows[0], rows[0], rows[2]]), false)
  assert.equal(translationIsComplete(sources, [{ ...rows[0], id: 'other' }, ...rows.slice(1)]), false)
})

test('Giữ nhóm hoàn chỉnh khi nhóm sau lỗi và chỉ dịch tiếp các câu còn thiếu', async () => {
  const all = Array.from({ length: 17 }, (_, i) => ({ ...sources[0], id: `resume-${i}`, text: `我想家${i}`, start: i }))
  let checkpoint: TranslationRow[] = []
  let chats = 0
  const fetcher = (async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }] })
    chats++
    if (chats === 3) throw new TypeError('disconnect')
    const body = JSON.parse(String(init!.body))
    const input = JSON.parse(body.messages[1].content)
    return Response.json({ message: { content: JSON.stringify({ translations: input.linesToTranslate.map((line: { id: string }) => ({ id: line.id, text: 'Tôi nhớ nhà', needsReview: false, reason: '' })) }) } })
  }) as typeof fetch
  await assert.rejects(translateWithOllama(all, options, () => {}, new AbortController().signal, fetcher, { onCheckpoint: rows => { checkpoint = rows } }), /Các nhóm đã dịch vẫn được giữ/)
  assert.equal(checkpoint.length, 8)
  checkpoint[0] = { ...checkpoint[0], text: 'Tôi nhớ quê nhà', reviewed: true }
  const resumedTexts: string[] = []
  const resumeFetcher = (async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }] })
    const input = JSON.parse(JSON.parse(String(init!.body)).messages[1].content)
    assert.match(input.wholeSongContext, /我想家0/)
    if (input.linesToTranslate[0].source === '我想家8') assert.ok(input.establishedPhrasing.some((row: { translation: string }) => row.translation === 'Tôi nhớ quê nhà'))
    resumedTexts.push(...input.linesToTranslate.map((line: { source: string }) => line.source))
    return Response.json({ message: { content: JSON.stringify({ translations: input.linesToTranslate.map((line: { id: string }) => ({ id: line.id, text: 'Tôi nhớ nhà', needsReview: false, reason: '' })) }) } })
  }) as typeof fetch
  const result = await translateWithOllama(all, options, () => {}, new AbortController().signal, resumeFetcher, { completed: checkpoint })
  assert.equal(result.length, 17)
  assert.deepEqual(result[0], checkpoint[0])
  assert.deepEqual([...new Set(resumedTexts)], all.slice(8).map(source => source.text))
  assert.deepEqual(result.map(row => row.id), all.map(source => source.id))
})

test('Huỷ sau checkpoint giữ câu đã dịch; bản nháp đủ không gọi model, ID lạ bị chặn', async () => {
  const all = Array.from({ length: 9 }, (_, i) => ({ ...sources[0], id: `cancel-${i}`, start: i }))
  const controller = new AbortController()
  let saved: TranslationRow[] = []
  let chats = 0
  const fetcher = (async (url: string, init?: RequestInit) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }] })
    chats++
    const input = JSON.parse(JSON.parse(String(init!.body)).messages[1].content)
    return Response.json({ message: { content: JSON.stringify({ translations: input.linesToTranslate.map((line: { id: string }) => ({ id: line.id, text: 'Bạn biết không?', needsReview: false, reason: '' })) }) } })
  }) as typeof fetch
  await assert.rejects(translateWithOllama(all, options, () => {}, controller.signal, fetcher, { onCheckpoint: rows => { saved = rows; controller.abort() } }), { name: 'AbortError' })
  assert.equal(saved.length, 8)
  assert.equal(chats, 2)
  const noFetch = (async () => { throw Error('Không được gọi model') }) as typeof fetch
  assert.deepEqual(await translateWithOllama(sources, options, () => {}, new AbortController().signal, noFetch, { completed: [...rows].reverse() }), rows)
  await assert.rejects(translateWithOllama(sources, options, () => {}, new AbortController().signal, noFetch, { completed: [{ ...rows[0], id: 'unknown' }] }), /không khớp lời gốc/)
})

test('Retry JSON không hợp lệ; không âm thầm fallback hoặc trả kết quả nửa bài', async () => {
  let requests = 0
  const fetcher = (async (url: string) => {
    if (url.endsWith('/api/tags')) return Response.json({ models: [{ name: 'qwen3:8b' }] })
    requests++
    return Response.json({ message: { content: requests === 1 ? '{}' : wireJson() } })
  }) as typeof fetch
  assert.equal((await translateWithOllama(sources, options, () => {}, new AbortController().signal, fetcher)).length, 3)
  assert.equal(requests, 3)
  await assert.rejects(translateWithOllama(sources, options, () => {}, new AbortController().signal, (async () => Response.json({ models: [] })) as typeof fetch), /Không tự tải/)
  await assert.rejects(translateWithOllama(sources, options, () => {}, new AbortController().signal, (async () => { throw new TypeError('offline') }) as typeof fetch), /Không kết nối/)
})

test('Huỷ tác vụ không tiếp tục gọi model hoặc ghi đè timeline', async () => {
  const controller = new AbortController()
  let chats = 0
  const fetcher = (async () => { controller.abort(); return Response.json({ models: [{ name: 'qwen3:8b' }] }) }) as typeof fetch
  await assert.rejects(translateWithOllama(sources, options, () => { chats++ }, controller.signal, fetcher), { name: 'AbortError' })
  assert.equal(chats, 1)
})
