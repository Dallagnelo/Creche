import { T } from '../../../lib/turma2/assets'

// Listas, textos e contas do editor de mapas (sem React).
// ícones da fazenda em 24 e 32 px: só para a interface (mochila, loja), não aparecem no editor
export const HUD_ONLY = /^fazenda_icones_\d+$/

export const TOOLS = [
  ['select', '🖱️', 'Selecionar e mover', 'v'],
  ['object', '🪑', 'Colocar objeto', 'o'],
  ['anim', '✨', 'Colocar animado', 'a'],
  ['terrain', '🖌️', 'Pintar chão', 'p'],
  ['water', '🌊', 'Água (lago ou mar)', 'g'],
  ['block', '🚧', 'Onde dá para andar', 'b'],
  ['light', '💡', 'Luz da noite', 'l'],
  ['door', '🚪', 'Porta para outro mapa', 'd'],
  ['patrol', '🚤', 'Vai e volta', 'r'],
  ['traffic', '🚗', 'Trânsito (carro, barco)', 't'],
  ['npc', '🧑', 'Personagem (NPC)', 'c'],
  ['item', '🎁', 'Item para pegar', 'i'],
  ['spawn', '📍', 'Onde o jogador nasce', 'n'],
  ['hand', '✋', 'Arrastar a vista', 'h'],
]
export const HELP = {
  select: 'Clique numa coisa para escolher; arraste para mover. Setas movem 1 px (Shift: 16). Delete apaga, Ctrl+D duplica. Arrastar o vazio move a vista.',
  object: 'Escolha uma peça na biblioteca e clique no mapa para colocar (pode colocar várias). Botão direito ou Esc volta a selecionar.',
  anim: 'Escolha um animado na biblioteca e clique no mapa. Fogueira, bandeira, fantasma, pássaro…',
  terrain: 'Escolha o chão e pinte arrastando. As bordas se ajustam sozinhas. Borracha apaga. "Horta" é onde dá para plantar; quem pisa na beira da água pode pescar.',
  water: 'Arraste um retângulo. Lago tem margem em volta; mar tem areia só em cima. Ninguém anda na água.',
  block: 'Pinte de vermelho onde não dá para andar e de verde onde dá (por cima do automático). "Automático" desfaz o ajuste.',
  light: 'Clique para pôr uma luz. Ela só aparece no fim de tarde e à noite.',
  door: 'Clique no quadradinho da porta. Quem pisar ali vai para o mapa escolhido, no ponto escolhido.',
  patrol: 'Escolha um animado (barco, carro, bicho) e arraste na horizontal: ele vai e volta nesse trecho.',
  traffic: 'Escolha um carro (peça) ou um barco (animado) e clique na faixa: ele atravessa o mapa inteiro sem parar, sempre na mesma direção. Velocidade negativa vai para a esquerda.',
  npc: 'Clique num quadradinho para pôr um personagem. Depois escolha o visual, o nome, o que ele fala e se fica parado, passeia, sentado ou no celular.',
  item: 'Moeda ou peça da biblioteca que o jogador pega ao passar por cima (vai para a mochila). Escolha abaixo e clique no mapa.',
  spawn: 'Clique onde o jogador aparece quando entra no mapa.',
  hand: 'Arraste para mover a vista. Roda do mouse dá zoom (também funciona em qualquer ferramenta).',
}
export const KIND_LIST = { object: 'objects', anim: 'anims', patrol: 'patrols', traffic: 'traffic', light: 'lights', door: 'doors', water: 'water', npc: 'npcs', item: 'items' }
export const KIND_NAME = { object: 'Objeto', anim: 'Animado', patrol: 'Vai e volta', traffic: 'Trânsito', light: 'Luz', door: 'Porta', water: 'Água', npc: 'Personagem', item: 'Item para pegar' }
export const TILE_KINDS = new Set(['door', 'water', 'npc', 'item']) // posição em quadradinhos (o resto é em px)
export const MODOS = [
  ['parado', 'Parado (vira para quem chega)'],
  ['passeia', 'Passeia por perto'],
  ['senta', 'Sentado'],
  ['celular', 'No celular'],
]
export const ZOOMS = [0.5, 1, 1.5, 2, 3, 4, 5, 6]
export const DRAFT_KEY = 't2-editor-rascunho'
export const MAX_SIDE = 160

