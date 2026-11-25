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

const stage = (nome, roupa, acessorio, desc = '', habilidades = []) => ({ nome, desc, roupa, acessorio, habilidades })
const hab = (nome, desc) => ({ nome, desc })

export const DEFAULT_CLASSES = {
  v: 1,
  nivelEvolucao: 10,
  classes: [
    {
      id: 'medico', nome: 'Médico', papel: 'Cura', cor: '#3fd6a8', icone: 'i_coracao_p', uniforme: true,
      desc: 'Cuida da turma: recupera a vida de quem está perto.',
      modelo: { corpo: 'body_02', olhos: 'eyes_03', cabelo: 'hairstyle_05_02' },
      bonus: { vida: 1, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Médico', 'outfit_08_01', null, 'Jaleco branco, pronto para atender.', [hab('Primeiros socorros', 'Recupera um pouco de vida de alguém perto.')]),
      a: stage('Cirurgião', 'outfit_13_01', 'accessory_17_medical_mask_01', 'Cura forte em uma pessoa.', [hab('Cirurgia', 'Cura muito uma pessoa.'), hab('Reanimar', 'Levanta quem caiu.')]),
      b: stage('Socorrista', 'outfit_09_01', 'accessory_04_snapback_02', 'Cura em área e corre mais.', [hab('Atendimento em grupo', 'Cura um pouco todos por perto.')]),
    },
    {
      id: 'bombeiro', nome: 'Bombeiro', papel: 'Tank', cor: '#ff5a4e', icone: 'i_coracao', uniforme: true,
      desc: 'Aguenta o tranco: muita vida e protege o grupo.',
      modelo: { corpo: 'body_04', olhos: 'eyes_01', cabelo: 'hairstyle_12_01' },
      bonus: { vida: 3, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Bombeiro', 'outfit_16_02', null, 'Macacão de proteção.', [hab('Segurar a barra', 'Leva menos dano por um tempo.')]),
      a: stage('Comandante de Resgate', 'outfit_16_03', 'accessory_06_policeman_hat_04', 'Protege quem está perto.', [hab('Escudo do grupo', 'Divide o dano com os amigos perto.')]),
      b: stage('Brigadista', 'outfit_16_01', 'accessory_14_gloves_01', 'Passa por fogo e abre caminhos.', [hab('Apagar fogo', 'Apaga fogo e tira entulho do caminho.')]),
    },
    {
      id: 'engenheiro', nome: 'Engenheiro', papel: 'Defesa / construção', cor: '#ffc23d', icone: 'i_engrenagem', uniforme: true,
      desc: 'Monta coisas no mapa: barreiras, pontes e máquinas.',
      modelo: { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_08_03' },
      bonus: { vida: 1, energia: 10, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Engenheiro', 'outfit_23_01', null, 'Roupa de campo.', [hab('Montar barreira', 'Coloca uma barreira no chão.')]),
      a: stage('Engenheiro Civil', 'outfit_04_02', 'accessory_04_snapback_04', 'Pontes e escudos.', [hab('Ponte', 'Atravessa água e buracos.')]),
      b: stage('Engenheiro Mecatrônico', 'outfit_20_03', 'accessory_15_glasses_02', 'Drones e torretas.', [hab('Drone ajudante', 'Um drone que ajuda sozinho.')]),
    },
    {
      id: 'policial', nome: 'Policial', papel: 'Controle', cor: '#4d8dff', icone: 'i_estrela', uniforme: true,
      desc: 'Segura e atrasa os inimigos.',
      modelo: { corpo: 'body_01', olhos: 'eyes_05', cabelo: 'hairstyle_02_01' },
      bonus: { vida: 1, energia: 0, fome: 0, humor: 0, velocidade: 5 },
      base: stage('Policial', 'outfit_19_01', 'accessory_06_policeman_hat_01', 'Farda azul e quepe.', [hab('Apito', 'Faz os inimigos pararem um instante.')]),
      a: stage('Tático', 'outfit_30_01', 'accessory_07_bataclava_01', 'Mais dano e precisão.', [hab('Investida', 'Avança e acerta forte.')]),
      b: stage('Investigador', 'outfit_18_01', 'accessory_08_detective_hat_01', 'Acha segredos e itens escondidos.', [hab('Lupa', 'Mostra o que está escondido por perto.')]),
    },
    {
      id: 'programador', nome: 'Programador', papel: 'Utilidade', cor: '#a97bff', icone: 'i_engrenagem', uniforme: true,
      desc: 'Mexe em aparelhos: portas, painéis e câmeras.',
      modelo: { corpo: 'body_02', olhos: 'eyes_04', cabelo: 'hairstyle_15_02' },
      bonus: { vida: 0, energia: 10, fome: 0, humor: 5, velocidade: 0 },
      base: stage('Programador', 'outfit_21_01', 'accessory_15_glasses_01', 'Moletom e óculos.', [hab('Acessar painel', 'Usa painéis e computadores do mapa.')]),
      a: stage('Hacker', 'outfit_27_01', 'accessory_11_beanie_01', 'Abre o que está trancado.', [hab('Invadir', 'Abre portas trancadas e desliga armadilhas.')]),
      b: stage('Dev de IA', 'outfit_21_03', 'accessory_10_bolt_01', 'Um assistente robô ajuda.', [hab('Assistente', 'Um ajudante que pega itens perto.')]),
    },
    {
      id: 'atleta', nome: 'Atleta', papel: 'Velocidade / dano', cor: '#ff8a3d', icone: 'i_raio', uniforme: true,
      desc: 'Corre mais e cansa menos.',
      modelo: { corpo: 'body_07', olhos: 'eyes_02', cabelo: 'hairstyle_20_01' },
      bonus: { vida: 0, energia: 20, fome: 0, humor: 0, velocidade: 10 },
      base: stage('Atleta', 'outfit_25_01', null, 'Camisa de time.', [hab('Arrancada', 'Corre muito rápido por um instante.')]),
      a: stage('Velocista', 'outfit_31_03', 'accessory_11_beanie_03', 'O mais rápido do jogo.', [hab('Turbo', 'Arrancadas seguidas.')]),
      b: stage('Lutador', 'outfit_32_05', 'accessory_14_gloves_02', 'Dano corpo a corpo alto.', [hab('Soco', 'Acerta forte quem está do lado.')]),
    },
    {
      id: 'chef', nome: 'Chef', papel: 'Suporte de fome', cor: '#f4ead2', icone: 'i_coxa', uniforme: true,
      desc: 'Comida feita por ele enche mais a fome.',
      modelo: { corpo: 'body_04', olhos: 'eyes_06', cabelo: 'hairstyle_25_03' },
      bonus: { vida: 0, energia: 0, fome: 20, humor: 5, velocidade: 0 },
      base: stage('Chef', 'outfit_12_01', 'accessory_18_chef_01', 'Dólmã e chapéu.', [hab('Cozinhar', 'Transforma ingredientes em comida.')]),
      a: stage('Chef Estrelado', 'outfit_12_03', 'accessory_18_chef_02', 'Pratos com bônus fortes.', [hab('Prato especial', 'Comida que dá vida e energia.')]),
      b: stage('Food Truck', 'outfit_10_03', 'accessory_04_snapback_01', 'Vende comida e ganha moedas.', [hab('Vender', 'Vende comida para os NPCs.')]),
    },
    {
      id: 'streamer', nome: 'Streamer', papel: 'Suporte de humor', cor: '#ff6fc1', icone: 'i_cerebro', uniforme: true,
      desc: 'Deixa todo mundo de bom humor.',
      modelo: { corpo: 'body_03', olhos: 'eyes_07', cabelo: 'hairstyle_28_05' },
      bonus: { vida: 0, energia: 0, fome: 0, humor: 20, velocidade: 0 },
      base: stage('Streamer', 'outfit_24_01', 'accessory_11_beanie_02', 'Visual de live.', [hab('Ao vivo', 'Sobe o humor de quem está perto.')]),
      a: stage('Influenciador', 'outfit_24_04', 'accessory_15_glasses_04', 'Bônus para o grupo todo.', [hab('Viralizar', 'Bônus para todos no mapa.')]),
      b: stage('Comediante', 'outfit_28_01', 'accessory_19_party_cone_01', 'Recupera o humor rápido.', [hab('Piada', 'Distrai inimigos e diverte a turma.')]),
    },
    {
      id: 'cientista', nome: 'Cientista', papel: 'Dano à distância', cor: '#7be36a', icone: 'i_livro', uniforme: true,
      desc: 'Usa frascos e aparelhos de longe.',
      modelo: { corpo: 'body_07', olhos: 'eyes_03', cabelo: 'hairstyle_18_02' },
      bonus: { vida: 0, energia: 0, fome: 0, humor: 0, velocidade: 0 },
      base: stage('Cientista', 'outfit_15_01', 'accessory_15_glasses_03', 'Jaleco e óculos.', [hab('Frasco', 'Joga um frasco de longe.')]),
      a: stage('Químico', 'outfit_15_03', 'accessory_16_monocle_01', 'Frascos com efeitos.', [hab('Espuma', 'Deixa os inimigos lentos.')]),
      b: stage('Biólogo', 'outfit_23_04', 'accessory_05_dino_snapback_01', 'Plantas, bichos e remédios.', [hab('Remédio natural', 'Faz remédios com plantas.')]),
    },
  ],
}

const str = (v, d = '') => (typeof v === 'string' ? v : d)
function normStage(s, fallbackName) {
  const o = s && typeof s === 'object' ? s : {}
  return {
    nome: str(o.nome, fallbackName),
    desc: str(o.desc),
    roupa: o.roupa ?? null,
    acessorio: o.acessorio ?? null,
    habilidades: Array.isArray(o.habilidades) ? o.habilidades.filter((h) => h && typeof h === 'object').map((h) => ({ nome: str(h.nome), desc: str(h.desc) })) : [],
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
