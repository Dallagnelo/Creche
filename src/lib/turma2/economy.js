// Economia da Turma 2.0: o que dá para pescar, plantar, cozinhar, entregar e vender, e quanto vale.
// O ícone de cada coisa é uma peça da biblioteca (public/limezu/editor/biblioteca.json): [src, tema, nome].
import { bonus, levelIn } from './skills'

const ic = (src, t, n) => ({ src, t, n })

// tipo: peixe | prato | horta | semente | ferramenta | outro. preco: quanto a loja paga (0 = não compra)
export const BENS = {
  // peixes
  lixo: { nome: 'Lixo do lago', tipo: 'outro', preco: 1, icone: ic('pecas', 'city_props', 'pizza_trash'), desc: 'Alguém jogou isso no lago… pelo menos a loja recicla.' },
  lambari: { nome: 'Lambari', tipo: 'peixe', preco: 3, icone: ic('moveis', 'grocery_store', '281'), desc: 'Peixinho comum. Bom para assar.' },
  tilapia: { nome: 'Tilápia', tipo: 'peixe', preco: 5, icone: ic('moveis', 'grocery_store', '280'), desc: 'Peixe de lago, carne branquinha.' },
  tucunare: { nome: 'Tucunaré', tipo: 'peixe', preco: 9, icone: ic('moveis', 'grocery_store', '279'), desc: 'Briguento! Ótimo para moqueca.' },
  dourado: { nome: 'Dourado', tipo: 'peixe', preco: 22, icone: ic('moveis', 'fishing', '55'), desc: 'Raro e brilhante. Vale um banquete.' },
  lendario: { nome: 'Peixe lendário', tipo: 'peixe', preco: 70, icone: ic('moveis', 'fishing', '52'), desc: 'Dizem que só aparece para quem tem paciência. Já vem até no quadro.' },
  // horta
  alface: { nome: 'Alface', tipo: 'horta', preco: 4, icone: ic('moveis', 'grocery_store', '419'), desc: 'Fresquinha da horta.' },
  tomate: { nome: 'Tomate', tipo: 'horta', preco: 5, icone: ic('moveis', 'grocery_store', '412'), desc: 'Vermelhinho.' },
  abobora: { nome: 'Abóbora', tipo: 'horta', preco: 7, icone: ic('pecas', 'graveyard', 'little_pumpkin_1'), desc: 'Rende sopa e torta.' },
  milho: { nome: 'Milho', tipo: 'horta', preco: 6, icone: ic('moveis', 'grocery_store', '410'), desc: 'Espiga dourada.' },
  // pratos
  queimado: { nome: 'Comida queimada', tipo: 'prato', preco: 1, icone: ic('moveis', 'kitchen', '383'), desc: 'Passou do ponto… muito.' },
  peixe_assado: { nome: 'Peixe assado', tipo: 'prato', preco: 10, icone: ic('moveis', 'fishing', '56'), desc: 'Simples e gostoso.' },
  salada: { nome: 'Salada', tipo: 'prato', preco: 13, icone: ic('moveis', 'kitchen', '388'), desc: 'Alface com tomate.' },
  sopa: { nome: 'Sopa de abóbora', tipo: 'prato', preco: 16, icone: ic('moveis', 'kitchen', '389'), desc: 'Quentinha.' },
  torta: { nome: 'Torta de abóbora', tipo: 'prato', preco: 24, icone: ic('moveis', 'kitchen', '405'), desc: 'Com milho na massa.' },
  moqueca: { nome: 'Moqueca', tipo: 'prato', preco: 30, icone: ic('moveis', 'kitchen', '386'), desc: 'Tucunaré com tomate. Clássico.' },
  banquete: { nome: 'Banquete', tipo: 'prato', preco: 75, icone: ic('moveis', 'kitchen', '385'), desc: 'Dourado, abóbora e milho. Coisa de chef.' },
  // coragem
  gosma: { nome: 'Gosma de fantasma', tipo: 'outro', preco: 15, icone: ic('moveis', 'grocery_store', '409'), desc: 'Verde, brilha no escuro e é bem nojenta.' },
  // sementes (compra na loja)
  sem_alface: { nome: 'Sementes de alface', tipo: 'semente', preco: 0, compra: 1, planta: 'alface', icone: ic('moveis', 'grocery_store', '435'), desc: 'Planta na horta. Cresce rápido.' },
  sem_tomate: { nome: 'Sementes de tomate', tipo: 'semente', preco: 0, compra: 2, planta: 'tomate', icone: ic('moveis', 'grocery_store', '435'), desc: 'Planta na horta (Jardinagem 5).' },
  sem_abobora: { nome: 'Sementes de abóbora', tipo: 'semente', preco: 0, compra: 2, planta: 'abobora', icone: ic('moveis', 'grocery_store', '435'), desc: 'Planta na horta.' },
  sem_milho: { nome: 'Sementes de milho', tipo: 'semente', preco: 0, compra: 3, planta: 'milho', icone: ic('moveis', 'grocery_store', '435'), desc: 'Planta na horta (Jardinagem 12).' },
  // ferramentas (vêm no kit inicial; se jogar fora, compra de novo)
  vara: { nome: 'Vara de pesca', tipo: 'ferramenta', preco: 0, compra: 5, icone: ic('moveis', 'fishing', '13'), desc: 'Para pescar: chegue na beira da água e aperte E.' },
  panela: { nome: 'Panela', tipo: 'ferramenta', preco: 0, compra: 5, icone: ic('pecas', 'camping', 'hanging_cooking_pot_1'), desc: 'Para cozinhar: chegue numa churrasqueira, fogueira ou carrinho e aperte E.' },
  caixa: { nome: 'Caixa de ferramentas', tipo: 'ferramenta', preco: 0, compra: 8, icone: ic('pecas', 'worksite', 'tool_box_1'), desc: 'Para consertar postes e máquinas quebradas.' },
  regador: { nome: 'Regador', tipo: 'ferramenta', preco: 0, compra: 4, icone: ic('pecas', 'garden', 'green_watering_can_right_full'), desc: 'Planta regada cresce mais rápido.' },
}
export const KIT = ['vara', 'panela', 'caixa', 'regador']
export const SHOP = ['sem_alface', 'sem_abobora', 'sem_tomate', 'sem_milho', 'vara', 'panela', 'caixa', 'regador']

