import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '../components/Avatar'
import BillSplit, { PeoplePick } from '../components/BillSplit'
import { ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import Icon from '../components/Icon'
import SheetTop from '../components/SheetTop'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { longDate } from '../lib/events'
import { formatMoney, summary } from '../lib/split'
import { listProfiles } from '../services/profiles'
import { ToolHeader } from './ToolsLayout'
import { deleteBillGroup, listSplits, saveBillGroup } from '../services/expenses'

/** Criar / editar um racha: nome + quem participa. */
function GroupForm({ group, people, onClose, onSaved }) {
  const { user } = useAuth()
  const [title, setTitle] = useState(group?.title ?? '')
  const [members, setMembers] = useState(group?.members ?? [user.id])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Dê um nome para o racha.')
    if (!members.length) return setError('Escolha quem participa.')
    setSaving(true)
    setError('')
    try {
      onSaved(await saveBillGroup({ id: group?.id, title, members }))
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <FormModal label={group ? 'Editar racha' : 'Novo racha'} onClose={onClose} className="xp-modal">
      <form className="xp-form" onSubmit={submit}>
        <div className="xp-form-head">
          <h2>{group ? 'Editar racha' : 'Novo racha'}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <label className="xp-field">
          <span>Nome</span>
          <input value={title} maxLength={60} placeholder="Bar de sexta, Uber da volta, Viagem pra praia..." onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <div className="xp-field">
          <span>Quem participa ({members.length})</span>
          <PeoplePick people={people} value={members} onChange={setMembers} multi />
          <small className="muted">Só quem está no racha (e o adm) consegue ver.</small>
        </div>
        {error && <p className="xp-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : group ? 'Salvar' : 'Criar racha'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}

/** Cartão de um racha ou de um evento com contas. */
function SplitCard({ title, sub, faces, item, me, onOpen }) {
  const sum = summary(item.expenses, item.payments, me)
  const settled = item.expenses.length > 0 && sum.transfers.length === 0
  return (
    <button type="button" className="card split-card" onClick={onOpen}>
      <span className="split-top">
        <b>{title}</b>
        <small className="muted">{sub}</small>
      </span>
      {faces && (
        <span className="split-faces" aria-hidden="true">
          {faces.slice(0, 6).map((p) => (
            <Avatar key={p.id} name={p.display_name} src={p.avatar_url} size={24} />
          ))}
          {faces.length > 6 && <small className="muted">+{faces.length - 6}</small>}
        </span>
      )}
      <span className="split-bottom">
        <span>
          <small className="muted">Total</small>
          <b>{formatMoney(sum.total)}</b>
        </span>
        <span className={`split-me ${sum.mine > 0 ? 'is-plus' : sum.mine < 0 ? 'is-minus' : ''}`}>
          {settled ? '✓ acertado' : sum.mine > 0 ? `recebe ${formatMoney(sum.mine)}` : sum.mine < 0 ? `deve ${formatMoney(-sum.mine)}` : item.expenses.length ? 'você está quite' : 'sem gastos'}
        </span>
      </span>
    </button>
  )
}

export default function SplitsPage() {
  const { user, isAdmin } = useAuth()
  const { data: profiles } = useAsyncData(listProfiles, KEYS.profiles)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null) // { kind: 'group'|'event', id }
  const [form, setForm] = useState(null) // { group } (null = novo)

  const load = useCallback(async () => {
    try {
      setData(await listSplits())
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const byId = useMemo(() => new Map((profiles ?? []).map((p) => [p.id, p])), [profiles])
  const faces = (ids) => ids.map((id) => byId.get(id)).filter(Boolean)

  const current = open && data ? (open.kind === 'group' ? data.groups : data.events).find((item) => item.id === open.id) : null
  const close = () => {
    setOpen(null)
    load()
  }

  async function remove(group) {
    if (!window.confirm(`Apagar o racha "${group.title}" e todos os gastos dele?`)) return
    try {
      await deleteBillGroup(group.id)
      close()
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <div className="tool-body">
      <ToolHeader slug="contas">
        <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setForm({ group: null })}>
          + Novo racha
        </button>
      </ToolHeader>

      {error && <ErrorBox error={error} onRetry={load} />}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <h3 className="split-h">Seus rachas</h3>
          {data.groups.length === 0 ? (
            <div className="split-empty">
              <ol className="split-steps">
                <li>
                  <span aria-hidden="true">👥</span>
                  <b>Crie um racha</b>
                  <small className="muted">Dê um nome (bar de sexta, viagem...) e escolha quem participa.</small>
                </li>
                <li>
                  <span aria-hidden="true">📷</span>
                  <b>Lance os gastos</b>
                  <small className="muted">Digite ou tire foto do comprovante: a IA preenche valor, local e itens.</small>
                </li>
                <li>
                  <span aria-hidden="true">🤝</span>
                  <b>Acerte as contas</b>
                  <small className="muted">O site calcula quem paga quem, com Pix e aviso no sininho.</small>
                </li>
              </ol>
              <button type="button" className="btn btn-primary" onClick={() => setForm({ group: null })}>
                Criar o primeiro racha
              </button>
            </div>
          ) : (
            <div className="split-grid">
              {data.groups.map((group) => (
                <SplitCard
                  key={group.id}
                  title={group.title}
                  sub={`${group.members.length} ${group.members.length === 1 ? 'pessoa' : 'pessoas'} · ${group.expenses.length} ${group.expenses.length === 1 ? 'gasto' : 'gastos'}`}
                  faces={faces(group.members)}
                  item={group}
                  me={user.id}
                  onOpen={() => setOpen({ kind: 'group', id: group.id })}
                />
              ))}
            </div>
          )}

          {data.events.length > 0 && (
            <>
              <h3 className="split-h">Contas de eventos</h3>
              <div className="split-grid">
                {data.events.map((ev) => (
                  <SplitCard
                    key={ev.id}
                    title={ev.title}
                    sub={`${longDate(ev.event_date)} · ${ev.expenses.length} ${ev.expenses.length === 1 ? 'gasto' : 'gastos'}`}
                    item={ev}
                    me={user.id}
                    onOpen={() => setOpen({ kind: 'event', id: ev.id })}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {current && profiles && (
        <FormModal label={current.title} onClose={close} className="sheet-modal split-modal">
          <SheetTop title={current.title} onClose={close} />
          <div className="split-modal-head desk-only-block">
            <div>
              <small className="muted">{open.kind === 'group' ? 'Racha' : 'Evento'}</small>
              <h2>{current.title}</h2>
            </div>
            <button type="button" className="btn btn-ghost" onClick={close}>
              Fechar
            </button>
          </div>
          <div className="sheet-body xp-body">
            {open.kind === 'group' && (
              <div className="split-members">
                <span className="split-faces">
                  {faces(current.members).map((p) => (
                    <Avatar key={p.id} name={p.display_name} src={p.avatar_url} size={26} />
                  ))}
                </span>
                {(current.created_by === user.id || isAdmin) && (
                  <span className="split-manage">
                    <button type="button" className="btn btn-ghost" onClick={() => setForm({ group: current })}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => remove(current)}>
                      <Icon name="trash" /> Apagar
                    </button>
                  </span>
                )}
              </div>
            )}
            <BillSplit
              owner={open.kind === 'group' ? { groupId: current.id } : { eventId: current.id }}
              defaultPeople={open.kind === 'group' ? current.members : [...new Set(current.expenses.flatMap((e) => e.split_with))]}
            />
          </div>
        </FormModal>
      )}

      {form && profiles && (
        <GroupForm
          group={form.group}
          people={profiles}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setForm(null)
            load().then(() => setOpen({ kind: 'group', id: saved.id }))
          }}
        />
      )}
    </div>
  )
}
