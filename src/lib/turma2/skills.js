// Habilidades da Turma 2.0 (no lugar das classes): cada um upa o que quiser, fazendo a coisa.
// Pescou → XP de Pesca; cozinhou → XP de Culinária… A cada 10 níveis libera uma passiva que ajuda
// naquela habilidade, e no nível 25 libera um visual (roupa) para vestir.
// Ficam salvas na tabela dos mapas, na linha especial "_skills" (publicada: todo mundo lê, só o admin muda).

export const SKILLS_CODE = '_skills'
export const MAX_LEVEL = 50

// tipos de passiva (o valor é em %): o que cada um faz depende da habilidade (veja TIPO_AJUDA)
export const TIPOS = [
  ['facil', 'Mais fácil', '% mais tempo / alvo maior no minijogo'],
  ['dobro', 'Dobro', '% de chance de sair em dobro'],
  ['raro', 'Mais raro', '% mais chance de coisa rara'],
  ['moedas', 'Mais moedas', '% a mais de moedas'],
  ['rapido', 'Mais rápido', '% mais rápido'],
  ['desconto', 'Desconto', '% de desconto na loja'],
  ['xp', 'Mais XP', '% a mais de XP'],
]

/** XP para ir do nível l para o l+1 (nível 10 ≈ 40 ações; nível 50 ≈ 2 mil) */
export const xpToNext = (l) => Math.round(8 * l ** 1.5 + 12)
const TOTAL = [0]
for (let l = 1; l <= MAX_LEVEL; l += 1) TOTAL.push(TOTAL[l - 1] + xpToNext(l))
/** XP total para chegar ao nível l */
export const xpAt = (l) => TOTAL[Math.max(0, Math.min(MAX_LEVEL, l) - 1)]

/** nível (1 a 50) e quanto falta: { nivel, dentro, falta, pct } */
export function levelOf(xp = 0) {
  let l = 1
  while (l < MAX_LEVEL && xp >= xpAt(l + 1)) l += 1
  if (l >= MAX_LEVEL) return { nivel: MAX_LEVEL, dentro: 0, falta: 0, pct: 1 }
  const dentro = xp - xpAt(l)
  const need = xpToNext(l)
  return { nivel: l, dentro, falta: need - dentro, pct: dentro / need }
}

const pas = (nivel, nome, desc, tipo, valor) => ({ nivel, nome, desc, tipo, valor })
const look = (nivel, nome, roupa, acessorio = null) => ({ nivel, nome, roupa, acessorio })

