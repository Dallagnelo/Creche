// Contas do evento: quanto cada um gastou, quanto devia gastar e quem paga quem.
// Tudo em centavos (inteiros) para não ter erro de arredondamento.

export const toCents = (value) => Math.round(Number(value) * 100)
export const fromCents = (cents) => cents / 100

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatMoney = (value) => brl.format(Number(value) || 0)

/** Lê "1.234,56", "1234.56", "R$ 45" ... e devolve o número (ou NaN). */
export function parseMoney(text) {
  let clean = String(text ?? '').replace(/[^\d,.-]/g, '')
  if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.')
  return Number(clean)
}

/** Divide `cents` entre `ids` sem perder centavo (os primeiros ficam com 1 centavo a mais). */
function shares(cents, ids) {
  const base = Math.floor(cents / ids.length)
  let rest = cents - base * ids.length
  return ids.map((id) => {
    const extra = rest > 0 ? 1 : 0
    rest -= extra
    return [id, base + extra]
  })
}

/**
 * Saldo de cada pessoa (em centavos): positivo = tem a receber, negativo = deve.
 * expenses: [{ payer_id, amount, split_with: [ids] }], payments: [{ from_id, to_id, amount }]
 */
export function balances(expenses = [], payments = []) {
  const map = new Map()
  const add = (id, cents) => map.set(id, (map.get(id) ?? 0) + cents)
  expenses.forEach((expense) => {
    const cents = toCents(expense.amount)
    const ids = [...new Set(expense.split_with ?? [])].sort()
    if (!ids.length || !cents) return
    add(expense.payer_id, cents)
    shares(cents, ids).forEach(([id, part]) => add(id, -part))
  })
  // pagamento feito: quem pagou diminui a dívida, quem recebeu diminui o crédito
  payments.forEach((payment) => {
    const cents = toCents(payment.amount)
    add(payment.from_id, cents)
    add(payment.to_id, -cents)
  })
  return map
}

/** Menor número de transferências para zerar tudo: [{ from, to, cents }] (maiores primeiro). */
export function settle(balanceMap) {
  const debtors = []
  const creditors = []
  balanceMap.forEach((cents, id) => {
    if (cents < 0) debtors.push({ id, cents: -cents })
    else if (cents > 0) creditors.push({ id, cents })
  })
  debtors.sort((a, b) => b.cents - a.cents || String(a.id).localeCompare(String(b.id)))
  creditors.sort((a, b) => b.cents - a.cents || String(a.id).localeCompare(String(b.id)))
  const out = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].cents, creditors[j].cents)
    if (cents > 0) out.push({ from: debtors[i].id, to: creditors[j].id, cents })
    debtors[i].cents -= cents
    creditors[j].cents -= cents
    if (debtors[i].cents === 0) i += 1
    if (creditors[j].cents === 0) j += 1
  }
  return out
}

/** Resumo para a tela: total, quanto deu por pessoa (média), e o saldo de `me`. */
export function summary(expenses = [], payments = [], me) {
  const totalCents = expenses.reduce((sum, expense) => sum + toCents(expense.amount), 0)
  const people = new Set(expenses.flatMap((expense) => expense.split_with ?? []))
  const map = balances(expenses, payments)
  return {
    total: fromCents(totalCents),
    perPerson: people.size ? fromCents(Math.round(totalCents / people.size)) : 0,
    people: people.size,
    mine: fromCents(map.get(me) ?? 0),
    transfers: settle(map),
  }
}