export const uid = () => Math.random().toString(36).slice(2, 9)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',')
export const rgbToHex = (rgb) => `#${(rgb ?? '255,200,120').split(',').map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
export const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)

export function resizeMap(map, w, h) {
  const terrain = {}
  for (const [id, layer] of Object.entries(map.terrain ?? {})) {
    let s = ''
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) s += x < map.w && y < map.h ? layer[y * map.w + x] : '0'
    terrain[id] = s
  }
  const block = {}
  for (const [k, v] of Object.entries(map.block ?? {})) {
    const [x, y] = k.split(',').map(Number)
    if (x < w && y < h) block[k] = v
  }
  return { ...map, w, h, terrain, block, spawn: [Math.min(map.spawn[0], w - 1), Math.min(map.spawn[1], h - 1)] }
}

/** caixa (em px) de cada coisa do mapa, para clicar e desenhar a seleção */
export function boxOf(kind, it, lib) {
  if (kind === 'object') {
    const r = lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
    return r ? [it.x, it.y, r[2], r[3]] : [it.x, it.y, 16, 16]
  }
  if (kind === 'anim') {
    const r = lib.anims[it.n]
    return r ? [it.x, it.y, it.fw ?? r[3], r[4]] : [it.x, it.y, 16, 16]
  }
  if (kind === 'patrol') {
    const r = lib.anims[it.r]
    const fw = r?.[3] ?? 16
    const fh = r?.[4] ?? 16
    return [it.x0, it.y - fh, it.x1 - it.x0 + fw, fh]
  }
  if (kind === 'traffic') {
    const [w, h] = trafficSize(it, lib)
    return [it.x, it.y, w, h]
  }
  if (kind === 'light') return [it.x - 6, it.y - 6, 12, 12]
  if (kind === 'door') return [it.x * T, it.y * T, T, T]
  if (kind === 'water') return [it.x * T, it.y * T, it.w * T, it.h * T]
  if (kind === 'npc') return [it.x * T, it.y * T - T, T, T * 2]
  if (kind === 'item') return [it.x * T, it.y * T, T, T]
  return [0, 0, 0, 0]
}

/** tamanho de quem anda no trânsito: peça (carro) ou um quadro do animado (barco) */
export function trafficSize(it, lib) {
  if (it.a) {
    const r = lib.anims[it.a]
    return r ? [it.fw ?? r[3], r[4]] : [16, 16]
  }
  const r = lib[it.src ?? 'pecas']?.[it.t]?.[it.n]
  return r ? [r[2], r[3]] : [16, 16]
}

/** onde fica a luz de uma peça: no meio dela, mais o deslocamento (l[2], l[3]) se tiver */
export const lightAt = (x, y, w, h, l) => [x + w / 2 + (l[2] ?? 0), y + h / 2 + (l[3] ?? 0), l[0], l[1]]

// quanto do pé de um objeto bloqueia, por padrão (o resto o boneco passa por trás)
export const defaultDepth = (h) => (h <= 32 ? 1 : Math.ceil(h / T / 2))

/** procura a versão "para a esquerda" de um animado que vai para a direita */
export function leftOf(name, anims) {
  for (const [a, b] of [['right', 'left'], ['_r_', '_l_'], ['_r', '_l']]) {
    const guess = name.replace(a, b)
    if (guess !== name && anims[guess]) return guess
  }
  return name
}

export function placeAt(w, bw, bh, snap) {
  // o pé da peça fica no quadradinho do mouse, centralizada nele
  if (snap === 1) return [Math.round(w.x - bw / 2), Math.round(w.y - bh / 2)]
  const x = Math.round((w.x - bw / 2) / snap) * snap
  const foot = (Math.floor(w.y / snap) + 1) * snap
  return [x, foot - bh]
}

export function setBlock(m, x, y, mode) {
  const k = `${x},${y}`
  const cur = m.block[k]
  if (mode === -1) {
    if (cur === undefined) return m
    const block = { ...m.block }
    delete block[k]
    return { ...m, block }
  }
  if (cur === mode) return m
  return { ...m, block: { ...m.block, [k]: mode } }
}
