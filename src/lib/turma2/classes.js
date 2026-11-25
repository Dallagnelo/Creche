// Classes da Turma 2.0 (profissões de hoje em dia, cada uma com 2 evoluções).
// Ficam salvas na tabela dos mapas, na linha especial "_classes" (publicada: todo mundo lê, só o admin muda).
// Por enquanto os bônus e as habilidades são só informação; as regras do jogo vêm depois.

export const CLASSES_CODE = '_classes'
export const STAGES = [
  ['base', 'Base'],
  ['a', 'Evolução A'],
  ['b', 'Evolução B'],
]
export const BONUS = [
  ['vida', 'Vida', 'corações a mais'],
  ['energia', 'Energia', '% a mais'],
  ['fome', 'Fome', '% mais lenta'],
  ['humor', 'Humor', '% a mais'],
  ['velocidade', 'Velocidade', '% mais rápido'],
]

// efeitos visuais das habilidades (desenhados no mapa quando a pessoa usa): [id, nome, cor padrão]
export const EFFECTS = [
  ['cura', 'Cura (cruzes e corações subindo)', '#49e07a'],
  ['escudo', 'Escudo (bolha em volta)', '#6fb6ff'],
  ['velocidade', 'Velocidade (rastro e poeira)', '#ffd34d'],
  ['area', 'Área (anel no chão)', '#ff9a3d'],
  ['projetil', 'Arremesso (voa e estoura)', '#b98cff'],
  ['agua', 'Jato de água', '#4fc3ff'],
  ['ajudante', 'Ajudante (drone em volta)', '#5eead4'],
  ['revelar', 'Revelar (lupa e brilhos)', '#ffe08a'],
  ['humor', 'Humor (notas e estrelas)', '#ff7ad1'],
  ['hacker', 'Hacker (0101 e faíscas)', '#3dff8a'],
  ['comida', 'Comida (vapor e cheirinho)', '#ffb15c'],
]
export const effectColor = (id) => EFFECTS.find((e) => e[0] === id)?.[2] ?? '#5eead4'

const stage = (nome, roupa, acessorio, desc = '', habilidades = []) => ({ nome, desc, roupa, acessorio, habilidades })
// habilidade: ícone = peça da biblioteca [tema, nome] (ou { hud: 'i_raio' }), efeito, recarga (s), custo (energia), alcance (quadradinhos)
const hab = (nome, desc, icone = null, efeito = 'area', recarga = 8, custo = 10, alcance = 3) => ({
  nome,
  desc,
  icone: Array.isArray(icone) ? { src: 'pecas', t: icone[0], n: icone[1] } : icone,
  efeito,
  cor: effectColor(efeito),
  recarga,
  custo,
  alcance,
})

