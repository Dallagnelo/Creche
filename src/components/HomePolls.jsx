import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { usePhone } from '../hooks/useMediaQuery'
import { KEYS } from '../lib/dataCache'
import { isPollOpen, msLeft, tally } from '../lib/polls'
import { castVote, finalizeDuePolls, listPolls, removeVote } from '../services/polls'
import { listProfiles } from '../services/profiles'
import { ErrorBox } from './Feedback'
import FormModal from './FormModal'
import Icon from './Icon'
import { Clock, Poster, Tag } from './PollBits'
import PollDetail from './PollDetail'
import SheetTop from './SheetTop'

const MAX_CARDS = 2


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

  const pending = (polls ?? []).filter((poll) => isPollOpen(poll, now) && !poll.votes.some((vote) => vote.user_id === user.id))
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
    const id = setInterval(() => {
      settle()
      reload()
    }, 30000)
    return () => clearInterval(id)
  }, [settle, reload])

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
        return (
          <button key={poll.id} type="button" className="hp-card" aria-haspopup="dialog" onClick={() => setOpenId(poll.id)}>
            <span className="hp-top">
              <Tag icon="vote" tone="mint">VOTAÇÃO ABERTA</Tag>
              <span className="hp-count">{members ? `${total} de ${members} votaram` : `${total} ${total === 1 ? 'voto' : 'votos'}`}</span>
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
                {poll.options.length} filmes · aberta por {poll.creator?.display_name ?? 'alguém'}
              </span>
            </span>
            {left != null ? (
              <span className="hp-clock"><Clock ms={left} small /></span>
            ) : (
              <span className="hp-clock"><Tag icon="clock" tone="mint">Sem prazo</Tag></span>
            )}
            <span className="btn btn-primary hp-cta">Votar agora</span>
          </button>
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