// pesca: [bem, peso, nível mínimo, XP]
export const FISH = [
  ['lixo', 10, 1, 3],
  ['lambari', 50, 1, 8],
  ['tilapia', 30, 3, 12],
  ['tucunare', 15, 10, 20],
  ['dourado', 4, 20, 40],
  ['lendario', 1, 35, 90],
]
const RARE = new Set(['tucunare', 'dourado', 'lendario'])

// horta: planta → minutos para ficar pronta, nível mínimo, XP ao colher
export const CROPS = {
  alface: { min: 2, nivel: 1, xp: 6 },
  abobora: { min: 4, nivel: 1, xp: 12 },
  tomate: { min: 3, nivel: 5, xp: 10 },
  milho: { min: 5, nivel: 12, xp: 18 },
}

// receitas: ingredientes (um de cada; "peixe" = qualquer lambari, tilápia ou tucunaré), nível e XP
export const RECIPES = [
  { id: 'peixe_assado', usa: ['peixe'], nivel: 1, xp: 14 },
  { id: 'salada', usa: ['alface', 'tomate'], nivel: 5, xp: 20 },
  { id: 'sopa', usa: ['abobora'], nivel: 8, xp: 22 },
  { id: 'torta', usa: ['abobora', 'milho'], nivel: 15, xp: 34 },
  { id: 'moqueca', usa: ['tucunare', 'tomate'], nivel: 20, xp: 45 },
  { id: 'banquete', usa: ['dourado', 'abobora', 'milho'], nivel: 30, xp: 90 },
]
const ANY_FISH = ['lambari', 'tilapia', 'tucunare']

// ---------------------------------------------------------------- mochila
export const goodKey = (id) => `bem/${id}`
export const countOf = (save, id) => save.inv.find((it) => it.key === goodKey(id))?.qtd ?? 0
export function giveGood(save, id, qtd = 1) {
  const b = BENS[id]
  const key = goodKey(id)
  const has = save.inv.find((it) => it.key === key)
  const inv = has
    ? save.inv.map((it) => (it.key === key ? { ...it, qtd: it.qtd + qtd } : it))
    : [...save.inv, { key, bem: id, ...b.icone, nome: b.nome, desc: b.desc, qtd, quando: Date.now() }]
  return { ...save, inv }
}
export function takeGood(save, id, qtd = 1) {
  const key = goodKey(id)
  return { ...save, inv: save.inv.flatMap((it) => (it.key !== key ? [it] : it.qtd > qtd ? [{ ...it, qtd: it.qtd - qtd }] : [])) }
}
/** primeira vez: kit de ferramentas, sementes e umas moedas (já na barra rápida) */
export function giveKit(save) {
  if (save.kit) return save
  let s = { ...save, kit: 1, moedas: save.moedas + 10 }
  for (const id of KIT) s = giveGood(s, id)
  s = giveGood(s, 'sem_abobora', 3)
  s = giveGood(s, 'sem_alface', 3)
  const hot = [...s.hot]
  KIT.forEach((id, i) => {
    if (i < hot.length && !hot[i]) hot[i] = goodKey(id)
  })
  return { ...s, hot }
}