export const DEFAULT_CLASSES = {
  v: 1,
  nivelEvolucao: 10,
  classes: [
    {
      id: 'medico', nome: 'Médico', papel: 'Cura', cor: '#3fd6a8', icone: 'i_coracao_p', uniforme: true,
      desc: 'Cuida da turma: recupera a vida de quem está perto.',
      modelo: { corpo: 'body_02', olhos: 'eyes_03', cabelo: 'hairstyle_05_02' },
      bonus: { vida: 1, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Médico', 'outfit_08_01', null, 'Jaleco branco, pronto para atender.', [hab('Primeiros socorros', 'Recupera um pouco de vida de alguém perto.', ['military_base', 'military_tent_first_aid_kit_red'], 'cura', 6, 10, 2)]),
      a: stage('Cirurgião', 'outfit_13_01', 'accessory_17_medical_mask_01', 'Cura forte em uma pessoa.', [hab('Cirurgia', 'Cura muito uma pessoa.', ['hotel_and_hospital', 'stretcher_5'], 'cura', 14, 25, 1), hab('Reanimar', 'Levanta quem caiu.', ['military_base', 'military_tent_first_aid_kit_green'], 'cura', 40, 40, 1)]),
      b: stage('Socorrista', 'outfit_09_01', 'accessory_04_snapback_02', 'Cura em área e corre mais.', [hab('Atendimento em grupo', 'Cura um pouco todos por perto.', ['military_base', 'military_tent_first_aid_kit_dark_green'], 'area', 12, 20, 4)]),
    },
    {
      id: 'bombeiro', nome: 'Bombeiro', papel: 'Tank', cor: '#ff5a4e', icone: 'i_coracao', uniforme: true,
      desc: 'Aguenta o tranco: muita vida e protege o grupo.',
      modelo: { corpo: 'body_04', olhos: 'eyes_01', cabelo: 'hairstyle_12_01' },
      bonus: { vida: 3, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Bombeiro', 'outfit_16_02', null, 'Macacão de proteção.', [hab('Segurar a barra', 'Leva menos dano por um tempo.', { hud: 'i_coracao' }, 'escudo', 12, 15, 1)]),
      a: stage('Comandante de Resgate', 'outfit_16_03', 'accessory_06_policeman_hat_04', 'Protege quem está perto.', [hab('Escudo do grupo', 'Divide o dano com os amigos perto.', ['worksite', 'helmet_2'], 'escudo', 18, 25, 3)]),
      b: stage('Brigadista', 'outfit_16_01', 'accessory_14_gloves_01', 'Passa por fogo e abre caminhos.', [hab('Apagar fogo', 'Apaga fogo e tira entulho do caminho.', ['fire_station', 'fire_hydrant'], 'agua', 8, 15, 4)]),
    },
    {
      id: 'engenheiro', nome: 'Engenheiro', papel: 'Defesa / construção', cor: '#ffc23d', icone: 'i_engrenagem', uniforme: true,
      desc: 'Monta coisas no mapa: barreiras, pontes e máquinas.',
      modelo: { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_08_03' },
      bonus: { vida: 1, energia: 10, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Engenheiro', 'outfit_23_01', null, 'Roupa de campo.', [hab('Montar barreira', 'Coloca uma barreira no chão.', ['city_props', 'cone_3'], 'escudo', 10, 15, 1)]),
      a: stage('Engenheiro Civil', 'outfit_04_02', 'accessory_04_snapback_04', 'Pontes e escudos.', [hab('Ponte', 'Atravessa água e buracos.', ['worksite', 'tool_box_1'], 'area', 20, 25, 3)]),
      b: stage('Engenheiro Mecatrônico', 'outfit_20_03', 'accessory_15_glasses_02', 'Drones e torretas.', [hab('Drone ajudante', 'Um drone que ajuda sozinho.', ['city_props', 'drone_1'], 'ajudante', 25, 30, 3)]),
    },
    {
      id: 'policial', nome: 'Policial', papel: 'Controle', cor: '#4d8dff', icone: 'i_estrela', uniforme: true,
      desc: 'Segura e atrasa os inimigos.',
      modelo: { corpo: 'body_01', olhos: 'eyes_05', cabelo: 'hairstyle_02_01' },
      bonus: { vida: 1, energia: 0, fome: 0, humor: 0, velocidade: 5 },
      base: stage('Policial', 'outfit_19_01', 'accessory_06_policeman_hat_01', 'Farda azul e quepe.', [hab('Apito', 'Faz os inimigos pararem um instante.', ['police_station', 'siren_1'], 'area', 10, 10, 4)]),
      a: stage('Tático', 'outfit_30_01', 'accessory_07_bataclava_01', 'Mais dano e precisão.', [hab('Investida', 'Avança e acerta forte.', ['military_base', 'soldier_helmet'], 'velocidade', 8, 15, 3)]),
      b: stage('Investigador', 'outfit_18_01', 'accessory_08_detective_hat_01', 'Acha segredos e itens escondidos.', [hab('Lupa', 'Mostra o que está escondido por perto.', { hud: 'i_pergunta' }, 'revelar', 15, 10, 6)]),
    },
    {
      id: 'programador', nome: 'Programador', papel: 'Utilidade', cor: '#a97bff', icone: 'i_engrenagem', uniforme: true,
      desc: 'Mexe em aparelhos: portas, painéis e câmeras.',
      modelo: { corpo: 'body_02', olhos: 'eyes_04', cabelo: 'hairstyle_15_02' },
      bonus: { vida: 0, energia: 10, fome: 0, humor: 5, velocidade: 0 },
      base: stage('Programador', 'outfit_21_01', 'accessory_15_glasses_01', 'Moletom e óculos.', [hab('Acessar painel', 'Usa painéis e computadores do mapa.', ['subway_and_train_station', 'monitor'], 'hacker', 5, 5, 1)]),
      a: stage('Hacker', 'outfit_27_01', 'accessory_11_beanie_01', 'Abre o que está trancado.', [hab('Invadir', 'Abre portas trancadas e desliga armadilhas.', ['subway_and_train_station', 'control_small_monitor'], 'hacker', 12, 20, 2)]),
      b: stage('Dev de IA', 'outfit_21_03', 'accessory_10_bolt_01', 'Um assistente robô ajuda.', [hab('Assistente', 'Um ajudante que pega itens perto.', ['city_props', 'drone_3'], 'ajudante', 25, 25, 4)]),
    },
    {
      id: 'atleta', nome: 'Atleta', papel: 'Velocidade / dano', cor: '#ff8a3d', icone: 'i_raio', uniforme: true,
      desc: 'Corre mais e cansa menos.',
      modelo: { corpo: 'body_07', olhos: 'eyes_02', cabelo: 'hairstyle_20_01' },
      bonus: { vida: 0, energia: 20, fome: 0, humor: 0, velocidade: 10 },
      base: stage('Atleta', 'outfit_25_01', null, 'Camisa de time.', [hab('Arrancada', 'Corre muito rápido por um instante.', ['camping', 'ball_2'], 'velocidade', 6, 15, 1)]),
      a: stage('Velocista', 'outfit_31_03', 'accessory_11_beanie_03', 'O mais rápido do jogo.', [hab('Turbo', 'Arrancadas seguidas.', ['swimming_pool', 'starting_block_1'], 'velocidade', 10, 25, 1)]),
      b: stage('Lutador', 'outfit_32_05', 'accessory_14_gloves_02', 'Dano corpo a corpo alto.', [hab('Soco', 'Acerta forte quem está do lado.', { hud: 'i_raio' }, 'area', 4, 10, 1)]),
    },
    {
      id: 'chef', nome: 'Chef', papel: 'Suporte de fome', cor: '#f4ead2', icone: 'i_coxa', uniforme: true,
      desc: 'Comida feita por ele enche mais a fome.',
      modelo: { corpo: 'body_04', olhos: 'eyes_06', cabelo: 'hairstyle_25_03' },
      bonus: { vida: 0, energia: 0, fome: 20, humor: 5, velocidade: 0 },
      base: stage('Chef', 'outfit_12_01', 'accessory_18_chef_01', 'Dólmã e chapéu.', [hab('Cozinhar', 'Transforma ingredientes em comida.', ['camping', 'hanging_cooking_pot_1'], 'comida', 10, 10, 1)]),
      a: stage('Chef Estrelado', 'outfit_12_03', 'accessory_18_chef_02', 'Pratos com bônus fortes.', [hab('Prato especial', 'Comida que dá vida e energia.', ['camping', 'hanging_cooking_pot_3'], 'comida', 20, 20, 2)]),
      b: stage('Food Truck', 'outfit_10_03', 'accessory_04_snapback_01', 'Vende comida e ganha moedas.', [hab('Vender', 'Vende comida para os NPCs.', ['vehicles', 'pizza_tuk_tuk_props_1'], 'comida', 15, 10, 3)]),
    },
    {
      id: 'streamer', nome: 'Streamer', papel: 'Suporte de humor', cor: '#ff6fc1', icone: 'i_cerebro', uniforme: true,
      desc: 'Deixa todo mundo de bom humor.',
      modelo: { corpo: 'body_03', olhos: 'eyes_07', cabelo: 'hairstyle_28_05' },
      bonus: { vida: 0, energia: 0, fome: 0, humor: 20, velocidade: 0 },
      base: stage('Streamer', 'outfit_24_01', 'accessory_11_beanie_02', 'Visual de live.', [hab('Ao vivo', 'Sobe o humor de quem está perto.', ['beach', 'small_loudspeaker'], 'humor', 10, 10, 3)]),
      a: stage('Influenciador', 'outfit_24_04', 'accessory_15_glasses_04', 'Bônus para o grupo todo.', [hab('Viralizar', 'Bônus para todos no mapa.', ['beach', 'medium_loudspeaker'], 'humor', 30, 30, 8)]),
      b: stage('Comediante', 'outfit_28_01', 'accessory_19_party_cone_01', 'Recupera o humor rápido.', [hab('Piada', 'Distrai inimigos e diverte a turma.', ['beach', 'music_box'], 'humor', 8, 10, 3)]),
    },
    {
      id: 'cientista', nome: 'Cientista', papel: 'Dano à distância', cor: '#7be36a', icone: 'i_livro', uniforme: true,
      desc: 'Usa frascos e aparelhos de longe.',
      modelo: { corpo: 'body_07', olhos: 'eyes_03', cabelo: 'hairstyle_18_02' },
      bonus: { vida: 0, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Cientista', 'outfit_15_01', 'accessory_15_glasses_03', 'Jaleco e óculos.', [hab('Frasco', 'Joga um frasco de longe.', ['camping', 'bottle_1'], 'projetil', 5, 10, 5)]),
      a: stage('Químico', 'outfit_15_03', 'accessory_16_monocle_01', 'Frascos com efeitos.', [hab('Espuma', 'Deixa os inimigos lentos.', ['camping', 'bottle_3'], 'projetil', 10, 15, 5)]),
      b: stage('Biólogo', 'outfit_23_04', 'accessory_05_dino_snapback_01', 'Plantas, bichos e remédios.', [hab('Remédio natural', 'Faz remédios com plantas.', ['villas', 'potted_plant_1'], 'cura', 15, 15, 2)]),
    },
  ],
}

const str = (v, d = '') => (typeof v === 'string' ? v : d)
const num = (v, a, b, d) => (Number.isFinite(Number(v)) ? Math.max(a, Math.min(b, Number(v))) : d)
export function normSkill(h) {
  const efeito = EFFECTS.some((e) => e[0] === h.efeito) ? h.efeito : 'area'
  const icone = h.icone && typeof h.icone === 'object' ? (h.icone.hud ? { hud: str(h.icone.hud) } : h.icone.n ? { src: h.icone.src ?? 'pecas', t: str(h.icone.t), n: str(h.icone.n) } : null) : null
  return {
    nome: str(h.nome),
    desc: str(h.desc),
    icone,
    efeito,
    cor: /^#[0-9a-f]{6}$/i.test(h.cor ?? '') ? h.cor : effectColor(efeito),
    recarga: num(h.recarga, 0, 600, 8),
    custo: num(h.custo, 0, 100, 10),
    alcance: num(h.alcance, 1, 12, 3),
  }
}

/** as 3 skills da barra (Q, E, R): até 2 da base e a primeira da evolução (trancada sem evolução) */
export function skillBar(cls, char) {
  if (!cls) return []
  const st = stageOf(char)
  const base = cls.base.habilidades.slice(0, 2).map((h) => ({ ...h, locked: false }))
  const evoKey = st === 'base' ? null : st
  const evo = evoKey ? cls[evoKey].habilidades[0] : cls.a.habilidades[0] ?? cls.b.habilidades[0]
  // posições fixas: Q e E são da base, R é da evolução (espaço vazio = null)
  return [base[0] ?? null, base[1] ?? null, evo ? { ...evo, locked: !evoKey } : null]
}

function normStage(s, fallbackName) {
  const o = s && typeof s === 'object' ? s : {}
  return {
    nome: str(o.nome, fallbackName),
    desc: str(o.desc),
    roupa: o.roupa ?? null,
    acessorio: o.acessorio ?? null,
    habilidades: Array.isArray(o.habilidades) ? o.habilidades.filter((h) => h && typeof h === 'object').map(normSkill) : [],
  }
}
export function normalizeClass(c, i = 0) {
  const o = c && typeof c === 'object' ? c : {}
  const nome = str(o.nome, `Classe ${i + 1}`)
  return {
    id: str(o.id, `classe_${i}`),
    nome,
    papel: str(o.papel),
    desc: str(o.desc),
    cor: /^#[0-9a-f]{6}$/i.test(o.cor ?? '') ? o.cor : '#5eead4',
    icone: str(o.icone, 'i_estrela'),
    uniforme: o.uniforme !== false,
    modelo: { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_01_01', ...(o.modelo ?? {}) },
    bonus: Object.fromEntries(BONUS.map(([k]) => [k, Number(o.bonus?.[k]) || 0])),
    base: normStage(o.base, nome),
    a: normStage(o.a, `${nome} A`),
    b: normStage(o.b, `${nome} B`),
  }
}
export function normalizeClasses(raw) {
  const r = raw && typeof raw === 'object' ? raw : DEFAULT_CLASSES
  const list = Array.isArray(r.classes) ? r.classes : DEFAULT_CLASSES.classes
  return { v: 1, nivelEvolucao: Math.max(1, Math.min(999, Number(r.nivelEvolucao) || 10)), classes: list.map(normalizeClass) }
}

/** em que etapa a pessoa está: base, a ou b */
export const stageOf = (char) => (char?.evo === 'a' || char?.evo === 'b' ? char.evo : 'base')

/** a classe da pessoa (ou null) */
export function classOf(char, cfg) {
  if (!char?.classe || !cfg) return null
  return cfg.classes.find((c) => c.id === char.classe) ?? null
}

/** veste o uniforme da classe (quando a classe tem uniforme) por cima do visual da pessoa */
export function applyClass(char, cfg) {
  const cls = classOf(char, cfg)
  if (!cls || !cls.uniforme || char?.pronto) return char
  const st = cls[stageOf(char)]
  return { ...char, roupa: st.roupa ?? char.roupa, acessorio: st.acessorio ?? null }
}

/** visual de exemplo de uma etapa (no modelo da classe ou na pessoa) */
export function stageLook(cls, stageKey, person = null) {
  const st = cls[stageKey]
  const base = person && !person.pronto ? person : cls.modelo
  return { corpo: base.corpo, olhos: base.olhos, cabelo: base.cabelo ?? null, roupa: st.roupa, acessorio: st.acessorio }
}
