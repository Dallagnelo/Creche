// Turma 2.0: imagens e índices do pacote LimeZu usados pelo jogo e pelo editor de mapas.
// Tudo é carregado sob demanda e guardado (cada imagem só baixa uma vez).

export const T = 16
const images = new Map()
const jsons = new Map()

export function loadImage(url) {
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          images.delete(url) // deixa tentar de novo depois
          reject(new Error(url))
        }
        img.src = url
      }),
    )
  }
  return images.get(url)
}

export function loadJson(url) {
  if (!jsons.has(url)) {
    jsons.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) {
          jsons.delete(url)
          throw new Error(url)
        }
        return res.json()
      }),
    )
  }
  return jsons.get(url)
}

// a biblioteca do editor (scripts/turma2-biblioteca.py): peças do Exteriors, móveis do Interiors e animados
export const LIBRARY_URL = '/limezu/editor/biblioteca.json'
export const loadLibrary = () => loadJson(LIBRARY_URL)

// de onde vem a imagem de cada coisa da biblioteca
export const atlasUrl = (src, theme) =>
  src === 'moveis' ? `/limezu/mi/moveis/${theme}.png` : theme.startsWith('fazenda_') ? `/limezu/mf/pecas/${theme}.png` : `/limezu/me/pecas/${theme}.png`
export const animAtlasUrl = (i) => `/limezu/editor/animados_${i}.png`

// nomes mais legíveis para os temas (o resto aparece como vem do pacote, sem os "_")
const THEME_NAMES = {
  terrains_and_fences: 'Terrenos e cercas', city_terrains: 'Chão de cidade', city_props: 'Objetos de cidade',
  generic_building: 'Prédios', floor_modular_building: 'Prédios por andar', villas: 'Casas', additional_houses: 'Casas extras',
  garage_sales: 'Bazar de garagem', garden: 'Jardim', swimming_pool: 'Piscina', school: 'Escola', hotel_and_hospital: 'Hotel e hospital',
  police_station: 'Delegacia', fire_station: 'Bombeiros', post_office: 'Correio', office: 'Escritório',
  shopping_center_and_markets: 'Shopping e mercados', vehicles: 'Veículos', subway_and_train_station: 'Metrô e trem',
  beach: 'Praia', camping: 'Camping', graveyard: 'Cemitério', military_base: 'Base militar', worksite: 'Obra',
  fazenda_construcoes: 'Fazenda: construções e objetos', fazenda_arvores: 'Fazenda: árvores', fazenda_cercas: 'Fazenda: cercas',
  fazenda_plantacoes: 'Fazenda: plantações', fazenda_coletaveis: 'Fazenda: coletáveis', fazenda_icones: 'Fazenda: ícones',
  fazenda_crescimento: 'Fazenda: plantas crescendo',
}

// os bichos da fazenda (scripts/turma2-fazenda.py): folha, tamanho do quadro, nome e o som que fazem
export const BICHOS_URL = '/limezu/mf/bichos.json'
export const loadBichos = () => loadJson(BICHOS_URL)
export const themeName = (t) => THEME_NAMES[t] ?? t.replace(/^\d+_/, '').replace(/_/g, ' ')
