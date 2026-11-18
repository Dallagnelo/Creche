import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FreeGames from '../components/FreeGames'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import GameCard from '../components/GameCard'
import GameForm from '../components/GameForm'
import FormModal from '../components/FormModal'
import GameModal from '../components/GameModal'
import GameRatingModal from '../components/GameRatingModal'
import ListSearch from '../components/ListSearch'
import ListSort, { useListSort } from '../components/ListSort'
import { usePhone } from '../hooks/useMediaQuery'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchesQuery } from '../lib/search'
import { sortList } from '../lib/listSort'
import { countBy } from '../lib/stats'
import { deleteGame, listGames } from '../services/games'
import { KEYS } from '../lib/dataCache'

export default function GamesPage() {
  const { user, isAdmin } = useAuth()
  const { data: games, loading, error, reload } = useAsyncData(listGames, KEYS.games)
  const { settings } = useSettings()
  const asModal = settings.modalForms
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState(null)
  // abas: a lista da turma e os jogos grátis das lojas (?aba=gratis, usado também pelo aviso no celular)
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') === 'gratis' ? 'gratis' : 'lista'
  const setTab = (next) => setParams(next === 'gratis' ? { aba: 'gratis' } : {}, { replace: true })

  // Guardamos só o ID do jogo aberto e procuramos na lista atual (some sozinho se ele for apagado).
  const [selectedId, setSelectedId] = useState(null)
  const selected = games?.find((game) => game.id === selectedId) ?? null
  const [rating, setRating] = useState(null)
  const ratingGame = games?.find((game) => game.id === rating?.gameId) ?? null

  // Quantos jogos existem em cada plataforma.
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useListSort('jogos')
  const phone = usePhone()
  const visible = useMemo(
    () => sortList((games ?? []).filter((game) => matchesQuery(filter, game.name, game.platform)), sort, user?.id),
    [games, filter, sort, user?.id]
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
        {tab === 'gratis' ? null : asModal ? (
          <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setShowForm(true)}>
            Adicionar Jogo
          </button>
        ) : (
          <a className="btn btn-primary page-head-action" href="#novo-jogo">
            Novo jogo
          </a>
        )}
      </div>

      <div className="movies-views" role="tablist" aria-label="Seções de Jogos">
        <button type="button" role="tab" aria-selected={tab === 'lista'} className={tab === 'lista' ? 'is-on' : ''} onClick={() => setTab('lista')}>
          Nossa lista
        </button>
        <button type="button" role="tab" aria-selected={tab === 'gratis'} className={tab === 'gratis' ? 'is-on' : ''} onClick={() => setTab('gratis')}>
          Jogos grátis
        </button>
      </div>

      {tab === 'gratis' && <FreeGames />}

      {tab === 'lista' && (
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
            <div className="list-tools">
              <ListSearch
                value={filter}
                onChange={setFilter}
                label="Pesquisar nos jogos da lista"
                placeholder={phone ? 'Pesquisar nos jogos' : 'Pesquisar jogo da lista (nome ou plataforma)'}
              />
              <ListSort value={sort} onChange={setSort} />
            </div>
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
      )}

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
