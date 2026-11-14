import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useVisibleInterval } from '../hooks/useVisibleInterval'
import { usePhone } from '../hooks/useMediaQuery'
import { KEYS } from '../lib/dataCache'
import { isPollDue, isPollOpen, msLeft, tally } from '../lib/polls'
import { castVote, finalizeDuePolls, listPolls, removeVote } from '../services/polls'
import { listProfiles } from '../services/profiles'
import { ErrorBox } from './Feedback'
import FormModal from './FormModal'
import Icon from './Icon'
import { Clock, Poster, Tag } from './PollBits'
import PollDetail from './PollDetail'
import SheetTop from './SheetTop'

const MAX_CARDS = 2

// Votações que a pessoa tirou da Início sem votar (lembrado neste aparelho). Continuam na página Votações.
const dismissKey = (userId) => `votacoes-dispensadas:${userId}`
function readDismissed(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(dismissKey(userId)) ?? '[]'))
  } catch {
    return new Set()
  }
}


/**
 * Cartões da Início: uma votação aberta em que a pessoa ainda NÃO votou.
 * Clicar abre a votação aqui mesmo (sem trocar de página). Depois de votar, o cartão sai da Início.
 */
export default function HomePolls() {
  const { user } = useAuth()
  const phone = usePhone()
  const { data: polls, reload } = useAsyncData(listPolls, KEYS.polls)
  const { data: profiles } = useAsyncData(listProfiles, KEYS.profiles)
  const [now, setNow] = useState(() => new Date())
  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dismissed, setDismissed] = useState(() => readDismissed(user.id))

  const pending = (polls ?? []).filter(
    (poll) => isPollOpen(poll, now) && !poll.votes.some((vote) => vote.user_id === user.id) && !dismissed.has(poll.id),
  )
  const visible = pending.slice(0, MAX_CARDS)
  const hasTimer = pending.some((poll) => poll.closes_at)

  // Cronômetro na tela: só gira enquanto há cartão com prazo ou a janela está aberta.
  useEffect(() => {
    if (!hasTimer && !openId) return undefined
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [hasTimer, openId])

  // Votos dos outros e encerramentos: confere o banco de tempos em tempos.
  const settle = useCallback(async () => {
    if ((await finalizeDuePolls()) > 0) reload()
  }, [reload])
  useEffect(() => {
    settle()
  }, [settle])
  // A cada 60 s e só com a aba visível (aba em segundo plano não gasta requisições).
  useVisibleInterval(reload, 60000)
  // Quando o prazo de alguma acaba, encerra na hora (o banco também encerra sozinho a cada minuto).
  const dueCount = (polls ?? []).filter((poll) => isPollDue(poll, now)).length
  useEffect(() => {
    if (dueCount > 0) settle()
  }, [dueCount, settle])

  function dismiss(pollId) {
    const next = new Set(dismissed)
    next.add(pollId)
    // guarda só as votações que ainda existem (a lista não cresce para sempre)
    const alive = new Set((polls ?? []).map((poll) => poll.id))
    const kept = [...next].filter((id) => alive.has(id))
    try {
      localStorage.setItem(dismissKey(user.id), JSON.stringify(kept))
    } catch {
      /* sem localStorage: some só até recarregar */
    }
    setDismissed(next)
  }

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const selected = polls?.find((poll) => poll.id === openId) ?? null
  if (!visible.length && !selected) return null
  const members = profiles?.length ?? 0

  const detail = selected && (
    <PollDetail
      key={selected.id}
      poll={selected}
      userId={user.id}
      now={now}
      busy={busy}
      canManage={false}
      onVote={(optionId) => run(() => castVote({ pollId: selected.id, userId: user.id, optionId }))}
      onUnvote={() => run(() => removeVote({ pollId: selected.id, userId: user.id }))}
      onCloseNow={() => {}}
      onDelete={() => {}}
    />
  )

  return (
    <section className="hp-polls" aria-label="Votações abertas">
      {visible.map((poll) => {
        const { total } = tally(poll)
        const left = msLeft(poll, now)
        const posters = poll.options.slice(0, 4)
        const percent = members ? Math.min(100, Math.round((total / members) * 100)) : 0
        return (
          <article key={poll.id} className="hp-card" onClick={() => setOpenId(poll.id)}>
            <button
              type="button"
              className="hp-dismiss"
              aria-label={`Tirar a votação "${poll.title}" da Início`}
              title="Tirar da Início (continua em Votações)"
              onClick={(event) => {
                event.stopPropagation()
                dismiss(poll.id)
              }}
            >
              <Icon name="close" />
            </button>
            <span className="hp-top">
              <Tag icon="vote" tone="mint">VOTAÇÃO ABERTA</Tag>
            </span>
            <span className="hp-fan" aria-hidden="true">
              {posters.map((option, index) => (
                <span key={option.id} className="hp-fan-card" style={{ '--i': index - (posters.length - 1) / 2 }}>
                  <Poster movie={option.movie} size="w185" />
                </span>
              ))}
            </span>
            <span className="hp-info">
              <b>{poll.title}</b>
              <span className="muted">
                {poll.options.length} {poll.options.length === 1 ? 'filme' : 'filmes'} · aberta por {poll.creator?.display_name ?? 'alguém'}
              </span>
              <span className="hp-progress" aria-label={members ? `${total} de ${members} votaram` : `${total} votos`}>
                <span className="hp-progress-bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="hp-count">{members ? `${total} de ${members} votaram` : `${total} ${total === 1 ? 'voto' : 'votos'}`}</span>
              </span>
            </span>
            {left != null ? (
              <span className="hp-clock"><Clock ms={left} small /></span>
            ) : (
              <span className="hp-clock hp-noclock"><Icon name="clock" /> Sem prazo para acabar</span>
            )}
            <span className="hp-actions">
              <button type="button" className="btn btn-primary hp-cta" aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setOpenId(poll.id) }}>
                Votar agora
              </button>
              <button
                type="button"
                className="btn btn-ghost hp-later"
                onClick={(event) => {
                  event.stopPropagation()
                  dismiss(poll.id)
                }}
              >
                Agora não
              </button>
            </span>
          </article>
        )
      })}
      {pending.length > MAX_CARDS && (
        <Link to="/votacoes" className="hp-more">
          <Icon name="vote" /> Mais {pending.length - MAX_CARDS} {pending.length - MAX_CARDS === 1 ? 'votação aberta' : 'votações abertas'} ›
        </Link>
      )}
      {error && !selected && <ErrorBox error={error} />}

      {selected && (
        <FormModal label="Votação" className={`poll-vote-modal${phone ? ' sheet-modal pl-sheet' : ''}`} onClose={() => setOpenId(null)}>
          {phone ? (
            <>
              <SheetTop title="Votação" onClose={() => setOpenId(null)} />
              <div className="sheet-body">
                {error && <ErrorBox error={error} />}
                {detail}
              </div>
            </>
          ) : (
            <>
              <button type="button" className="hp-close" aria-label="Fechar" onClick={() => setOpenId(null)}>
                <Icon name="close" />
              </button>
              {error && <ErrorBox error={error} />}
              {detail}
            </>
          )}
        </FormModal>
      )}
    </section>
  )
}
