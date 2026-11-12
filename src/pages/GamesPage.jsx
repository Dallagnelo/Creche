import { useMemo, useState } from 'react'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import GameCard from '../components/GameCard'
import GameForm from '../components/GameForm'
import FormModal from '../components/FormModal'
import GameModal from '../components/GameModal'
import GameRatingModal from '../components/GameRatingModal'
import ListSearch from '../components/ListSearch'
import { usePhone } from '../hooks/useMediaQuery'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchesQuery } from '../lib/search'
import { countBy } from '../lib/stats'
import { deleteGame, listGames, updateGame } from '../services/games'
import { KEYS } from '../lib/dataCache'

export default function GamesPage() {
  const { user, isAdmin } = useAuth()
  const { data: games, loading, error, reload } = useAsyncData(listGames, KEYS.games)
  const { settings } = useSettings()
  const asModal = settings.modalForms
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Guardamos só o ID do jogo aberto e procuramos na lista atual (some sozinho se ele for apagado).
  const [selectedId, setSelectedId] = useState(null)
  const selected = games?.find((game) => game.id === selectedId) ?? null
  const [rating, setRating] = useState(null)
  const ratingGame = games?.find((game) => game.id === rating?.gameId) ?? null

  // Quantos jogos existem em cada plataforma.
  const [filter, setFilter] = useState('')
  const phone = usePhone()
  const visible = useMemo(
    () =>
      (games ?? []).filter((game) => matchesQuery(filter, game.name, game.platform)),
    [games, filter]
  )
  const platforms = useMemo(() => countBy(games ?? [], (game) => game.platform || 'Sem plataforma'), [games])

  const showPlatforms = settings.showStats && platforms.length > 0
  const showSide = !asModal || showPlatforms

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
        </div>
        {asModal ? (
          <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setShowForm(true)}>
            Adicionar Jogo
          </button>
        ) : (
          <a className="btn btn-primary page-head-action" href="#novo-jogo">
            Novo jogo
          </a>
        )}
      </div>

      <div className={showSide ? 'split' : undefined}>
        <div className="stack">
          {actionError && <ErrorBox error={actionError} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !games && <Spinner />}

          {games && games.length === 0 && (
            <EmptyState icon="🎮" title="Nenhum jogo ainda">
              Adicione os jogos que a turma joga.
            </EmptyState>
          )}

          {games?.length > 0 && (
            <ListSearch
              value={filter}
              onChange={setFilter}
              label="Pesquisar nos jogos da lista"
              placeholder={phone ? 'Pesquisar nos jogos' : 'Pesquisar jogo da lista (nome ou plataforma)'}
            />
          )}
          {games?.length > 0 && visible.length === 0 && (
            <p className="muted list-empty">Nenhum jogo encontrado para “{filter.trim()}”.</p>
          )}

          {visible.length > 0 && (
            <ul className="movie-grid game-poster-grid">
              {visible.map((game) => (
                <li key={game.id}>
                  <GameCard game={game} onOpen={(item) => setSelectedId(item.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {showSide && (
        <aside className="side">
          {!asModal && (
            <div id="novo-jogo">
              <GameForm onCreated={reload} />
            </div>
          )}

          {showPlatforms && (
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
        )}
      </div>

      {asModal && showForm && (
        <FormModal label="Novo jogo" onClose={() => setShowForm(false)}>
          <GameForm
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false)
              reload()
            }}
          />
        </FormModal>
      )}

      {selected && (
        <GameModal
          game={selected}
          isOwner={selected.added_by === user.id || isAdmin}
          onClose={() => !rating && setSelectedId(null)}
          onDelete={handleDelete}
          onRate={(game, existing) => setRating({ gameId: game.id, existing })}
          onEdit={async (game, values) => {
            await updateGame({ game, ...values })
            await reload()
          }}
        />
      )}

      {rating && ratingGame && (
        <GameRatingModal
          game={ratingGame}
          existing={rating.existing}
          onClose={() => setRating(null)}
          onSaved={() => {
            setRating(null)
            reload()
          }}
        />
      )}
    </section>
  )
}
