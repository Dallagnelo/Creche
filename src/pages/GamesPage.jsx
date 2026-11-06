import { useMemo, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import GameCard from '../components/GameCard'
import GameForm from '../components/GameForm'
import GameModal from '../components/GameModal'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { countBy } from '../lib/stats'
import { deleteGame, listGames } from '../services/games'

export default function GamesPage() {
  const { user } = useAuth()
  const { data: games, loading, error, reload } = useAsyncData(listGames)
  const [actionError, setActionError] = useState(null)

  // Guardamos só o ID do jogo aberto e procuramos na lista atual (some sozinho se ele for apagado).
  const [selectedId, setSelectedId] = useState(null)
  const selected = games?.find((game) => game.id === selectedId) ?? null

  // Quantos jogos existem em cada plataforma.
  const platforms = useMemo(() => countBy(games ?? [], (game) => game.platform || 'Sem plataforma'), [games])

  async function handleDelete(game) {
    if (!window.confirm(`Apagar "${game.name}" da lista?`)) return
    setActionError(null)
    try {
      await deleteGame(game)
      setSelectedId(null)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Jogos</h1>
          <p className="muted">
            {games ? `${games.length} ${games.length === 1 ? 'jogo na lista' : 'jogos na lista'}` : 'Carregando...'}
          </p>
        </div>
        <a className="btn btn-primary page-head-action" href="#novo-jogo">
          Novo jogo
        </a>
      </div>

      <div className="split">
        <div className="stack">
          {actionError && <ErrorBox error={actionError} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !games && <Spinner />}

          {games && games.length === 0 && (
            <EmptyState icon="🎮" title="Nenhum jogo ainda">
              Adicione os jogos que a turma joga.
            </EmptyState>
          )}

          <div className="grid game-grid">
            {games?.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isOwner={game.added_by === user.id}
                onOpen={(item) => setSelectedId(item.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>

        <aside className="side">
          <div id="novo-jogo">
            <GameForm onCreated={reload} />
          </div>

          {platforms.length > 0 && (
            <section className="card panel" aria-labelledby="panel-platforms">
              <div className="panel-head">
                <h2 id="panel-platforms">Por plataforma</h2>
              </div>
              <ul className="bars">
                {platforms.map((item) => (
                  <li key={item.label}>
                    <div className="bar-row">
                      <span className="bar-label">{item.label}</span>
                      <span className="muted">{item.count}</span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${(item.count / platforms[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {selected && (
        <GameModal
          game={selected}
          isOwner={selected.added_by === user.id}
          onClose={() => setSelectedId(null)}
          onDelete={handleDelete}
        />
      )}
    </section>
  )
}