export const DEFAULT_SKILLS = {
  v: 1,
  skills: [
    {
      id: 'pesca', nome: 'Pesca', cor: '#4fc3ff', icone: 'i_relogio', verbo: 'Pescar',
      desc: 'Pesque nos lagos, no mar e nos deques. Peixe raro vale mais.',
      passivas: [
        pas(10, 'Mão firme', 'Mais tempo para puxar quando o peixe morde.', 'facil', 25),
        pas(20, 'Isca boa', 'Peixes raros aparecem mais.', 'raro', 30),
        pas(30, 'Rede', 'Às vezes vêm dois peixes de uma vez.', 'dobro', 15),
        pas(40, 'Olho de pescador', 'Peixes raros aparecem bem mais.', 'raro', 60),
        pas(50, 'Lenda do lago', 'Dois peixes com muito mais frequência.', 'dobro', 30),
      ],
      visual: look(25, 'Pescador', 'outfit_22_04', 'accessory_11_beanie_03'),
    },
    {
      id: 'culinaria', nome: 'Culinária', cor: '#ffb15c', icone: 'i_coxa', verbo: 'Cozinhar',
      desc: 'Cozinhe na churrasqueira, no carrinho de cachorro-quente ou na fogueira. Prato vale mais que o ingrediente.',
      passivas: [
        pas(10, 'Fogo baixo', 'O ponto certo fica maior (queima menos).', 'facil', 25),
        pas(20, 'Tempero da casa', 'Seus pratos valem mais na loja.', 'moedas', 15),
        pas(30, 'Porção dupla', 'Às vezes sai prato em dobro.', 'dobro', 15),
        pas(40, 'Chef', 'O ponto certo fica bem maior.', 'facil', 50),
        pas(50, 'Estrela', 'Prato em dobro com muito mais frequência.', 'dobro', 30),
      ],
      visual: look(25, 'Chef', 'outfit_12_01', 'accessory_18_chef_01'),
    },
    {
      id: 'jardinagem', nome: 'Jardinagem', cor: '#7be36a', icone: 'i_estrela', verbo: 'Plantar',
      desc: 'Plante sementes na horta, regue e colha quando estiver pronto (o tempo passa mesmo com o jogo fechado).',
      passivas: [
        pas(10, 'Mão verde', 'As plantas crescem mais rápido.', 'rapido', 15),
        pas(20, 'Adubo', 'Às vezes a colheita vem em dobro.', 'dobro', 15),
        pas(30, 'Estufa', 'Crescem bem mais rápido.', 'rapido', 30),
        pas(40, 'Colheita farta', 'Colheita em dobro com mais frequência.', 'dobro', 30),
        pas(50, 'Jardineiro mestre', 'Crescem na metade do tempo.', 'rapido', 50),
      ],
      visual: look(25, 'Jardineiro', 'outfit_23_01', 'accessory_05_dino_snapback_01'),
    },
    {
      id: 'criacao', nome: 'Criação', cor: '#f2a65a', icone: 'i_coracao', verbo: 'Cuidar',
      desc: 'Cuide dos bichos: carinho todo dia e um feno por dia. No dia seguinte tem ovo, leite ou lã para coletar.',
      passivas: [
        pas(10, 'Jeito com bicho', 'Carinho e coleta dão mais XP.', 'xp', 20),
        pas(20, 'Ração boa', 'Às vezes o bicho dá produto em dobro.', 'dobro', 15),
        pas(30, 'Feira', 'Ovos, leite e lã valem mais.', 'moedas', 20),
        pas(40, 'Fazendeiro', 'Produto em dobro com mais frequência.', 'dobro', 30),
        pas(50, 'Rei do curral', 'Os produtos valem muito mais.', 'moedas', 45),
      ],
      visual: look(25, 'Fazendeiro', 'outfit_23_04', 'accessory_04_snapback_02'),
    },
    {
      id: 'entregas', nome: 'Entregas', cor: '#ff8a3d', icone: 'i_presente', verbo: 'Entregar',
      desc: 'Pegue pacotes no correio e leve até a pessoa ou a caixa de correio certa antes do tempo acabar.',
      passivas: [
        pas(10, 'Tênis novo', 'Você anda mais rápido (em todo lugar).', 'rapido', 8),
        pas(20, 'Gorjeta', 'Ganha mais moedas por entrega.', 'moedas', 20),
        pas(30, 'Atalho', 'Anda ainda mais rápido.', 'rapido', 15),
        pas(40, 'Cliente fiel', 'Gorjetas bem maiores.', 'moedas', 40),
        pas(50, 'Expresso', 'O mais rápido da cidade.', 'rapido', 25),
      ],
      visual: look(25, 'Carteiro', 'outfit_04_02', 'accessory_04_snapback_02'),
    },
    {
      id: 'mecanica', nome: 'Mecânica', cor: '#ffc23d', icone: 'i_engrenagem', verbo: 'Consertar',
      desc: 'Postes, caixas eletrônicos e telefones quebram de vez em quando. Conserte e ganhe pelo serviço.',
      passivas: [
        pas(10, 'Mão boa', 'Mais tempo para acertar a sequência.', 'facil', 20),
        pas(20, 'Orçamento', 'Ganha mais por conserto.', 'moedas', 20),
        pas(30, 'Hora extra', 'Às vezes pagam em dobro.', 'dobro', 20),
        pas(40, 'Especialista', 'Bem mais tempo para acertar.', 'facil', 40),
        pas(50, 'Engenheiro', 'Ganha muito mais por conserto.', 'moedas', 50),
      ],
      visual: look(25, 'Mecânico', 'outfit_16_01', 'accessory_14_gloves_01'),
    },
    {
      id: 'comercio', nome: 'Comércio', cor: '#ffe08a', icone: 'i_moeda', verbo: 'Vender',
      desc: 'Venda o que você pescou, plantou e cozinhou nas lojas e quiosques. Cada moeda ganha vira XP.',
      passivas: [
        pas(10, 'Lábia', 'Vende um pouco mais caro.', 'moedas', 5),
        pas(20, 'Freguês', 'Desconto nas compras.', 'desconto', 10),
        pas(30, 'Negociante', 'Vende mais caro.', 'moedas', 12),
        pas(40, 'Atacado', 'Desconto maior nas compras.', 'desconto', 20),
        pas(50, 'Magnata', 'Vende bem mais caro.', 'moedas', 25),
      ],
      visual: look(25, 'Empresário', 'outfit_02_01', 'accessory_08_detective_hat_01'),
    },
    {
      id: 'coragem', nome: 'Coragem', cor: '#b98cff', icone: 'i_cerebro', verbo: 'Enfrentar',
      desc: 'À noite os fantasmas saem das covas. Enfrente: acerte o tempo três vezes e ele foge, deixando moedas.',
      passivas: [
        pas(10, 'Sem medo', 'O alvo fica maior.', 'facil', 20),
        pas(20, 'Caçador', 'Fantasmas deixam mais moedas.', 'moedas', 25),
        pas(30, 'Gosma extra', 'Mais chance de deixar gosma de fantasma.', 'dobro', 25),
        pas(40, 'Destemido', 'O alvo fica bem maior.', 'facil', 40),
        pas(50, 'Exorcista', 'Moedas de sobra.', 'moedas', 60),
      ],
      visual: look(25, 'Caça-fantasmas', 'outfit_30_01', 'accessory_07_bataclava_01'),
    },
  ],
}

