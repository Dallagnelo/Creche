// Como a interface do jogo da Turma 2.0 aparece (editável no "Editor da interface", só admin).
// Fica salva na mesma tabela dos mapas, numa linha especial com o código "_hud" (publicada, todo mundo lê).

export const HUD_CODE = '_hud'
export const HUD_PATH = '/limezu/editor/hud/' // peças recortadas do Modern User Interface
export const isMapRow = (row) => !row.code.startsWith('_')

export const POSITIONS = [
  ['topo-esq', 'Em cima, à esquerda'],
  ['topo-centro', 'Em cima, no meio'],
  ['topo-dir', 'Em cima, à direita'],
  ['baixo-esq', 'Embaixo, à esquerda'],
  ['baixo-centro', 'Embaixo, no meio'],
  ['baixo-dir', 'Embaixo, à direita'],
]

export const HUD_ICONS = [
  ['i_coracao_p', 'Coração'],
  ['i_coracao', 'Coração grande'],
  ['i_coxa', 'Coxinha'],
  ['i_raio', 'Raio'],
  ['i_cerebro', 'Cérebro'],
  ['i_estrela', 'Estrela'],
  ['i_moeda', 'Moeda'],
  ['i_relogio', 'Relógio'],
  ['i_livro', 'Livro'],
  ['i_presente', 'Presente'],
  ['i_engrenagem', 'Engrenagem'],
  ['i_mochila', 'Mochila'],
  ['i_pergunta', 'Interrogação'],
]
export const HUD_COLORS = [
  ['verde', 'Verde'],
  ['amarela', 'Amarela'],
  ['vermelha', 'Vermelha'],
  ['azul', 'Azul'],
]

// status: tipo "icones" (valor = quantos cheios, aceita meio: 3.5) ou "barra" (valor de 0 a 100)
export const HUD_DEFAULT = {
  v: 1,
  escala: 1,
  ficha: { mostrar: true, pos: 'topo-esq', aberta: false, nome: true, moedas: true, nivel: true, nivelValor: 1, xp: 35 },
  status: [
    { id: 'vida', rotulo: 'Vida', tipo: 'icones', icone: 'i_coracao_p', qtd: 5, valor: 5 },
    { id: 'fome', rotulo: 'Fome', tipo: 'icones', icone: 'i_coxa', qtd: 5, valor: 4 },
    { id: 'energia', rotulo: 'Energia', tipo: 'barra', icone: 'i_raio', cor: 'amarela', valor: 80 },
    { id: 'humor', rotulo: 'Humor', tipo: 'barra', icone: 'i_cerebro', cor: 'azul', valor: 65 },
  ],
  titulo: { mostrar: true, pos: 'topo-centro', hora: true },
  botoes: { mostrar: true, pos: 'topo-dir', mochila: true, classe: true, mapas: true, grade: true, tela: true, ajuda: true },
  barra: { mostrar: true, pos: 'baixo-centro', espacos: 8 },
  skills: { mostrar: true, pos: 'baixo-dir' },
  conversa: { rosto: true, velocidade: 28 },
  mochila: { espacos: 24, colunas: 6 },
}

const clampN = (v, a, b, d) => (Number.isFinite(Number(v)) ? Math.max(a, Math.min(b, Number(v))) : d)

/** junta o que foi salvo com o padrão (campos novos aparecem sozinhos) e corrige valores fora do lugar */
export function normalizeHud(raw) {
  const d = HUD_DEFAULT
  const r = raw && typeof raw === 'object' ? raw : {}
  const merge = (k) => ({ ...d[k], ...(r[k] ?? {}) })
  const out = {
    v: 1,
    escala: clampN(r.escala, 0.5, 2, 1),
    ficha: merge('ficha'),
    status: Array.isArray(r.status) ? r.status.map((s, i) => ({ id: s.id ?? `s${i}`, rotulo: '', tipo: 'barra', icone: '', cor: 'verde', qtd: 5, valor: 50, ...s })) : d.status,
    titulo: merge('titulo'),
    botoes: merge('botoes'),
    barra: merge('barra'),
    skills: merge('skills'),
    conversa: merge('conversa'),
    mochila: merge('mochila'),
  }
  out.barra.espacos = clampN(out.barra.espacos, 1, 9, 8)
  out.mochila.espacos = clampN(out.mochila.espacos, 6, 60, 24)
  out.mochila.colunas = clampN(out.mochila.colunas, 3, 10, 6)
  out.conversa.velocidade = clampN(out.conversa.velocidade, 0, 200, 28)
  return out
}
