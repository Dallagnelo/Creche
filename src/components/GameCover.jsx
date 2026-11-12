import { coverUrl } from '../services/igdb'

/**
 * Capa de jogo no tamanho certo para cada lugar (thumb, pick, card ou hero).
 * Se o tamanho pedido não carregar, volta para o endereço original guardado no banco.
 */
export default function GameCover({ url, size = 'card', alt = '', ...rest }) {
  return (
    <img
      src={coverUrl(url, size)}
      alt={alt}
      onError={(event) => {
        if (event.currentTarget.src !== url) event.currentTarget.src = url
      }}
      {...rest}
    />
  )
}
