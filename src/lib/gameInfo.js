// Lista de itens guardados como texto separado por vírgula (gêneros e plataformas do IGDB).
export const splitList = (text) => (text ? text.split(',').map((item) => item.trim()).filter(Boolean) : [])

/** Plataformas de um jogo: a escolhida antes na mão (jogos antigos) e as do IGDB, sem repetir. */
export function gamePlatforms(game) {
  return [...new Set([...(game.platform ? [game.platform] : []), ...splitList(game.all_platforms)])]
}
