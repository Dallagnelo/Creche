import { useCallback, useState } from 'react'
import { useAsyncData } from '../hooks/useAsyncData'
import { getMovieExtras } from '../lib/tmdb'
import Avatar from './Avatar'
import { Spinner } from './Feedback'
import Icon from './Icon'

// Trailer "sob demanda": mostramos só a miniatura e o vídeo do YouTube só carrega ao clicar.
// Assim a janela abre rápido e o YouTube não rastreia quem nem chegou a assistir.
function Trailer({ video, title }) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="trailer">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
          title={`Trailer de ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" className="trailer-start" onClick={() => setPlaying(true)} aria-label={`Assistir ao trailer de ${title}`}>
          <img src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="trailer-play">
            <Icon name="play" />
          </span>
        </button>
      )}
    </div>
  )
}

/** Trailer e elenco do filme (vêm do TMDB). Se não houver, a seção simplesmente não aparece. */
export default function MovieExtras({ movie }) {
  const fetchExtras = useCallback(() => getMovieExtras(movie.tmdb_id), [movie.tmdb_id])
  const { data, loading, error } = useAsyncData(fetchExtras)

  if (loading && !data) return <Spinner label="Carregando trailer e elenco..." />
  if (error) return <p className="muted">Não foi possível carregar o trailer e o elenco. {error.message}</p>
  if (!data) return null

  return (
    <>
      {data.trailer && (
        <section className="modal-section" aria-labelledby="movie-trailer">
          <h3 id="movie-trailer">Trailer</h3>
          <Trailer video={data.trailer} title={movie.title} />
          <a
            className="muted trailer-link"
            href={`https://www.youtube.com/watch?v=${data.trailer.key}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir no YouTube ↗
          </a>
        </section>
      )}

      {data.cast.length > 0 && (
        <section className="modal-section" aria-labelledby="movie-cast">
          <h3 id="movie-cast">Elenco</h3>
          <ul className="cast">
            {data.cast.map((person) => (
              <li key={person.id} className="cast-item">
                <div className="cast-photo">
                  <Avatar name={person.name} src={person.photo} size="fill" />
                </div>
                <strong className="cast-name">{person.name}</strong>
                {person.character && <span className="cast-role">{person.character}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
