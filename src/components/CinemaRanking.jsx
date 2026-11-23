import { useState } from 'react'
import Avatar from './Avatar'
import { Spinner } from './Feedback'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { formatLiveTime } from '../lib/format'
import { listCinemaRanking } from '../services/cinema'

const RANK_COLORS = ['var(--star)', 'var(--primary)', 'var(--accent)', 'var(--muted)', 'var(--muted)']
const byTime = () => listCinemaRanking('seconds')
const byPopcorn = () => listCinemaRanking('popcorn_thrown')

/** Ranking do Cine turma: quem mais assistiu sentado no cinema e quem mais jogou pipoca. */
export default function CinemaRanking() {
  const [tab, setTab] = useState('time')
  const time = useAsyncData(byTime, KEYS.cinemaRankingTime)
  const popcorn = useAsyncData(byPopcorn, KEYS.cinemaRankingPopcorn)
  const { data, loading } = tab === 'time' ? time : popcorn

  return (
    <section className="card panel cine-ranking" aria-labelledby="panel-cine-ranking">
      <div className="panel-head">
        <h2 id="panel-cine-ranking">🎬 Ranking do Cine turma</h2>
      </div>
      <div className="home-tabs" role="tablist" aria-label="Tipo de ranking">
        <button type="button" role="tab" aria-selected={tab === 'time'} className={tab === 'time' ? 'is-on' : ''} onClick={() => setTab('time')}>
          Mais assistiu
        </button>
        <button type="button" role="tab" aria-selected={tab === 'popcorn'} className={tab === 'popcorn' ? 'is-on' : ''} onClick={() => setTab('popcorn')}>
          Mais pipoca jogada
        </button>
      </div>
      {loading && !data && <Spinner />}
      {data?.length === 0 && (
        <p className="muted">
          {tab === 'time' ? 'Ninguém assistiu no cinema ainda. Sente numa poltrona com algo no telão!' : 'Ninguém jogou pipoca ainda. Pegue um balde na pipoqueira!'}
        </p>
      )}
      {data?.length > 0 && (
        <ol className="ranking">
          {data.map((row, index) => {
            const name = row.profile?.display_name ?? 'Alguém'
            return (
              <li key={row.user_id}>
                <div className="rank-row is-static">
                  <span className="rank-pos" style={{ color: RANK_COLORS[index] }}>
                    {index + 1}º
                  </span>
                  <Avatar name={name} src={row.profile?.avatar_url} size={44} />
                  <span className="rank-text">
                    <strong>{name}</strong>
                    <span className="muted">
                      🎟️ {row.sessions} {row.sessions === 1 ? 'sessão' : 'sessões'}
                    </span>
                  </span>
                  <strong className="rank-time">{tab === 'time' ? formatLiveTime(row.seconds) : `🍿 ${row.popcorn_thrown}`}</strong>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
