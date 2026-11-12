import AdjImg from '../components/AdjImg'
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import LiveBanner from '../components/LiveBanner';
import { usePhone } from '../hooks/useMediaQuery';
import HomeNextEvent, { nextEvents } from '../components/HomeNextEvent';
import { ErrorBox, Spinner } from '../components/Feedback';
import GameModal from '../components/GameModal';
import GameRatingModal from '../components/GameRatingModal';
import MovieModal from '../components/MovieModal';
import PostModal from '../components/PostModal';
import RatingModal from '../components/RatingModal';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatAverage, formatShortDate } from '../lib/format';
import { posterUrl } from '../lib/tmdb';
import { listEvents } from '../services/events';
import { listGames } from '../services/games';
import { deleteMovie, listMovies } from '../services/movies';
import { deletePost, listPosts, updatePostCrop } from '../services/posts';
import { KEYS } from '../lib/dataCache'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Cores que se repetem nos itens, como no visual "Fase".
const RANK_COLORS = ['var(--star)', 'var(--primary)', 'var(--accent)', 'var(--muted)', 'var(--muted)'];
const GAME_COLORS = ['var(--primary)', 'var(--accent)', 'var(--star)'];

// Página inicial: um resumo de tudo que a turma já guardou.
// Ela só junta dados que os outros services já buscam; não tem lógica nova de banco.
export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const phone = usePhone();
  const posts = useAsyncData(listPosts, KEYS.posts);
  const movies = useAsyncData(listMovies, KEYS.movies);
  const games = useAsyncData(listGames, KEYS.games);
  // Mural de jogos: os mais bem avaliados primeiro (empate: mais avaliações; depois o mais novo).
  // Se ainda houver poucos jogos avaliados, os últimos postados completam as vagas.
  const topGames = useMemo(() => {
    const list = games.data ?? [];
    const rated = list
      .filter((game) => game.average != null)
      .sort(
        (a, b) =>
          b.average - a.average ||
          b.ratings.length - a.ratings.length ||
          new Date(b.created_at) - new Date(a.created_at),
      );
    const unrated = list.filter((game) => game.average == null);
    return [...rated, ...unrated].slice(0, phone ? 3 : 6);
  }, [games.data, phone]);
  const events = useAsyncData(listEvents, KEYS.events);
  // Sem eventos marcados, o mural ocupa a linha inteira (nada de espaço vazio ao lado).
  const noEvents = Boolean(events.data) && nextEvents(events.data).length === 0;

  // Clicar num filme do ranking abre o mesmo detalhe da página Filmes.
  // Guardamos só o ID e procuramos o filme na lista atual (assim, após dar nota, a janela mostra os dados novos).
  const [selectedId, setSelectedId] = useState(null);
  const selected = movies.data?.find((movie) => movie.id === selectedId) ?? null;
  const [rating, setRating] = useState(null); // { movie, existing } ou null

  // Apagar um filme que EU cadastrei (leva junto as notas e os comentários da turma).
  const [deleteError, setDeleteError] = useState(null);
  async function handleDeleteMovie(movie) {
    const others = movie.ratings.filter((item) => item.user_id !== user.id).length;
    const warning = others
      ? `\n\nIsso também apaga as notas de ${others} ${others === 1 ? 'amigo' : 'amigos'} e todos os comentários sobre o filme.`
      : '\n\nAs suas notas e os comentários sobre ele também serão apagados.';
    if (!window.confirm(`Apagar "${movie.title}" da lista?${warning}\n\nNão dá para desfazer.`)) return;

    setDeleteError(null);
    try {
      await deleteMovie(movie.id);
      setSelectedId(null);
      movies.reload();
    } catch (err) {
      setDeleteError(err);
    }
  }

  // E para as fotos do mural: clicar abre a foto aqui mesmo, sem sair da Home.
  const [selectedPostId, setSelectedPostId] = useState(null);
  const selectedPost = posts.data?.find((post) => post.id === selectedPostId) ?? null;
  async function handleDeletePost(post) {
    if (!window.confirm('Apagar esta lembrança? Não dá para desfazer.')) return;
    setDeleteError(null);
    try {
      await deletePost(post);
      setSelectedPostId(null);
      posts.reload();
    } catch (err) {
      setDeleteError(err);
    }
  }

  // Mesma ideia para os jogos.
  const [selectedGameId, setSelectedGameId] = useState(null);
  const selectedGame = games.data?.find((game) => game.id === selectedGameId) ?? null;
  const [gameRating, setGameRating] = useState(null);
  const ratingGame = games.data?.find((game) => game.id === gameRating?.gameId) ?? null;

  // Filmes com nota, do melhor para o pior.
  const topMovies = useMemo(
    () =>
      (movies.data ?? [])
        .filter((movie) => movie.average != null)
        .sort((a, b) => b.average - a.average)
        .slice(0, phone ? 3 : 5),
    [movies.data, phone]
  );

  // Junta posts, jogos e filmes numa única linha do tempo.
  const activity = useMemo(() => {
    const items = [
      ...(posts.data ?? []).map((post) => ({
        id: `post-${post.id}`,
        kind: 'photo',
        text: `${post.author?.display_name ?? 'Alguém'} postou uma foto`,
        at: post.created_at,
      })),
      ...(games.data ?? []).map((game) => ({
        id: `game-${game.id}`,
        kind: 'game',
        text: `${game.author?.display_name ?? 'Alguém'} adicionou o jogo ${
          game.name
        }`,
        at: game.created_at,
      })),
      ...(movies.data ?? []).map((movie) => ({
        id: `movie-${movie.id}`,
        kind: 'movie',
        text: `${movie.title} entrou na lista de filmes`,
        at: movie.created_at,
      })),
    ];
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, phone ? 4 : 6);
  }, [posts.data, games.data, movies.data, phone]);

  // Celular: tudo cabe numa tela só (sem rolar): ao vivo e votação (se houver), próximo evento,
  // as 3 últimas fotos e os 3 últimos filmes adicionados.
  const latestMovies = useMemo(
    () => [...(movies.data ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    [movies.data]
  );

  return (
    <div className={`stack home${phone ? ' phone-home' : ''}`}>
      {/* Os contadores ficam no Layout; este título é só para leitores de tela. */}
      <h1 className="sr-only">Início</h1>
      {deleteError && <ErrorBox error={deleteError} />}
      {!phone && <LiveBanner />}
      <div className={`home-top${noEvents ? ' is-solo' : ''}`}>
      <section className="card panel" aria-labelledby="panel-photos">
        <div className="panel-head">
          <h2 id="panel-photos">
            <span className="desk-only">Últimas lembranças</span>
            <span className="phone-only">Últimas fotos</span>
          </h2>
          <Link to="/mural" className="panel-link">
            <span className="desk-only">Ver mural</span>
            <span className="phone-only">Ver tudo</span>
          </Link>
        </div>
        {posts.error && <ErrorBox error={posts.error} onRetry={posts.reload} />}
        {posts.loading && !posts.data && <Spinner />}
        {posts.data?.length === 0 && (
          <p className="muted">Nenhuma foto ainda. Que tal postar a primeira?</p>
        )}
        {posts.data?.length > 0 && (
          <ul className="memory-grid">
            {posts.data.slice(0, noEvents && !phone ? 6 : 3).map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  className="memory"
                  onClick={() => setSelectedPostId(post.id)}
                  aria-label={`Abrir foto: ${post.caption || 'Sem legenda'}`}
                >
                  <span className="memory-photo">
                    {post.imageUrl && (
                      <AdjImg src={post.imageUrl} crop={post.imageCrop} loading="lazy" />
                    )}
                    {post.images.length > 1 && (
                      <small className="photo-count">
                        <Icon name="photos" />
                        {post.images.length}
                      </small>
                    )}
                  </span>
                  <span className="memory-caption">
                    <strong>{post.caption || 'Sem legenda'}</strong>
                    <span className="muted">
                      {post.author?.display_name ?? 'Alguém'} ·{' '}
                      {formatShortDate(post.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {!noEvents && <HomeNextEvent events={events} limit={phone ? 1 : 2} />}
      </div>

      <div className="home-row">
        <section className="card panel" aria-labelledby="panel-top">
          <div className="panel-head">
            <h2 id="panel-top">
              <span className="desk-only">Ranking de filmes</span>
              <span className="phone-only">Melhores filmes</span>
            </h2>
            <Link to="/filmes" className="panel-link">
              <span className="desk-only">Ver filmes</span>
              <span className="phone-only">Ver tudo</span>
            </Link>
          </div>
          {movies.error && <ErrorBox error={movies.error} onRetry={movies.reload} />}
          {movies.loading && !movies.data && <Spinner />}
          {movies.data && topMovies.length === 0 && (
            <p className="muted">Avalie um filme para ele aparecer aqui.</p>
          )}
          {topMovies.length > 0 && (
            <ol className="ranking">
              {topMovies.map((movie, index) => (
                <li key={movie.id}>
                  <button
                    type="button"
                    className="rank-row"
                    onClick={() => setSelectedId(movie.id)}
                    aria-label={`Ver detalhes de ${movie.title}`}
                  >
                  <span
                    className="rank-pos"
                    style={{ color: RANK_COLORS[index] }}
                  >
                    {index + 1}
                    <span className="desk-only">º</span>
                  </span>
                  <span className="rank-poster">
                    {movie.poster_path ? (
                      <img
                        src={posterUrl(movie.poster_path, 'w185')}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <Icon name="movies" />
                    )}
                  </span>
                  <span className="rank-text">
                    <strong>{movie.title}</strong>
                    <span className="muted">
                      {[movie.release_year, plural(movie.ratings.length, 'avaliação', 'avaliações')]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <strong className="score">{formatAverage(movie.average)}</strong>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card panel" aria-labelledby="panel-games">
          <div className="panel-head">
            <h2 id="panel-games">Melhores jogos</h2>
            <Link to="/jogos" className="panel-link">
              Ver jogos
            </Link>
          </div>
          {games.error && <ErrorBox error={games.error} onRetry={games.reload} />}
          {games.loading && !games.data && <Spinner />}
          {games.data?.length === 0 && (
            <p className="muted">Nenhum jogo cadastrado ainda.</p>
          )}
          {games.data?.length > 0 && (
            <ul className="cartridges">
              {topGames.map((game, index) => (
                <li key={game.id}>
                  <button
                    type="button"
                    className="cartridge"
                    title={game.name}
                    onClick={() => setSelectedGameId(game.id)}
                  >
                    <span className="cartridge-frame">
                      {game.coverUrl ? (
                        <AdjImg src={game.coverUrl} crop={game.coverCrop} loading="lazy" />
                      ) : (
                        <span
                          className="cartridge-cover cartridge-cover-empty"
                          aria-hidden="true"
                        >
                          <Icon name="games" />
                        </span>
                      )}
                      {game.platform && (
                        <span className="game-badge" title={game.platform}>
                          {game.platform}
                        </span>
                      )}
                      {game.average != null && (
                        <span
                          className="game-score"
                          title={`${game.ratings.length} ${game.ratings.length === 1 ? 'avaliação' : 'avaliações'}`}
                        >
                          <span aria-hidden="true">★</span> {formatAverage(game.average)}
                        </span>
                      )}
                    </span>
                    <span
                      className="cartridge-name"
                      style={{ color: GAME_COLORS[index % GAME_COLORS.length] }}
                    >
                      {game.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card panel" aria-labelledby="panel-activity">
        <div className="panel-head">
          <h2 id="panel-activity">Atividade recente</h2>
        </div>
        {activity.length === 0 && !posts.loading && (
          <p className="muted">Quando alguém postar algo, aparece aqui.</p>
        )}
        {activity.length > 0 && (
          <ul className="list">
            {activity.map((item) => (
              <li key={item.id} className="list-row">
                <span className={`dot dot-${item.kind}`} aria-hidden="true" />
                <span className="list-text">{item.text}</span>
                <span className="muted nowrap">{formatShortDate(item.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <MovieModal
          movie={selected}
          // Esc/fundo fecham o detalhe, exceto quando a janela de nota está aberta por cima.
          onClose={() => !rating && setSelectedId(null)}
          onRate={(movie, existing) => setRating({ movie, existing })}
          onDelete={handleDeleteMovie}
          onSaved={movies.reload}
        />
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          isOwner={selectedPost.author_id === user.id || isAdmin}
          onClose={() => setSelectedPostId(null)}
          onDelete={handleDeletePost}
          onAdjust={async (post, crop) => {
            await updatePostCrop(post.id, crop);
            await posts.reload();
          }}
        />
      )}

      {selectedGame && (
        <GameModal
          game={selectedGame}
          isOwner={selectedGame.added_by === user.id || isAdmin}
          onClose={() => !gameRating && setSelectedGameId(null)}
          onRate={(game, existing) => setGameRating({ gameId: game.id, existing })}
        />
      )}

      {gameRating && ratingGame && (
        <GameRatingModal
          game={ratingGame}
          existing={gameRating.existing}
          onClose={() => setGameRating(null)}
          onSaved={() => {
            setGameRating(null);
            games.reload();
          }}
        />
      )}

      {rating && (
        <RatingModal
          movie={rating.movie}
          existing={rating.existing}
          onClose={() => setRating(null)}
          onSaved={() => {
            setRating(null);
            movies.reload();
          }}
        />
      )}
    </div>
  );
}
