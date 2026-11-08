import Avatar from './Avatar'
import { Spinner } from './Feedback'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatLiveTime } from '../lib/format'
import { listLiveRanking } from '../services/liveTime'

const RANK_COLORS = ['var(--star)', 'var(--primary)', 'var(--accent)', 'var(--muted)', 'var(--muted)']

/** Mural de quem mais ficou ao vivo (tempo total). Só é montado quando ninguém está transmitindo. */
export default function LiveRanking() {
  const { data, loading } = useAsyncData(listLiveRanking)

  return (
    <section className="card panel" aria-labelledby="panel-live-ranking">
      <div className="panel-head">
        <h2 id="panel-live-ranking">Quem mais transmitiu</h2>
      </div>
      {loading && !data && <Spinner />}
      {data?.length === 0 && <p className="muted">Ninguém transmitiu ainda. Seja o primeiro!</p>}
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
                    <span className="muted">tempo ao vivo</span>
                  </span>
                  <strong className="rank-time">{formatLiveTime(row.seconds)}</strong>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
