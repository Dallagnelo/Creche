import { supabase } from '../lib/supabase'
import { signImagePaths, uploadImage, removeImage } from './storage'

// Contas dos eventos (tabelas event_expenses, event_payments e pix_keys; veja supabase/migracao-contas.sql).

const missing = (error) => error?.code === 'PGRST205' || error?.code === '42P01'
const MISSING_TEXT = 'A divisão de contas ainda não existe no banco. Rode o arquivo migracao-contas.sql no SQL Editor do Supabase.'

// Um gasto/pagamento pertence a um evento OU a um racha avulso (página Ferramentas).
// `owner` é { eventId } ou { groupId }.
const ownerCol = (owner) => (owner.groupId ? 'group_id' : 'event_id')
const ownerId = (owner) => owner.groupId ?? owner.eventId
const ownerRow = (owner) => ({ [ownerCol(owner)]: ownerId(owner) })

export async function listMoney(owner) {
  const [expenses, payments, pix] = await Promise.all([
    supabase.from('event_expenses').select('*').eq(ownerCol(owner), ownerId(owner)).order('created_at'),
    supabase.from('event_payments').select('*').eq(ownerCol(owner), ownerId(owner)).order('created_at'),
    supabase.from('pix_keys').select('user_id, pix_key'),
  ])
  const error = expenses.error || payments.error || pix.error
  if (error) throw missing(error) ? new Error(MISSING_TEXT) : error
  const paths = expenses.data.map((item) => item.receipt_path).filter(Boolean)
  const urls = paths.length ? await signImagePaths(paths).catch(() => ({})) : {}
  return {
    expenses: expenses.data.map((item) => ({ ...item, receiptUrl: item.receipt_path ? urls[item.receipt_path] ?? null : null })),
    payments: payments.data,
    pix: Object.fromEntries(pix.data.map((row) => [row.user_id, row.pix_key])),
  }
}

export async function saveExpense({ id, owner, userId, values, receiptFile }) {
  let receiptPath = values.receipt_path ?? null
  if (receiptFile) receiptPath = await uploadImage(receiptFile, userId, 'receipts')
  const row = {
    ...ownerRow(owner),
    payer_id: values.payer_id,
    description: values.description.trim(),
    place: values.place?.trim() || null,
    amount: values.amount,
    spent_on: values.spent_on || null,
    split_with: values.split_with,
    items: values.items ?? [],
    receipt_path: receiptPath,
  }
  const query = id ? supabase.from('event_expenses').update(row).eq('id', id) : supabase.from('event_expenses').insert(row)
  const { error } = await query
  if (error) {
    if (receiptFile && receiptPath) removeImage(receiptPath)
    throw missing(error) ? new Error(MISSING_TEXT) : error
  }
}

export async function deleteExpense(expense) {
  const { data, error } = await supabase.from('event_expenses').delete().eq('id', expense.id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Só quem lançou, quem pagou ou o admin pode apagar esse gasto.')
  if (expense.receipt_path) removeImage(expense.receipt_path)
}

export async function markPaid({ owner, fromId, toId, amount }) {
  const { error } = await supabase.from('event_payments').insert({ ...ownerRow(owner), from_id: fromId, to_id: toId, amount })
  if (error) throw error
}

export async function unmarkPaid(paymentId) {
  const { error } = await supabase.from('event_payments').delete().eq('id', paymentId)
  if (error) throw error
}

export async function savePixKey(userId, key) {
  const clean = key.trim()
  const { error } = clean
    ? await supabase.from('pix_keys').upsert({ user_id: userId, pix_key: clean, updated_at: new Date().toISOString() })
    : await supabase.from('pix_keys').delete().eq('user_id', userId)
  if (error) throw missing(error) ? new Error(MISSING_TEXT) : error
}

export async function remindDebt({ owner, toId, amount, creditorId }) {
  const { data, error } = await supabase.rpc('remind_debt', { p_event: ownerId(owner), p_to: toId, p_amount: amount, p_creditor: creditorId })
  if (error) throw error
  return data
}

/** Reduz a foto para JPEG (até 1600 px) e devolve só o base64, para mandar para a IA. */
async function toJpegBase64(file) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não consegui abrir essa foto.')
  })
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

/** Manda a foto para a função read-receipt (IA) e devolve { place, description, total, date, items, readable }. */
export async function readReceipt(file) {
  const image = await toJpegBase64(file)
  const { data, error } = await supabase.functions.invoke('read-receipt', { body: { image, mediaType: 'image/jpeg' } })
  if (error) {
    let message = 'Não consegui ler o comprovante. Preencha à mão.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      if (/not found|404/i.test(String(error.message))) message = 'A leitura de comprovantes ainda não foi configurada (função read-receipt).'
    }
    throw new Error(message)
  }
  return data
}

// ---------- Rachas avulsos (Ferramentas → Divisão de contas) ----------

const GROUPS_MISSING = 'Os rachas ainda não existem no banco. Rode de novo o arquivo migracao-contas.sql no SQL Editor do Supabase.'

/** Rachas que eu vejo + eventos que têm gastos, com totais já calculados. */
export async function listSplits() {
  const [groups, expenses, payments] = await Promise.all([
    supabase.from('bill_groups').select('*').order('created_at', { ascending: false }),
    supabase.from('event_expenses').select('id, event_id, group_id, payer_id, amount, split_with, created_at'),
    supabase.from('event_payments').select('id, event_id, group_id, from_id, to_id, amount'),
  ])
  const error = groups.error || expenses.error || payments.error
  if (error) throw missing(error) || error.code === '42703' ? new Error(GROUPS_MISSING) : error
  const eventIds = [...new Set(expenses.data.map((e) => e.event_id).filter(Boolean))]
  let events = []
  if (eventIds.length) {
    const res = await supabase.from('events').select('id, title, event_date').in('id', eventIds)
    if (res.error) throw res.error
    events = res.data
  }
  const pick = (rows, key, id) => rows.filter((row) => row[key] === id)
  return {
    groups: groups.data.map((g) => ({ ...g, expenses: pick(expenses.data, 'group_id', g.id), payments: pick(payments.data, 'group_id', g.id) })),
    events: events
      .map((ev) => ({ ...ev, expenses: pick(expenses.data, 'event_id', ev.id), payments: pick(payments.data, 'event_id', ev.id) }))
      .sort((a, b) => (a.event_date < b.event_date ? 1 : -1)),
  }
}

export async function saveBillGroup({ id, title, members }) {
  const row = { title: title.trim(), members }
  const { data, error } = id
    ? await supabase.from('bill_groups').update(row).eq('id', id).select().single()
    : await supabase.from('bill_groups').insert(row).select().single()
  if (error) throw missing(error) ? new Error(GROUPS_MISSING) : error
  return data
}

export async function deleteBillGroup(id) {
  const { data, error } = await supabase.from('bill_groups').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Só quem criou o racha (ou o admin) pode apagar.')
}
