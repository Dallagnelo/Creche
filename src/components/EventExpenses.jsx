import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { formatMoney, fromCents, parseMoney, summary, toCents } from '../lib/split'
import { listProfiles } from '../services/profiles'
import { deleteExpense, listEventMoney, markPaid, readReceipt, remindDebt, savePixKey, saveExpense, unmarkPaid } from '../services/expenses'
import Avatar from './Avatar'
import { ErrorBox, Spinner } from './Feedback'
import FormModal from './FormModal'
import Icon from './Icon'

const firstName = (name) => (name ?? 'Alguém').split(' ')[0]

/** Chips de pessoas (um ou vários). */
function PeoplePick({ people, value, onChange, multi }) {
  const selected = new Set(multi ? value : [value])
  return (
    <div className="xp-chips">
      {people.map((person) => {
        const on = selected.has(person.id)
        return (
          <button
            key={person.id}
            type="button"
            className={`xp-chip${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => {
              if (!multi) return onChange(person.id)
              const next = new Set(selected)
              if (on) next.delete(person.id)
              else next.add(person.id)
              onChange([...next])
            }}
          >
            <Avatar name={person.display_name} src={person.avatar_url} size={22} />
            {firstName(person.display_name)}
          </button>
        )
      })}
    </div>
  )
}

/** Janela de lançar/editar um gasto, com leitura do comprovante por IA. */
function ExpenseForm({ event, expense, people, defaultSplit, onClose, onSaved }) {
  const { user } = useAuth()
  const [values, setValues] = useState(() => ({
    description: expense?.description ?? '',
    place: expense?.place ?? '',
    amountText: expense ? String(expense.amount).replace('.', ',') : '',
    spent_on: expense?.spent_on ?? '',
    payer_id: expense?.payer_id ?? user.id,
    split_with: expense?.split_with ?? defaultSplit,
    items: expense?.items ?? [],
    receipt_path: expense?.receipt_path ?? null,
  }))
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(expense?.receiptUrl ?? null)
  const [reading, setReading] = useState(false)
  const [readInfo, setReadInfo] = useState(null) // campos que a IA preencheu
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => () => file && URL.revokeObjectURL(preview), [file, preview])

  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  async function pickFile(event) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    setError('')
    setReading(true)
    try {
      const data = await readReceipt(picked)
      if (!data?.readable) {
        setError('Não parece um comprovante (ou está ilegível). Preencha à mão ou tente outra foto.')
        return
      }
      const filled = {}
      setValues((current) => {
        const next = { ...current }
        if (data.total) {
          next.amountText = data.total.toFixed(2).replace('.', ',')
          filled.amount = true
        }
        if (data.place && !current.place) {
          next.place = data.place
          filled.place = true
        }
        if (data.description && !current.description) {
          next.description = data.description
          filled.description = true
        }
        if (data.date) {
          next.spent_on = data.date
          filled.date = true
        }
        if (data.items?.length) next.items = data.items
        return next
      })
      setReadInfo(filled)
    } catch (err) {
      setError(err.message)
    } finally {
      setReading(false)
    }
  }

  async function submit(formEvent) {
    formEvent.preventDefault()
    const amount = parseMoney(values.amountText)
    if (!values.description.trim()) return setError('Escreva o que foi comprado.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Coloque um valor válido (ex.: 45,90).')
    if (!values.split_with.length) return setError('Escolha entre quem dividir.')
    setSaving(true)
    setError('')
    try {
      await saveExpense({
        id: expense?.id,
        eventId: event.id,
        userId: user.id,
        values: { ...values, amount: Math.round(amount * 100) / 100 },
        receiptFile: file,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const amount = parseMoney(values.amountText)
  const each = Number.isFinite(amount) && amount > 0 && values.split_with.length ? fromCents(Math.ceil(toCents(amount) / values.split_with.length)) : null
  const lido = (key) => readInfo?.[key] && <span className="xp-ai">LIDO</span>

  return (
    <FormModal label={expense ? 'Editar gasto' : 'Novo gasto'} onClose={onClose} className="xp-modal">
      <form className="xp-form" onSubmit={submit}>
        <div className="xp-form-head">
          <h2>{expense ? 'Editar gasto' : 'Novo gasto'}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className={`xp-scan${preview ? ' has-photo' : ''}`}>
          {preview ? (
            <span className="xp-photo">
              <img src={preview} alt="Comprovante" />
              {reading && <span className="xp-scanline" aria-hidden="true" />}
            </span>
          ) : null}
          <div className="xp-scan-text">
            <b>📷 Ler comprovante com IA</b>
            <small className="muted">Tire foto da nota, do cupom ou do print do Pix: o valor, o local, a data e os itens são preenchidos sozinhos.</small>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
            <button type="button" className="btn btn-pink" onClick={() => fileRef.current?.click()} disabled={reading}>
              {reading ? 'Lendo o comprovante...' : preview ? 'Trocar foto' : 'Tirar / escolher foto'}
            </button>
          </div>
        </div>

        <label className="xp-field">
          <span>O que foi {lido('description')}</span>
          <input value={values.description} maxLength={80} placeholder="Carne e carvão" onChange={(e) => set('description', e.target.value)} />
        </label>
        <div className="xp-row">
          <label className="xp-field">
            <span>Valor (R$) {lido('amount')}</span>
            <input inputMode="decimal" value={values.amountText} placeholder="160,00" onChange={(e) => set('amountText', e.target.value)} className={readInfo?.amount ? 'is-ai' : ''} />
          </label>
          <label className="xp-field">
            <span>Onde {lido('place')}</span>
            <input value={values.place} maxLength={80} placeholder="Atacadão" onChange={(e) => set('place', e.target.value)} />
          </label>
          <label className="xp-field">
            <span>Data {lido('date')}</span>
            <input type="date" value={values.spent_on} onChange={(e) => set('spent_on', e.target.value)} />
          </label>
        </div>

        {values.items.length > 0 && (
          <details className="xp-items">
            <summary>
              {values.items.length} {values.items.length === 1 ? 'item encontrado' : 'itens encontrados'} no comprovante
            </summary>
            <ul>
              {values.items.map((item, index) => (
                <li key={index}>
                  <span>{item.name}</span>
                  <b>{item.price ? formatMoney(item.price) : ''}</b>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="xp-field">
          <span>Quem pagou</span>
          <PeoplePick people={people} value={values.payer_id} onChange={(id) => set('payer_id', id)} />
        </div>
        <div className="xp-field">
          <span>
            Dividir entre ({values.split_with.length}){each != null && <b className="xp-each"> · {formatMoney(each)} cada</b>}
          </span>
          <PeoplePick people={people} value={values.split_with} onChange={(ids) => set('split_with', ids)} multi />
          <div className="xp-quick">
            <button type="button" className="xp-link" onClick={() => set('split_with', defaultSplit)}>
              Quem vai no evento
            </button>
            <button type="button" className="xp-link" onClick={() => set('split_with', people.map((person) => person.id))}>
              Todo mundo
            </button>
          </div>
        </div>

        {error && <p className="xp-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={saving || reading}>
            {saving ? 'Salvando...' : 'Salvar gasto'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}

/** Aba "💸 Contas" da janela do evento. */
export default function EventExpenses({ event }) {
  const { user, isAdmin } = useAuth()
  const { data: profiles } = useAsyncData(listProfiles, KEYS.profiles)
  const [money, setMoney] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [form, setForm] = useState(null) // { expense } | { expense: null }
  const [pixDraft, setPixDraft] = useState(null)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      setMoney(await listEventMoney(event.id))
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    }
  }, [event.id])
  useEffect(() => {
    load()
  }, [load])

  const byId = useMemo(() => new Map((profiles ?? []).map((person) => [person.id, person])), [profiles])
  const attendees = event.attendees.map((item) => item.user_id)
  // quem aparece para escolher: primeiro quem vai, depois o resto da turma
  const people = useMemo(() => {
    const list = profiles ?? []
    const going = new Set(attendees)
    return [...list.filter((p) => going.has(p.id)), ...list.filter((p) => !going.has(p.id))]
  }, [profiles, attendees.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const defaultSplit = attendees.length ? attendees : [user.id]

  if (loadError) return <ErrorBox error={loadError} onRetry={load} />
  if (!money || !profiles) return <Spinner />

  const sum = summary(money.expenses, money.payments, user.id)
  const name = (id) => firstName(byId.get(id)?.display_name)
  const person = (id) => byId.get(id) ?? { display_name: 'Alguém' }
  const flash = (text) => {
    setToast(text)
    setTimeout(() => setToast(''), 2500)
  }

  async function run(action, done) {
    setActionError(null)
    try {
      await action()
      if (done) flash(done)
      await load()
    } catch (err) {
      setActionError(err)
    }
  }

  const myPix = money.pix[user.id] ?? ''
  // lembretes: quem recebe avisa quem deve (o adm pode avisar todo mundo)
  const remindable = sum.transfers.filter((t) => t.to === user.id || isAdmin)

  return (
    <div className="xp">
      <div className="xp-totals">
        <div>
          <small>Total gasto</small>
          <b>{formatMoney(sum.total)}</b>
        </div>
        <div>
          <small>Média por pessoa</small>
          <b>{formatMoney(sum.perPerson)}</b>
        </div>
        <div className={sum.mine > 0 ? 'is-plus' : sum.mine < 0 ? 'is-minus' : ''}>
          <small>Você</small>
          <b>{sum.mine > 0 ? `recebe ${formatMoney(sum.mine)}` : sum.mine < 0 ? `deve ${formatMoney(-sum.mine)}` : 'tudo certo ✓'}</b>
        </div>
      </div>

      {actionError && <ErrorBox error={actionError} />}

      <div className="xp-head">
        <h3>Gastos</h3>
        <button type="button" className="btn btn-pink" onClick={() => setForm({ expense: null })}>
          📷 Lançar gasto
        </button>
      </div>
      {money.expenses.length === 0 ? (
        <p className="muted xp-empty">Nenhum gasto ainda. Lance o primeiro (dá para tirar foto do comprovante que a IA preenche).</p>
      ) : (
        <ul className="xp-list">
          {money.expenses.map((expense) => {
            const canEdit = expense.created_by === user.id || expense.payer_id === user.id || isAdmin
            const outside = people.length - expense.split_with.length
            return (
              <li key={expense.id}>
                {expense.receiptUrl ? (
                  <a className="xp-thumb" href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" title="Ver comprovante">
                    <img src={expense.receiptUrl} alt="" loading="lazy" />
                  </a>
                ) : (
                  <span className="xp-thumb is-empty" aria-hidden="true">
                    <Icon name="calendar" />
                  </span>
                )}
                <span className="xp-text">
                  <b>
                    {expense.description}
                    {expense.place ? ` · ${expense.place}` : ''}
                  </b>
                  <small className="muted">
                    pago por {name(expense.payer_id)} · dividido entre {expense.split_with.length}
                    {outside > 0 && expense.split_with.length <= 4 ? ` (${expense.split_with.map(name).join(', ')})` : ''}
                  </small>
                </span>
                <b className="xp-amount">{formatMoney(expense.amount)}</b>
                {canEdit && (
                  <span className="xp-actions">
                    <button type="button" className="xp-icon" title="Editar" aria-label="Editar gasto" onClick={() => setForm({ expense })}>
                      ✎
                    </button>
                    <button
                      type="button"
                      className="xp-icon"
                      title="Apagar"
                      aria-label="Apagar gasto"
                      onClick={() => window.confirm(`Apagar "${expense.description}" (${formatMoney(expense.amount)})?`) && run(() => deleteExpense(expense))}
                    >
                      <Icon name="trash" />
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {money.expenses.length > 0 && (
        <>
          <div className="xp-head">
            <h3>Quem paga quem</h3>
            {remindable.length > 0 && (
              <button
                type="button"
                className="xp-link"
                onClick={() =>
                  run(
                    () => Promise.all(remindable.map((t) => remindDebt({ eventId: event.id, toId: t.from, amount: fromCents(t.cents), creditorId: t.to }))),
                    remindable.length === 1 ? 'Lembrete enviado no sininho 🔔' : `${remindable.length} lembretes enviados no sininho 🔔`,
                  )
                }
              >
                🔔 Mandar no sininho
              </button>
            )}
          </div>
          {sum.transfers.length === 0 ? (
            <p className="xp-done">🎉 Tudo acertado! Ninguém deve nada.</p>
          ) : (
            <ul className="xp-settle">
              {sum.transfers.map((t) => {
                const amount = fromCents(t.cents)
                const pix = money.pix[t.to]
                const involved = t.from === user.id || t.to === user.id || isAdmin
                return (
                  <li key={`${t.from}-${t.to}`} className={t.from === user.id ? 'is-me' : ''}>
                    <span className="xp-who">
                      <Avatar name={person(t.from).display_name} src={person(t.from).avatar_url} size={26} />
                      <b>{name(t.from)}</b>
                      <span className="muted">→</span>
                      <Avatar name={person(t.to).display_name} src={person(t.to).avatar_url} size={26} />
                      <b>{name(t.to)}</b>
                    </span>
                    <b className="xp-amount">{formatMoney(amount)}</b>
                    <span className="xp-settle-actions">
                      {pix && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          title={`Chave Pix de ${name(t.to)}: ${pix}`}
                          onClick={() => navigator.clipboard?.writeText(pix).then(() => flash(`Chave Pix de ${name(t.to)} copiada!`), () => flash(pix))}
                        >
                          Copiar Pix
                        </button>
                      )}
                      {involved && (
                        <button type="button" className="btn btn-primary" onClick={() => run(() => markPaid({ eventId: event.id, fromId: t.from, toId: t.to, amount }), 'Pagamento marcado ✓')}>
                          ✓ Pago
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {money.payments.length > 0 && (
        <details className="xp-paid">
          <summary>Pagamentos já feitos ({money.payments.length})</summary>
          <ul>
            {money.payments.map((payment) => (
              <li key={payment.id}>
                <span>
                  {name(payment.from_id)} pagou {formatMoney(payment.amount)} para {name(payment.to_id)}
                </span>
                {(payment.from_id === user.id || payment.to_id === user.id || isAdmin) && (
                  <button type="button" className="xp-link" onClick={() => run(() => unmarkPaid(payment.id))}>
                    desfazer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="xp-pix">
        <span>
          <b>Sua chave Pix</b>
          <small className="muted">Aparece para quem te deve (botão "Copiar Pix").</small>
        </span>
        {pixDraft === null ? (
          <>
            <code>{myPix || 'não cadastrada'}</code>
            <button type="button" className="btn btn-ghost" onClick={() => setPixDraft(myPix)}>
              {myPix ? 'Trocar' : 'Cadastrar'}
            </button>
          </>
        ) : (
          <form
            className="xp-pix-form"
            onSubmit={(e) => {
              e.preventDefault()
              run(() => savePixKey(user.id, pixDraft), 'Chave Pix salva').then(() => setPixDraft(null))
            }}
          >
            <input value={pixDraft} maxLength={120} placeholder="e-mail, celular, CPF ou chave aleatória" onChange={(e) => setPixDraft(e.target.value)} autoFocus />
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPixDraft(null)}>
              Cancelar
            </button>
          </form>
        )}
      </div>

      {toast && (
        <p className="xp-toast" role="status">
          {toast}
        </p>
      )}

      {form &&
        createPortal(
        <ExpenseForm
          event={event}
          expense={form.expense}
          people={people}
          defaultSplit={defaultSplit}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            flash('Gasto salvo ✓')
            load()
          }}
        />,
        document.body,
      )}
    </div>
  )
}
