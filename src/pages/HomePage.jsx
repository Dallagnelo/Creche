import AdjImg from '../components/AdjImg'
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import { usePhone } from '../hooks/useMediaQuery';
import EventDetailModal from '../components/EventDetailModal';
import EventModal from '../components/EventModal';
import LiveBanner from '../components/LiveBanner';
import HomePolls from '../components/HomePolls';
import { HomeBirthdays, HomeEvents, HomeFreeGames, HomeNews, HomeRanking, HomeRoomToday, HomeThisDay } from '../components/HomeBlocks';
import { ErrorBox, Spinner } from '../components/Feedback';
import GameModal from '../components/GameModal';
import GameRatingModal from '../components/GameRatingModal';
import MovieModal from '../components/MovieModal';
import PostModal from '../components/PostModal';
import RatingModal from '../components/RatingModal';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatShortDate } from '../lib/format';
import { deleteEvent, listEvents, setAttendance } from '../services/events';
import { listProfiles } from '../services/profiles';
import { listGames } from '../services/games';
import { deleteMovie, listMovies } from '../services/movies';
import { deletePost, listPosts, updatePostCrop } from '../services/posts';
import { KEYS } from '../lib/dataCache'
import { getCounters } from '../services/summary'
import { refreshFreeGamesOnce } from '../services/freeGames'



// Página inicial: um resumo de tudo que a turma já guardou.
// Ela só junta dados que os outros services já buscam; não tem lógica nova de banco.
export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const phone = usePhone();
  // mantém a lista de jogos grátis em dia (a função só busca de novo depois de 1 hora) e dispara o aviso de jogo novo
  useEffect(() => {
    const timer = setTimeout(() => refreshFreeGamesOnce(), 4000);
    return () => clearTimeout(timer);
  }, []);
  const posts = useAsyncData(listPosts, KEYS.posts);
  const counters = useAsyncData(getCounters, KEYS.counters);
  const movies = useAsyncData(listMovies, KEYS.movies);
  const games = useAsyncData(listGames, KEYS.games);
  const events = useAsyncData(listEvents, KEYS.events);

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




  // Eventos: "Eu vou!" e a janela de detalhes ficam aqui (usados pela faixa Agora e pela lista).
  const profiles = useAsyncData(listProfiles, KEYS.profiles);
  const [eventId, setEventId] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const selectedEvent = events.data?.find((event) => event.id === eventId) ?? null;
  async function toggleEvent(event, going) {
    setDeleteError(null);
    try {
      await setAttendance({ eventId: event.id, userId: user.id, going });
      events.reload();
    } catch (err) {
      setDeleteError(err);
    }
  }
  async function removeEvent(event) {
    if (!window.confirm(`Apagar o evento "${event.title}"?\n\nIsso tira o evento para todo mundo.`)) return;
    setEventId(null);
    try {
      await deleteEvent(event.id);
      events.reload();
    } catch (err) {
      setDeleteError(err);
    }
  }

  const photosPanel = (
    <section className="card panel home-photos" aria-labelledby="panel-photos">
      <div className="panel-head">
        <h2 id="panel-photos">Últimas fotos</h2>
        <Link to="/mural" className="panel-link">Ver mural</Link>
      </div>
      {posts.error && <ErrorBox error={posts.error} onRetry={posts.reload} />}
      {posts.loading && !posts.data && <Spinner />}
      {posts.data?.length === 0 && <p className="muted">Nenhuma foto ainda. Que tal postar a primeira?</p>}
      {posts.data?.length > 0 && (
        <ul className="memory-grid home-photo-grid">
          {posts.data.slice(0, 3).map((post) => (
            <li key={post.id}>
              <button type="button" className="memory" onClick={() => setSelectedPostId(post.id)} aria-label={`Abrir foto: ${post.caption || 'Sem legenda'}`}>
                <span className="memory-photo">
                  {post.imageUrl && <AdjImg src={post.imageUrl} crop={post.imageCrop} loading="lazy" />}
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
                    {post.author?.display_name ?? 'Alguém'} · {formatShortDate(post.created_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );


  const ranking = (
    <HomeRanking
      movies={movies.data}
      games={games.data}
      onOpenMovie={(movie) => setSelectedId(movie.id)}
      onOpenGame={(game) => setSelectedGameId(game.id)}
    />
  );
  const eventsPanel = <HomeEvents events={events.data} onOpenEvent={(event) => setEventId(event.id)} onToggleEvent={toggleEvent} />;
  const thisDay = (
    <HomeThisDay
      posts={posts.data}
      events={events.data}
      onOpenPost={(post) => setSelectedPostId(post.id)}
      onOpenEvent={(event) => setEventId(event.id)}
    />
  );

  return (
    <div className={`stack home home-v2${phone ? ' phone-home' : ''}`}>
      {/* título só para leitores de tela: a tela inicial começa direto nos blocos */}
      <h1 className="sr-only">Início</h1>
      {phone && (
        <dl className="counters counters-mobile">
          {[
            ['Fotos', counters.data?.photos],
            ['Filmes', counters.data?.movies],
            ['Jogos', counters.data?.games],
          ].map(([label, value]) => (
            <div key={label} className="counter">
              <dt className="counter-label">{label}</dt>
              <dd className="counter-value">{value ?? '–'}</dd>
            </div>
          ))}
        </dl>
      )}
      {deleteError && <ErrorBox error={deleteError} />}
      {/* destaques do topo (como antes): alguém ao vivo e as votações abertas */}
      <LiveBanner />
      <HomePolls />

      {phone ? (
        <>
          {photosPanel}
          {eventsPanel}
          <HomeFreeGames />
          <HomeRoomToday />
          {ranking}
          <HomeBirthdays profiles={profiles.data} />
          {thisDay}
          <HomeNews />
        </>
      ) : (
        <div className="home-cols">
          <div className="home-col">
            {photosPanel}
            {ranking}
            {thisDay}
          </div>
          <div className="home-col">
            <HomeRoomToday />
            {eventsPanel}
            <HomeFreeGames />
            <HomeBirthdays profiles={profiles.data} />
            <HomeNews />
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          userId={user.id}
          onToggle={toggleEvent}
          onDelete={removeEvent}
          onEdit={(event) => {
            setEventId(null);
            setEditingEvent(event);
          }}
          onClose={() => setEventId(null)}
        />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onCreated={() => {
            setEditingEvent(null);
            events.reload();
          }}
        />
      )}

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