const num = (v, d, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(v)) ? Number(v) : d))

function normalizeSkill(o, def) {
  const d = def ?? DEFAULT_SKILLS.skills[0]
  const passivas = (Array.isArray(o.passivas) ? o.passivas : d.passivas).map((p, i) => ({
    nivel: num(p.nivel, (i + 1) * 10, 1, MAX_LEVEL),
    nome: String(p.nome ?? 'Passiva'),
    desc: String(p.desc ?? ''),
    tipo: TIPOS.some((t) => t[0] === p.tipo) ? p.tipo : 'facil',
    valor: num(p.valor, 10, 0, 300),
  }))
  passivas.sort((a, b) => a.nivel - b.nivel)
  const v = o.visual === null ? null : { ...(d.visual ?? {}), ...(o.visual ?? {}) }
  return {
    id: d.id,
    nome: String(o.nome ?? d.nome),
    cor: String(o.cor ?? d.cor),
    icone: String(o.icone ?? d.icone),
    verbo: d.verbo,
    desc: String(o.desc ?? d.desc),
    passivas,
    visual: v && v.roupa ? { nivel: num(v.nivel, 25, 1, MAX_LEVEL), nome: String(v.nome ?? 'Visual'), roupa: v.roupa, acessorio: v.acessorio ?? null } : null,
  }
}

/** as 7 habilidades são fixas (o jogo sabe o que cada uma faz); o admin muda nome, cor, ícone, passivas e visual */
export function normalizeSkills(raw) {
  const list = Array.isArray(raw?.skills) ? raw.skills : []
  return { v: 1, skills: DEFAULT_SKILLS.skills.map((d) => normalizeSkill(list.find((s) => s.id === d.id) ?? d, d)) }
}

export const skillById = (cfg, id) => cfg.skills.find((s) => s.id === id)
export const levelIn = (save, id) => levelOf(save?.xp?.[id] ?? 0).nivel
export const totalLevel = (save, cfg) => cfg.skills.reduce((s, sk) => s + levelIn(save, sk.id), 0)

/** soma das passivas liberadas de um tipo (em %) */
export function bonus(save, cfg, id, tipo) {
  const sk = skillById(cfg, id)
  if (!sk) return 0
  const lv = levelIn(save, id)
  return sk.passivas.filter((p) => p.tipo === tipo && p.nivel <= lv).reduce((s, p) => s + p.valor, 0)
}

/** soma XP; devolve o save novo e os níveis que subiu (para a festa na tela) */
export function addXp(save, cfg, id, amount) {
  const extra = (1 + bonus(save, cfg, id, 'xp') / 100) * (save?.rpg?.classe === 'programador' ? 1.1 : 1) // Programador: +10% XP
  const gain = Math.max(1, Math.round(amount * extra))
  const before = levelIn(save, id)
  const next = { ...save, xp: { ...save.xp, [id]: (save.xp?.[id] ?? 0) + gain } }
  const after = levelIn(next, id)
  const sk = skillById(cfg, id)
  const unlocked = sk ? sk.passivas.filter((p) => p.nivel > before && p.nivel <= after) : []
  const visual = sk?.visual && sk.visual.nivel > before && sk.visual.nivel <= after ? sk.visual : null
  return { save: next, gain, up: after > before ? after : 0, unlocked, visual }
}

/** veste o visual liberado (por cima do personagem da pessoa) */
export function applyLook(char, save, cfg) {
  const id = save?.veste
  if (!id || !char || char.pronto) return char
  const sk = skillById(cfg, id)
  if (!sk?.visual || levelIn(save, id) < sk.visual.nivel) return char
  return { ...char, roupa: sk.visual.roupa, acessorio: sk.visual.acessorio ?? null }
}
