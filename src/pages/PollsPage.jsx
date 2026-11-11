import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import { Clock, Poster, Tag } from '../components/PollBits'
import PollDetail from '../components/PollDetail'
import PollForm from '../components/PollForm'
import SheetTop from '../components/SheetTop'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePhone } from '../hooks/useMediaQuery'
import { KEYS } from '../lib/dataCache'
import { isPollDue, isPollOpen, msLeft, tally } from '../lib/polls'
import { castVote, closePoll, deletePoll, finalizeDuePolls, listPolls, removeVote } from '../services/polls'

function PollCard({ poll, now, selected, onSelect }) {
  const open = isPollOpen(poll, now)
  const left = msLeft(poll, now)
  const { total } = tally(poll)
  const posters = poll.options.slice(0, 4)
  return (
    <button type="button" className={`pl-item${selected ? ' is-selected' : ''}`} aria-current={selected} onClick={() => onSelect(poll.id)}>
      <span className="pl-item-top">
        <b>{poll.title}</b>
        {poll.status === 'closed' ? (
          <Tag icon="check" tone="muted">Encerrada</Tag>
        ) : isPollDue(poll, now) ? (
          <Tag icon="clock" tone="pink">Encerrando…</Tag>
        ) : left == null ? (
          <Tag icon="clock" tone="mint">Sem prazo</Tag>
        ) : null}
      </span>
      {open && left != null && <Clock ms={left} small />}
      <span className="pl-fan" aria-hidden="true">
        {posters.map((option, index) => (
          <span key={option.id} className="pl-fan-card" style={{ '--i': index - (posters.length - 1) / 2 }}>
            <Poster movie={option.movie} size="w185" />
          </span>
        ))}
      </span>
      <span className="pl-item-foot">
        <span>
          {poll.options.length} filmes · {total} {total === 1 ? 'voto' : 'votos'}
        </span>
        <span className="pl-go">Entrar ›</span>
      </span>
    </button>
  )
}

export default function PollsPage() {
  const { user, isAdmin } = useAuth()
  const phone = usePhone()
  const { data: polls, loading, error, reload } = useAsyncData(listPolls, KEYS.polls)
  const [now, setNow] = useState(() => new Date())
  const [tab, setTab] = useState('open')
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Encerra o que já passou do prazo (cria os eventos) e atualiza a lista.
  const settle = useCallback(async () => {
    const closed = await finalizeDuePolls()
    if (closed > 0) reload()
  }, [reload])
  useEffect(() => {
    settle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Relógio: a cada segundo (para o cronômetro) e, a cada 30 s, confere o banco (votos dos outros e encerramentos).
  const hasTimer = polls?.some((poll) => poll.status === 'open' && poll.closes_at)
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), hasTimer ? 1000 : 30000)
    return () => clearInterval(tick)
  }, [hasTimer])
  useEffect(() => {
    const sync = setInterval(() => {
      settle()
      reload()
    }, 30000)
    return () => clearInterval(sync)
  }, [settle, reload])
  // Quando o prazo de alguma acaba, encerra na hora (sem esperar os 30 s).
  const dueCount = polls?.filter((poll) => isPollDue(poll, now)).length ?? 0
  useEffect(() => {
    if (dueCount > 0) settle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueCount])

  const open = useMemo(() => polls?.filter((poll) => poll.status === 'open') ?? [], [polls])
  const closed = useMemo(() => polls?.filter((poll) => poll.status === 'closed') ?? [], [polls])
  const list = tab === 'open' ? open : closed
  const selected = polls?.find((poll) => poll.id === selectedId) ?? null

  // No computador sempre tem uma votação aberta ao lado.
  useEffect(() => {
    if (phone || !polls) return
    if (!selected || (selected.status === 'open') !== (tab === 'open')) setSelectedId(list[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, polls, tab])

  async function run(action) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleVote = (poll, optionId) => run(() => castVote({ pollId: poll.id, userId: user.id, optionId }))
  const handleUnvote = (poll) => run(() => removeVote({ pollId: poll.id, userId: user.id }))
  const handleCloseNow = (poll) => {
    if (!window.confirm(`Encerrar agora a votação "${poll.title}"?`)) return
    run(() => closePoll(poll.id))
  }
  const handleDelete = (poll) => {
    if (!window.confirm(`Apagar a votação "${poll.title}"?`)) return
    setSelectedId(null)
    run(() => deletePoll(poll.id))
  }

  const detail = selected && (
    <PollDetail
      key={selected.id}
      poll={selected}
      userId={user.id}
      now={now}
      busy={busy}
      canManage={selected.created_by === user.id || isAdmin}
      onVote={(optionId) => handleVote(selected, optionId)}
      onUnvote={() => handleUnvote(selected)}
      onCloseNow={handleCloseNow}
      onDelete={handleDelete}
    />
  )

  return (
    <section className="stack polls-page">
      <div className="page-head">
        <div>
          <h1>Votações</h1>
        </div>
        <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setShowForm(true)}>
          Nova votação
        </button>
      </div>

      {showForm && (
        <FormModal label="Nova votação" className="poll-modal" onClose={() => setShowForm(false)}>
          <PollForm
            onCancel={() => setShowForm(false)}
            onCreated={async (id) => {
              setShowForm(false)
              setTab('open')
              await reload()
              setSelectedId(id)
            }}
          />
        </FormModal>
      )}

      {error && <ErrorBox error={error} onRetry={reload} />}
      {actionError && <ErrorBox error={actionError} />}
      {loading && !polls && <Spinner />}

      {polls && (
        <div className="pl-layout">
          <div className="pl-side">
            <div className="pl-tabs" role="group" aria-label="Filtrar votações">
              <button type="button" className={`pl-tab${tab === 'open' ? ' is-on' : ''}`} aria-pressed={tab === 'open'} onClick={() => setTab('open')}>
                Abertas{open.length ? ` (${open.length})` : ''}
              </button>
              <button type="button" className={`pl-tab${tab === 'closed' ? ' is-on' : ''}`} aria-pressed={tab === 'closed'} onClick={() => setTab('closed')}>
                Encerradas{closed.length ? ` (${closed.length})` : ''}
              </button>
            </div>
            {list.length === 0 && (
              <EmptyState icon="🗳️" title={tab === 'open' ? 'Nenhuma votação aberta' : 'Nenhuma votação encerrada'}>
                {tab === 'open' ? 'Crie a primeira: escolha os filmes e deixe a turma decidir.' : 'Quando uma votação acabar, ela aparece aqui.'}
              </EmptyState>
            )}
            {list.map((poll) => (
              <PollCard key={poll.id} poll={poll} now={now} selected={!phone && poll.id === selectedId} onSelect={setSelectedId} />
            ))}
          </div>

          {!phone && <div className="pl-panel">{detail ?? <p className="muted pl-empty">Escolha uma votação ao lado.</p>}</div>}
        </div>
      )}

      {phone && selected && (
        <FormModal label="Votação" className="sheet-modal pl-sheet" onClose={() => setSelectedId(null)}>
          <SheetTop title="Votação" onClose={() => setSelectedId(null)} />
          <div className="sheet-body">{detail}</div>
        </FormModal>
      )}
    </section>
  )
}
