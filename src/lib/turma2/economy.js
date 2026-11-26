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
  // horta (ícones do Modern Farm)
  alface: { nome: 'Alface', tipo: 'horta', preco: 5, energia: 8, icone: ic('pecas', 'fazenda_icones', 'crops_lettuce'), desc: 'Fresquinha da horta.' },
  rabanete: { nome: 'Rabanete', tipo: 'horta', preco: 6, energia: 8, icone: ic('pecas', 'fazenda_icones', 'crops_radish'), desc: 'Picante e crocante.' },
  nabo: { nome: 'Nabo', tipo: 'horta', preco: 7, energia: 10, icone: ic('pecas', 'fazenda_icones', 'crops_turnip'), desc: 'Redondo e branquinho.' },
  cenoura: { nome: 'Cenoura', tipo: 'horta', preco: 8, energia: 10, icone: ic('pecas', 'fazenda_icones', 'crops_carrot'), desc: 'Boa para a vista (dizem).' },
  tomate: { nome: 'Tomate', tipo: 'horta', preco: 9, energia: 10, icone: ic('pecas', 'fazenda_icones', 'crops_tomato'), desc: 'Vermelhinho.' },
  morango: { nome: 'Morango', tipo: 'horta', preco: 12, energia: 12, icone: ic('pecas', 'fazenda_icones', 'crops_strawberry'), desc: 'Docinho.' },
  abobora: { nome: 'Abóbora', tipo: 'horta', preco: 14, energia: 14, icone: ic('pecas', 'fazenda_icones', 'crops_pumpkin'), desc: 'Rende sopa e torta.' },
  milho: { nome: 'Milho', tipo: 'horta', preco: 13, energia: 12, icone: ic('pecas', 'fazenda_icones', 'crops_corn'), desc: 'Espiga dourada.' },
  couve_flor: { nome: 'Couve-flor', tipo: 'horta', preco: 18, energia: 14, icone: ic('pecas', 'fazenda_icones', 'crops_cauliflower'), desc: 'Parece uma nuvem.' },
  cafe: { nome: 'Café', tipo: 'horta', preco: 16, energia: 20, icone: ic('pecas', 'fazenda_icones', 'crops_coffee'), desc: 'Grãos para acordar a vila.' },
  melancia: { nome: 'Melancia', tipo: 'horta', preco: 30, energia: 25, icone: ic('pecas', 'fazenda_icones', 'crops_watermelon'), desc: 'Gigante e geladinha.' },
  trigo: { nome: 'Trigo', tipo: 'horta', preco: 6, energia: 5, icone: ic('pecas', 'fazenda_icones', 'crops_grain'), desc: 'Vira farinha para pão e croissant.' },
  abacaxi: { nome: 'Abacaxi', tipo: 'horta', preco: 38, energia: 25, icone: ic('pecas', 'fazenda_icones', 'crops_pineapple'), desc: 'Coroa de rei.' },
  // frutas (das árvores frutíferas: cada árvore dá fruta de novo depois de uns dias)
  maca: { nome: 'Maçã', tipo: 'fruta', preco: 10, energia: 12, icone: ic('pecas', 'fazenda_icones', 'crops_apple'), desc: 'Vermelhinha, direto do pé.' },
  pessego: { nome: 'Pêssego', tipo: 'fruta', preco: 12, energia: 12, icone: ic('pecas', 'fazenda_icones', 'crops_peach'), desc: 'Macio e doce.' },
  laranja: { nome: 'Laranja', tipo: 'fruta', preco: 11, energia: 12, icone: ic('pecas', 'fazenda_icones', 'crops_orange'), desc: 'Dá um suco ótimo.' },
  limao: { nome: 'Limão', tipo: 'fruta', preco: 9, energia: 6, icone: ic('pecas', 'fazenda_icones', 'crops_lemon'), desc: 'Azedinho.' },
  banana: { nome: 'Banana', tipo: 'fruta', preco: 10, energia: 14, icone: ic('pecas', 'fazenda_icones', 'crops_banana'), desc: 'Energia na hora.' },
  // dos bichos (precisa dar feno no dia anterior)
  feno: { nome: 'Feno', tipo: 'outro', preco: 0, compra: 1, icone: ic('pecas', 'fazenda_construcoes', 'hay_fresh_pile_small'), desc: 'Comida dos bichos: dê um feno por dia e no outro dia tem ovo, leite ou lã. Tem de graça no monte de feno do cercado.' },
  ovo: { nome: 'Ovo', tipo: 'bicho', preco: 8, energia: 10, icone: ic('pecas', 'fazenda_icones', 'food_egg'), desc: 'Fresquinho, da galinha.' },
  ovo_pata: { nome: 'Ovo de pata', tipo: 'bicho', preco: 12, energia: 12, icone: ic('pecas', 'fazenda_icones', 'food_egg'), desc: 'Maior que o de galinha.' },
  leite: { nome: 'Leite', tipo: 'bicho', preco: 14, energia: 14, icone: ic('pecas', 'fazenda_icones', 'tools_bucket_milk'), desc: 'Um balde de leite fresco.' },
  la: { nome: 'Lã', tipo: 'bicho', preco: 18, icone: ic('pecas', 'fazenda_icones', 'resources_wool_white'), desc: 'Macia, da ovelha.' },
  // pratos
  queimado: { nome: 'Comida queimada', tipo: 'prato', energia: 5, preco: 1, icone: ic('moveis', 'kitchen', '383'), desc: 'Passou do ponto… muito.' },
  peixe_assado: { nome: 'Peixe assado', tipo: 'prato', energia: 25, preco: 10, icone: ic('moveis', 'fishing', '56'), desc: 'Simples e gostoso.' },
  salada: { nome: 'Salada', tipo: 'prato', energia: 30, preco: 13, icone: ic('moveis', 'kitchen', '388'), desc: 'Alface com tomate.' },
  sopa: { nome: 'Sopa de abóbora', tipo: 'prato', energia: 35, preco: 16, icone: ic('moveis', 'kitchen', '389'), desc: 'Quentinha.' },
  torta: { nome: 'Torta de abóbora', tipo: 'prato', energia: 45, preco: 24, icone: ic('moveis', 'kitchen', '405'), desc: 'Com milho na massa.' },
  moqueca: { nome: 'Moqueca', tipo: 'prato', energia: 50, preco: 30, icone: ic('moveis', 'kitchen', '386'), desc: 'Tucunaré com tomate. Clássico.' },
  queijo: { nome: 'Queijo', tipo: 'prato', energia: 30, preco: 34, icone: ic('pecas', 'fazenda_icones', 'food_cheese'), desc: 'Feito com o leite da vaca.' },
  pao: { nome: 'Pão', tipo: 'prato', energia: 30, preco: 28, icone: ic('pecas', 'fazenda_icones', 'food_baguette'), desc: 'Trigo e ovo, quentinho.' },
  croissant: { nome: 'Croissant', tipo: 'prato', energia: 45, preco: 52, icone: ic('pecas', 'fazenda_icones', 'food_croissant'), desc: 'Trigo, ovo e leite. Coisa fina.' },
  banquete: { nome: 'Banquete', tipo: 'prato', energia: 100, preco: 75, icone: ic('moveis', 'kitchen', '385'), desc: 'Dourado, abóbora e milho. Coisa de chef.' },
  // coragem
  gosma: { nome: 'Gosma de fantasma', tipo: 'outro', preco: 15, icone: ic('moveis', 'grocery_store', '409'), desc: 'Verde, brilha no escuro e é bem nojenta.' },
  // sementes (compra na loja; planta na terra arada)
  sem_alface: { nome: 'Sementes de alface', tipo: 'semente', preco: 0, compra: 2, planta: 'alface', icone: ic('pecas', 'fazenda_icones', 'seed_bags_lettuce'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_rabanete: { nome: 'Sementes de rabanete', tipo: 'semente', preco: 0, compra: 2, planta: 'rabanete', icone: ic('pecas', 'fazenda_icones', 'seed_bags_radish'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_nabo: { nome: 'Sementes de nabo', tipo: 'semente', preco: 0, compra: 3, planta: 'nabo', icone: ic('pecas', 'fazenda_icones', 'seed_bags_turnip'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_cenoura: { nome: 'Sementes de cenoura', tipo: 'semente', preco: 0, compra: 3, planta: 'cenoura', icone: ic('pecas', 'fazenda_icones', 'seed_bags_carrot'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_tomate: { nome: 'Sementes de tomate', tipo: 'semente', preco: 0, compra: 4, planta: 'tomate', icone: ic('pecas', 'fazenda_icones', 'seed_bags_tomato'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_morango: { nome: 'Sementes de morango', tipo: 'semente', preco: 0, compra: 5, planta: 'morango', icone: ic('pecas', 'fazenda_icones', 'seed_bags_strawberry'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_abobora: { nome: 'Sementes de abóbora', tipo: 'semente', preco: 0, compra: 6, planta: 'abobora', icone: ic('pecas', 'fazenda_icones', 'seed_bags_pumpkin'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_milho: { nome: 'Sementes de milho', tipo: 'semente', preco: 0, compra: 5, planta: 'milho', icone: ic('pecas', 'fazenda_icones', 'seed_bags_corn'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_couve_flor: { nome: 'Sementes de couve-flor', tipo: 'semente', preco: 0, compra: 8, planta: 'couve_flor', icone: ic('pecas', 'fazenda_icones', 'seed_bags_cauliflower'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_cafe: { nome: 'Sementes de café', tipo: 'semente', preco: 0, compra: 7, planta: 'cafe', icone: ic('pecas', 'fazenda_icones', 'seed_bags_coffee'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_melancia: { nome: 'Sementes de melancia', tipo: 'semente', preco: 0, compra: 12, planta: 'melancia', icone: ic('pecas', 'fazenda_icones', 'seed_bags_watermelon'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_abacaxi: { nome: 'Sementes de abacaxi', tipo: 'semente', preco: 0, compra: 16, planta: 'abacaxi', icone: ic('pecas', 'fazenda_icones', 'seed_bags_pineapple'), desc: 'Plante na terra arada e regue todo dia.' },
  sem_trigo: { nome: 'Sementes de trigo', tipo: 'semente', preco: 0, compra: 2, planta: 'trigo', icone: ic('pecas', 'fazenda_icones', 'seed_bags_grain'), desc: 'Plante na terra arada e regue todo dia.' },
  irrigador: { nome: 'Irrigador', tipo: 'objeto', preco: 0, compra: 60, icone: ic('pecas', 'fazenda_construcoes', 'sprinkler'), desc: 'Coloque na horta: toda manhã ele rega os 4 quadradinhos em volta (cima, baixo, lados).' },
  // ferramentas (vêm no kit inicial; se perder, compra de novo)
  enxada: { nome: 'Enxada', tipo: 'ferramenta', preco: 0, compra: 5, icone: ic('pecas', 'fazenda_icones', 'tools_shovel'), desc: 'Ara a terra da horta (o quadradinho na sua frente).' },
  regador: { nome: 'Regador', tipo: 'ferramenta', preco: 0, compra: 4, icone: ic('pecas', 'fazenda_icones', 'tools_watering_can'), desc: 'Rega a terra arada: planta regada cresce um dia.' },
  vara: { nome: 'Vara de pesca', tipo: 'ferramenta', preco: 0, compra: 5, icone: ic('pecas', 'fazenda_icones', 'tools_fishing_rod'), desc: 'Olhe para a água e use: espere morder e segure para a barrinha acompanhar o peixe.' },
  panela: { nome: 'Panela', tipo: 'ferramenta', preco: 0, compra: 5, icone: ic('pecas', 'camping', 'hanging_cooking_pot_1'), desc: 'Para cozinhar: chegue no forno, churrasqueira ou fogueira e aperte E.' },
  caixa: { nome: 'Caixa de ferramentas', tipo: 'ferramenta', preco: 0, compra: 8, icone: ic('pecas', 'worksite', 'tool_box_1'), desc: 'Para consertar postes e máquinas quebradas.' },
}
export const KIT = ['enxada', 'regador', 'vara', 'panela', 'caixa']
export const SHOP = [...Object.keys(BENS).filter((k) => k.startsWith('sem_')), 'feno', 'irrigador', 'enxada', 'regador', 'vara', 'panela', 'caixa']

// energia (como no Stardew): ferramenta gasta, comida devolve; enche de novo a cada manhã
export const ENERGY_MAX = 100
export const ENERGY_COST = { enxada: 2, regador: 1, vara: 3, conserto: 3, coragem: 4 }
export const energyOf = (save, today) => (save.energia && save.energia.dia === today ? save.energia.v : ENERGY_MAX)
export const withEnergy = (save, today, v) => ({ ...save, energia: { dia: today, v: Math.max(0, Math.min(ENERGY_MAX, Math.round(v))) } })

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

// horta: dias para ficar pronta (cada dia regado = um dia de crescimento), nível mínimo, XP ao colher e a folha de
// crescimento (tema fazenda_crescimento: 7 quadros, do broto à planta pronta)
export const CROPS = {
  alface: { dias: 2, nivel: 1, xp: 6, folha: 'cabbage' },
  rabanete: { dias: 2, nivel: 1, xp: 7, folha: 'radish' },
  nabo: { dias: 3, nivel: 1, xp: 9, folha: 'turnip' },
  cenoura: { dias: 3, nivel: 2, xp: 10, folha: 'carrot' },
  tomate: { dias: 4, nivel: 3, xp: 12, folha: 'tomato' },
  morango: { dias: 4, nivel: 5, xp: 15, folha: 'strawberry' },
  abobora: { dias: 5, nivel: 6, xp: 18, folha: 'pumpkin' },
  milho: { dias: 5, nivel: 8, xp: 17, folha: 'corn' },
  couve_flor: { dias: 6, nivel: 10, xp: 22, folha: 'cauliflower' },
  cafe: { dias: 6, nivel: 14, xp: 22, folha: 'coffee' },
  melancia: { dias: 7, nivel: 18, xp: 34, folha: 'watermelon' },
  abacaxi: { dias: 8, nivel: 24, xp: 42, folha: 'pineapple' },
  trigo: { dias: 3, nivel: 4, xp: 8, folha: 'wheat' },
}

// receitas: ingredientes (um de cada; "peixe" = qualquer lambari, tilápia ou tucunaré), nível e XP
export const RECIPES = [
  { id: 'peixe_assado', usa: ['peixe'], nivel: 1, xp: 14 },
  { id: 'salada', usa: ['alface', 'tomate'], nivel: 5, xp: 20 },
  { id: 'sopa', usa: ['abobora'], nivel: 8, xp: 22 },
  { id: 'torta', usa: ['abobora', 'milho'], nivel: 15, xp: 34 },
  { id: 'moqueca', usa: ['tucunare', 'tomate'], nivel: 20, xp: 45 },
  { id: 'queijo', usa: ['leite'], nivel: 3, xp: 18 },
  { id: 'pao', usa: ['trigo', 'ovo'], nivel: 6, xp: 24 },
  { id: 'croissant', usa: ['trigo', 'ovo', 'leite'], nivel: 12, xp: 40 },
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
/** primeira vez: kit de ferramentas, sementes e umas moedas (já na barra rápida, nesta ordem).
 *  kit 2 = versão da fazenda: quem já tinha o kit antigo ganha o que faltar (enxada, sementes novas) */
export function giveKit(save) {
  if ((save.kit ?? 0) >= 2) return save
  let s = { ...save, kit: 2, moedas: save.kit ? save.moedas : save.moedas + 25 }
  for (const id of KIT) if (!countOf(s, id)) s = giveGood(s, id)
  s = giveGood(s, 'sem_rabanete', 5)
  s = giveGood(s, 'sem_alface', 5)
  const hot = [...s.hot]
  for (const id of KIT) {
    const key = goodKey(id)
    if (hot.includes(key)) continue
    const free = hot.indexOf(null)
    if (free >= 0) hot[free] = key
  }
  for (const id of ['sem_rabanete', 'sem_alface']) {
    const free = hot.indexOf(null)
    if (free >= 0 && !hot.includes(goodKey(id))) hot[free] = goodKey(id)
  }
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
// cada quadradinho da horta, por pessoa: { arado: 1 } ou { arado: 1, planta, dia (plantou), agua: [dias regados] }
/** dias de crescimento que a planta precisa (a passiva "Mais rápido" da Jardinagem encurta) */
export const cropDays = (save, cfg, planta) => Math.max(1, Math.round((CROPS[planta]?.dias ?? 3) * (1 - Math.min(60, bonus(save, cfg, 'jardinagem', 'rapido')) / 100)))
/** desde que dia um irrigador encosta neste quadradinho (cima, baixo, lados), ou null */
export function sprinklerSince(plots, k) {
  const [x, y] = k.split(',').map(Number)
  let since = null
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const p = plots?.[`${x + dx},${y + dy}`]
    if (p?.irrigador !== undefined) since = since === null ? p.irrigador : Math.min(since, p.irrigador)
  }
  return since
}
/** quantos dias já cresceu: cada dia regado (antes de hoje) conta um; com irrigador, todo dia desde que ele chegou conta */
export function grownDays(plot, today, since = null) {
  let n = 0
  for (let d = plot.dia; d < today; d += 1) if (plot.agua?.includes(d) || (since !== null && d >= since)) n += 1
  return n
}
/** 0 a 1: quanto já cresceu */
export const growth = (save, cfg, plot, today, since = null) => (plot?.planta ? Math.min(1, grownDays(plot, today, since) / cropDays(save, cfg, plot.planta)) : 0)
export const wetToday = (plot, today, since = null) => !!plot?.agua?.includes(today) || (since !== null && today >= since)
/** terra arada sem nada plantado volta a ser chão depois de 3 dias sem regar nem plantar (como no Stardew) */
export function pruneHorta(horta, today) {
  let changed = false
  const out = {}
  for (const [room, plots] of Object.entries(horta ?? {})) {
    out[room] = {}
    for (const [k, p] of Object.entries(plots)) {
      const last = Math.max(typeof p.arado === 'number' && p.arado > 1 ? p.arado : 0, ...(p.agua ?? []))
      if (!p.planta && p.irrigador === undefined && today - last >= 3) {
        changed = true
        continue
      }
      out[room][k] = p
    }
  }
  return changed ? out : horta
}

// ---------------------------------------------------------------- frutas
// árvore frutífera (peça fruit_tree_<fruta>_ripe, com fruta): cada pessoa colhe e ela dá de novo depois de FRUIT_DAYS
export const FRUIT_DAYS = 3
const FRUITS = { apple: 'maca', peach: 'pessego', orange: 'laranja', lemon: 'limao', banana: 'banana' }
export function fruitOf(theme, name) {
  const m = /^fruit_tree_(apple|peach|orange|lemon|banana)_(ripe)(_big)?$/.exec(name)
  return theme === 'fazenda_arvores' && m ? { fruta: FRUITS[m[1]], vazia: `fruit_tree_${m[1]}_fruitless${m[3] ?? ''}` } : null
}
export const fruitReady = (save, room, id, today) => {
  const last = save.frutas?.[room]?.[id]
  return last === undefined || today - last >= FRUIT_DAYS
}

// ---------------------------------------------------------------- bichos (habilidade Criação)
// o que cada bicho dá (no dia seguinte a comer feno); filhote não dá nada
export function productOf(bicho) {
  if (!bicho || /baby|duckling|^chick(_|$)/.test(bicho)) return null
  const kind = bicho.split('_')[0]
  return { cow: 'leite', goat: 'leite', chicken: 'ovo', duck: 'ovo_pata', sheep: 'la' }[kind] ?? null
}
/** o que dá para fazer com o bicho agora: coletar (comeu ontem), alimentar, carinho, ou nada */
export function animalState(save, room, id, bicho, today) {
  const b = save.bichos?.[room]?.[id] ?? {}
  const prod = productOf(bicho)
  if (prod && b.comeu !== undefined && b.comeu < today && (b.coletou ?? -1) <= b.comeu) return 'coletar'
  if (b.comeu !== today && (prod || b.carinho === today)) return 'alimentar'
  if (b.carinho !== today) return 'carinho'
  return 'feliz'
}

// ---------------------------------------------------------------- amizade (NPCs)
export const HEART = 250
export const hearts = (pts) => Math.max(0, Math.min(10, Math.floor((pts ?? 0) / HEART)))
/** quanto um presente vale: o NPC pode ter "gosta" e "odeia" (listas de itens); comida feita agrada todo mundo */
export function giftPoints(npc, id) {
  if (npc.odeia?.includes(id) || id === 'lixo' || id === 'queimado') return -40
  if (npc.gosta?.includes(id)) return 80
  const t = BENS[id]?.tipo
  return t === 'prato' ? 45 : t === 'ferramenta' || t === 'semente' ? 5 : 20
}

// ---------------------------------------------------------------- loja
export const sellPrice = (save, cfg, id) =>
  Math.max(
    1,
    Math.round(
      (BENS[id]?.preco ?? 0) *
        (1 + bonus(save, cfg, 'comercio', 'moedas') / 100) *
        (BENS[id]?.tipo === 'prato' ? 1 + bonus(save, cfg, 'culinaria', 'moedas') / 100 : 1) *
        (BENS[id]?.tipo === 'bicho' ? 1 + bonus(save, cfg, 'criacao', 'moedas') / 100 : 1),
    ),
  )
export const buyPrice = (save, cfg, id) => Math.max(1, Math.round((BENS[id]?.compra ?? 1) * (1 - Math.min(60, bonus(save, cfg, 'comercio', 'desconto')) / 100)))

// ---------------------------------------------------------------- atividades nos mapas
// qual peça do mapa serve para quê (pelo nome "tema/peça"); o editor pode trocar em cada objeto
export const ACT_TYPES = [
  ['loja', 'Loja (vender e comprar)', /\/(mall_|market_|supermarket|kiosk_|lemonade_stand|ship_bar|fruit_flowers_cart)/],
  ['cozinha', 'Cozinhar', /\/(barbecue|hot_dog_cart|street_food_cart|hanging_cooking_pot|electric_plate|stove|oven|grill|pizza_tuk_tuk_\d)/],
  ['venda', 'Caixa de venda (paga na manhã seguinte)', /\/shipping_bin/],
  ['feno', 'Monte de feno (pega feno de graça)', /^fazenda_construcoes\/hay_(fresh|dry)_pile/],
  ['cama', 'Cama (dormir enche a energia)', /^$/],
  ['bau', 'Baú (guardar coisas)', /^$/],
  ['correio', 'Correio (pegar entregas)', /^post_office\/building|\/big_(blue|grey)_mailbox/],
  ['caixa_correio', 'Caixa de correio (destino de entrega)', /\/.*mailbox/],
  ['conserto', 'Conserto (quebra de vez em quando)', /\/(street_lamp|atm_|phone_booth|public_phone|ev_charging|electric_box|vending_machine)/],
]
export const actTypeOf = (theme, name) => ACT_TYPES.find(([, , re]) => re.test(`${theme}/${name}`))?.[0] ?? null
export const ACT_LABEL = Object.fromEntries(ACT_TYPES.map(([k, l]) => [k, l]))

// quanto tempo até quebrar de novo depois de consertado / o fantasma voltar
export const FIX_AGAIN_MS = 8 * 60000
export const GHOST_BACK_MS = 3 * 60000
