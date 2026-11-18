import Avatar from '../Avatar'

const MEDALS = ['1º', '2º', '3º']

/** Ranking do "Quem é esse Pokémon?". */
export default function PokeRanking({ rows, userId, total }) {
  if (!rows?.length) return <p className="muted">Ninguém jogou ainda. Seja o primeiro no “Quem é esse Pokémon?”!</p>
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="pk-rank">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Pessoa</th>
            <th scope="col" className="num">Pegos</th>
            <th scope="col" className="num">Acertos</th>
            <th scope="col" className="num">Melhor sequência</th>
            <th scope="col" className="num">Na semana</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.user_id} className={r.user_id === userId ? 'is-me' : undefined}>
              <td><span className="pk-medal">{MEDALS[i] ?? `${i + 1}º`}</span></td>
              <td>
                <span className="pk-person">
                  <Avatar name={r.display_name} src={r.avatar_url} size={28} />
                  {r.user_id === userId ? 'Você' : r.display_name}
                </span>
              </td>
              <td className="num"><b>{r.pegos}</b><small className="muted">/{total}</small></td>
              <td className="num">
                {r.acertos}
                <small className="muted"> ({r.tentativas ? Math.round((r.acertos / r.tentativas) * 100) : 0}%)</small>
              </td>
              <td className="num">{r.melhor_sequencia}</td>
              <td className="num">{r.semana}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