// ---------------------------------------------------------------- pesca
export function rollFish(save, cfg, rnd = Math.random) {
  const lv = levelIn(save, 'pesca')
  const rare = 1 + bonus(save, cfg, 'pesca', 'raro') / 100
  const pool = FISH.filter(([, , min]) => lv >= min).map(([id, w, , xp]) => [id, (id === 'lixo' ? Math.max(2, w - lv / 2) : w) * (RARE.has(id) ? rare : 1), xp])
  let r = rnd() * pool.reduce((s, p) => s + p[1], 0)
  for (const [id, w, xp] of pool) {
    r -= w
    if (r <= 0) return { id, xp, qtd: id !== 'lixo' && rnd() * 100 < bonus(save, cfg, 'pesca', 'dobro') ? 2 : 1 }
  }
  return { id: 'lambari', xp: 8, qtd: 1 }
}
/** quanto tempo (s) para puxar depois que morde */
export const biteWindow = (save, cfg) => 0.75 * (1 + bonus(save, cfg, 'pesca', 'facil') / 100)

// ---------------------------------------------------------------- culinária
/** quais ingredientes a receita gastaria agora (ou null se não dá) */
export function recipeUses(save, rec) {
  const left = Object.fromEntries(save.inv.filter((it) => it.bem).map((it) => [it.bem, it.qtd]))
  const used = []
  for (const need of rec.usa) {
    const opts = need === 'peixe' ? ANY_FISH : [need]
    const got = opts.find((id) => (left[id] ?? 0) > 0)
    if (!got) return null
    left[got] -= 1
    used.push(got)
  }
  return used
}
/** largura do "ponto certo" na barra (0 a 1) */
export const cookZone = (save, cfg) => Math.min(0.5, 0.16 * (1 + bonus(save, cfg, 'culinaria', 'facil') / 100))

// ---------------------------------------------------------------- horta
export function growMs(save, cfg, planta, regado) {
  const base = (CROPS[planta]?.min ?? 3) * 60000
  const fast = bonus(save, cfg, 'jardinagem', 'rapido') / 100
  return Math.round((base / (1 + fast)) * (regado ? 0.7 : 1))
}
/** 0 a 1: quanto já cresceu */
export function growth(save, cfg, plot, now = Date.now()) {
  if (!plot) return 0
  return Math.min(1, (now - plot.t) / growMs(save, cfg, plot.planta, plot.regado))
}

// ---------------------------------------------------------------- loja
export const sellPrice = (save, cfg, id) => Math.max(1, Math.round((BENS[id]?.preco ?? 0) * (1 + bonus(save, cfg, 'comercio', 'moedas') / 100) * (BENS[id]?.tipo === 'prato' ? 1 + bonus(save, cfg, 'culinaria', 'moedas') / 100 : 1)))
export const buyPrice = (save, cfg, id) => Math.max(1, Math.round((BENS[id]?.compra ?? 1) * (1 - Math.min(60, bonus(save, cfg, 'comercio', 'desconto')) / 100)))

// ---------------------------------------------------------------- atividades nos mapas
// qual peça do mapa serve para quê (pelo nome "tema/peça"); o editor pode trocar em cada objeto
export const ACT_TYPES = [
  ['loja', 'Loja (vender e comprar)', /\/(mall_|market_|supermarket|kiosk_|lemonade_stand|ship_bar|fruit_flowers_cart)/],
  ['cozinha', 'Cozinhar', /\/(barbecue|hot_dog_cart|street_food_cart|hanging_cooking_pot|electric_plate|stove|oven|grill|pizza_tuk_tuk_\d)/],
  ['correio', 'Correio (pegar entregas)', /^post_office\/building|\/big_(blue|grey)_mailbox/],
  ['caixa_correio', 'Caixa de correio (destino de entrega)', /\/.*mailbox/],
  ['conserto', 'Conserto (quebra de vez em quando)', /\/(street_lamp|atm_|phone_booth|public_phone|ev_charging|electric_box|vending_machine)/],
]
export const actTypeOf = (theme, name) => ACT_TYPES.find(([, , re]) => re.test(`${theme}/${name}`))?.[0] ?? null
export const ACT_LABEL = Object.fromEntries(ACT_TYPES.map(([k, l]) => [k, l]))

// quanto tempo até quebrar de novo depois de consertado / o fantasma voltar
export const FIX_AGAIN_MS = 8 * 60000
export const GHOST_BACK_MS = 3 * 60000
