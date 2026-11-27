// Mini RPG da Turma 2.0: classes, monstros, expedições (lutas idle em grupo) e equipamentos.
// As habilidades (skills.js) continuam iguais; a classe é o papel na luta e dá uma vantagem na vila.
// No save fica: rpg = { classe, xp: { bombeiro: 120, … }, evo: { bombeiro: 'a' }, equip: { arma, protecao, amuleto },
//                       mostra: 'classe' | 'protecao' | 'amuleto' | null, trocas }
// A luta é decidida no banco (supabase/migracao-turma2-rpg.sql); aqui ficam os números que o jogo manda para lá.
import { levelOf } from './skills'

export const TROCA_PRECO = 500 // trocar de classe (a primeira escolha é de graça)
export const EVO_NIVEL = 10 // escolhe a evolução
export const VISUAL_NIVEL = 25 // libera o uniforme da evolução
export const ENERGIA_EXPEDICAO = 20

const look = (roupa, acessorio = null) => ({ roupa, acessorio })
const evo = (nome, desc, roupa, acessorio) => ({ nome, desc, ...look(roupa, acessorio) })

// papel: tanque | cura | dano | suporte (tanque e cura são o que os monstros médios e difíceis exigem)
// forca: multiplica o poder de quem é da classe; premio: o bônus da própria classe na recompensa
export const CLASSES = [
  {
    id: 'bombeiro', nome: 'Bombeiro', papel: 'tanque', cor: '#ff5a4e', forca: 1,
    luta: 'Tanque: segura o monstro. Conta como tanque nas lutas.',
    vila: 'Ferramentas gastam 25% menos energia.',
    premio: 'Mais 1 material por vitória.', premioTipo: { material: 1 },
    base: look('outfit_16_02'),
    evos: { a: evo('Comandante de Resgate', 'Protege o grupo: mais poder.', 'outfit_16_03', 'accessory_06_policeman_hat_04'), b: evo('Brigadista', 'Passa por tudo: mais poder.', 'outfit_16_01', 'accessory_14_gloves_01') },
  },
  {
    id: 'medico', nome: 'Médico', papel: 'cura', cor: '#3fd6a8', forca: 0.9,
    luta: 'Cura a equipe. Conta como cura nas lutas.',
    vila: 'Comida recupera 30% mais energia.',
    premio: '20% mais XP de classe.', premioTipo: { xp: 20 },
    base: look('outfit_08_01'),
    evos: { a: evo('Cirurgião', 'Cura forte em uma pessoa.', 'outfit_13_01', 'accessory_17_medical_mask_01'), b: evo('Socorrista', 'Cura todo mundo um pouco.', 'outfit_09_01', 'accessory_04_snapback_02') },
  },
  {
    id: 'atleta', nome: 'Atleta', papel: 'dano', cor: '#ff8a3d', forca: 1.2,
    luta: 'Dano de perto: bate forte (20% mais poder).',
    vila: 'Anda 15% mais rápido e ganha 20% mais nas entregas.',
    premio: '20% mais moedas.', premioTipo: { moedas: 20 },
    base: look('outfit_25_01'),
    evos: { a: evo('Velocista', 'O mais rápido do jogo.', 'outfit_31_03', 'accessory_11_beanie_03'), b: evo('Lutador', 'Soco forte de perto.', 'outfit_32_05', 'accessory_14_gloves_02') },
  },
  {
    id: 'cientista', nome: 'Cientista', papel: 'dano', cor: '#7be36a', forca: 1.2,
    luta: 'Dano de longe com frascos (20% mais poder). A Cabeça de Abóbora é fraca contra ele.',
    vila: 'Plantas crescem 15% mais rápido (adubo próprio).',
    premio: 'Mais 1 material por vitória.', premioTipo: { material: 1 },
    base: look('outfit_15_01', 'accessory_15_glasses_03'),
    evos: { a: evo('Químico', 'Frascos com efeitos.', 'outfit_15_03', 'accessory_16_monocle_01'), b: evo('Biólogo', 'Plantas, bichos e remédios.', 'outfit_23_04', 'accessory_05_dino_snapback_01') },
  },
  {
    id: 'chef', nome: 'Chef', papel: 'suporte', cor: '#f4ead2', forca: 1,
    luta: 'Suporte: a comida dele fortalece todo mundo (+8% para o grupo).',
    vila: 'Pratos valem 25% mais na loja.',
    premio: 'A comida que você leva rende o dobro de poder.', premioTipo: { comida: 2 },
    base: look('outfit_12_01', 'accessory_18_chef_01'),
    evos: { a: evo('Chef Estrelado', 'Pratos com bônus fortes.', 'outfit_12_03', 'accessory_18_chef_02'), b: evo('Food Truck', 'Vende e ganha moedas.', 'outfit_10_03', 'accessory_04_snapback_01') },
  },
  {
    id: 'engenheiro', nome: 'Engenheiro', papel: 'tanque', cor: '#ffc23d', forca: 1,
    luta: 'Defesa: barreiras e torretas. Conta como tanque nas lutas.',
    vila: 'Equipamentos 30% mais baratos na oficina e consertos pagam 25% mais.',
    premio: '20% mais moedas.', premioTipo: { moedas: 20 },
    base: look('outfit_23_01'),
    evos: { a: evo('Engenheiro Civil', 'Pontes e escudos.', 'outfit_04_02', 'accessory_04_snapback_04'), b: evo('Engenheiro Mecatrônico', 'Drones e torretas.', 'outfit_20_03', 'accessory_15_glasses_02') },
  },
  {
    id: 'policial', nome: 'Policial', papel: 'suporte', cor: '#4d8dff', forca: 1,
    luta: 'Controle: atordoa e atrasa o monstro (+10% para o grupo).',
    vila: 'Moedas achadas no chão valem o dobro.',
    premio: '25% mais moedas.', premioTipo: { moedas: 25 },
    base: look('outfit_19_01', 'accessory_06_policeman_hat_01'),
    evos: { a: evo('Tático', 'Mais dano e precisão.', 'outfit_30_01', 'accessory_07_bataclava_01'), b: evo('Investigador', 'Acha o que está escondido.', 'outfit_18_01', 'accessory_08_detective_hat_01') },
  },
  {
    id: 'programador', nome: 'Programador', papel: 'suporte', cor: '#a97bff', forca: 1,
    luta: 'Acha a fraqueza (+8% para o grupo) e deixa a luta 10% mais curta.',
    vila: 'Ganha 10% mais XP em todas as habilidades.',
    premio: '20% mais XP de classe.', premioTipo: { xp: 20 },
    base: look('outfit_21_01', 'accessory_15_glasses_01'),
    evos: { a: evo('Hacker', 'Abre o que está trancado.', 'outfit_27_01', 'accessory_11_beanie_01'), b: evo('Dev de IA', 'Um assistente robô ajuda.', 'outfit_21_03', 'accessory_10_bolt_01') },
  },
  {
    id: 'streamer', nome: 'Streamer', papel: 'suporte', cor: '#ff6fc1', forca: 1,
    luta: 'Moral: o grupo todo fica mais forte (+12%) e ganha 20% mais moedas.',
    vila: 'A amizade com os moradores sobe 50% mais rápido.',
    premio: '20% mais XP de classe.', premioTipo: { xp: 20 },
    base: look('outfit_24_01', 'accessory_11_beanie_02'),
    evos: { a: evo('Influenciador', 'Bônus para o grupo todo.', 'outfit_24_04', 'accessory_15_glasses_04'), b: evo('Comediante', 'Distrai os monstros.', 'outfit_28_01', 'accessory_19_party_cone_01') },
  },
]
export const classById = (id) => CLASSES.find((c) => c.id === id) ?? null
export const PAPEL_NOME = { tanque: 'Tanque', cura: 'Cura', dano: 'Dano', suporte: 'Suporte' }

// ---------------------------------------------------------------- monstros
// sprite: { anim } = animado da biblioteca (com peca: uma peça desenhada por baixo, como a árvore sob a cara que ri); { folha, linha, de, ate, por? } = folha de personagem do Modern Exteriors
// (quadros de 16x32; "por" é outra folha desenhada por cima: a cabeça de abóbora, a cartola do rei); crop: um pedaço do quadro
const ZUMBI = '/limezu/me/personagens/modern_exteriors_characters_zombie_1.png'
const ZUMBI2 = '/limezu/me/personagens/modern_exteriors_characters_zombie_2.png'
const ESQUELETO = '/limezu/me/personagens/modern_exteriors_characters_skeleton_1.png'
const ABOBORA = '/limezu/me/personagens/accessory_24_pumpkin_head.png'
const FANTASMA = '/limezu/me/personagens/body_10_ghost_white.png'
const FANTASMA_VERDE = '/limezu/me/personagens/body_10_ghost_green.png'
const CARTOLA = '/limezu/me/personagens/accessory_25_black_cylinder.png'
export const NIVEIS = {
  facil: { nome: 'Fácil', cor: '#7be36a' },
  medio: { nome: 'Médio', cor: '#ffc23d' },
  dificil: { nome: 'Difícil', cor: '#ff8a3d' },
  chefe: { nome: 'Chefe', cor: '#ff5a4e' },
}
export const MONSTROS = [
  {
    id: 'caranguejo', nome: 'Caranguejo Bravo', nivel: 'facil', min: 3, poder: 45, minutos: 120, precisa: [], fraco: null, classes: 0,
    moedas: 40, xp: 150, material: 'casca', desc: 'Belisca o pé de quem passa na praia. Qualquer grupo de 3 dá conta.',
    sprite: { anim: 'crabs', crop: [0, 0, 32, 16] },
  },
  {
    id: 'fantasminha', nome: 'Fantasminha', nivel: 'facil', min: 3, poder: 55, minutos: 120, precisa: [], fraco: null, classes: 0,
    moedas: 45, xp: 170, material: 'gosma', desc: 'Assusta, mas é fraquinho. Leve comida para garantir.',
    sprite: { folha: FANTASMA, linha: 1, de: 18, ate: 23 },
  },
  {
    id: 'zumbi', nome: 'Zumbi', nivel: 'medio', min: 3, poder: 130, minutos: 360, precisa: ['tanque_ou_cura'], fraco: null, classes: 0,
    moedas: 120, xp: 400, material: 'frasco_podre', desc: 'Lento e teimoso. Precisa de um tanque ou de alguém que cure.',
    sprite: { folha: ZUMBI, linha: 1, de: 18, ate: 23 },
  },
  {
    id: 'esqueleto', nome: 'Esqueleto', nivel: 'medio', min: 3, poder: 150, minutos: 360, precisa: ['tanque_ou_cura'], fraco: null, classes: 0,
    moedas: 130, xp: 430, material: 'osso', desc: 'Bate rápido e não cansa. Precisa de um tanque ou de alguém que cure.',
    sprite: { folha: ESQUELETO, linha: 1, de: 18, ate: 23 },
  },
  {
    id: 'abobora', nome: 'Cabeça de Abóbora', nivel: 'dificil', min: 3, poder: 260, minutos: 480, precisa: ['tanque', 'cura'], fraco: 'cientista', classes: 0,
    moedas: 220, xp: 650, material: 'abobora_assombrada', desc: 'Precisa de tanque e de cura. É fraca contra Cientista.',
    sprite: { folha: ZUMBI2, linha: 1, de: 18, ate: 23, por: ABOBORA },
  },
  {
    id: 'arvore', nome: 'Árvore Assombrada', nivel: 'dificil', min: 3, poder: 280, minutos: 480, precisa: ['tanque', 'cura'], fraco: 'bombeiro', classes: 0,
    moedas: 230, xp: 680, material: 'galho_assombrado', desc: 'Precisa de tanque e de cura. É fraca contra Bombeiro.',
    sprite: { peca: ['pecas', 'graveyard', 'big_tree'], anim: 'graveyard_haunted_tree_laugh' },
  },
  {
    id: 'rei', nome: 'Fantasma Rei', nivel: 'chefe', min: 5, poder: 600, minutos: 720, precisa: ['tanque', 'cura'], fraco: null, classes: 4,
    moedas: 500, xp: 1200, material: 'coroa', desc: 'O dono da casa mal-assombrada. Grupo de 5, com 4 classes diferentes ou mais. Uma vez por semana.',
    sprite: { folha: FANTASMA_VERDE, linha: 1, de: 18, ate: 23, por: CARTOLA },
  },
]
export const monsterById = (id) => MONSTROS.find((m) => m.id === id) ?? null
/** o que vai para o banco quando o grupo propõe a expedição (o banco decide a luta com isto) */
export const monsterSnapshot = (m) => ({ nome: m.nome, nivel: m.nivel, min: m.min, poder: m.poder, minutos: m.minutos, precisa: m.precisa, fraco: m.fraco, classes: m.classes })
export const PRECISA_NOME = { tanque: 'tanque', cura: 'cura', tanque_ou_cura: 'tanque ou cura', classes: 'classes diferentes' }

// ---------------------------------------------------------------- progresso da classe
export const rpgOf = (save) => save?.rpg ?? {}
export const myClass = (save) => classById(rpgOf(save).classe)
export const classXp = (save, id) => rpgOf(save).xp?.[id] ?? 0
export const classLevel = (save, id = rpgOf(save).classe) => (id ? levelOf(classXp(save, id)).nivel : 0)
export const classEvo = (save, id = rpgOf(save).classe) => rpgOf(save).evo?.[id] ?? null
/** a vantagem da classe na vila está ligada? */
export const perk = (save, id) => rpgOf(save).classe === id

export function setRpg(save, patch) {
  return { ...save, rpg: { ...rpgOf(save), ...patch } }
}
/** escolhe (ou troca) a classe: a primeira é de graça; trocar custa TROCA_PRECO */
export function chooseClass(save, id) {
  const r = rpgOf(save)
  if (r.classe === id) return save
  const price = r.classe ? TROCA_PRECO : 0
  if (save.moedas < price) return null
  return { ...setRpg(save, { classe: id, trocas: (r.trocas ?? 0) + (r.classe ? 1 : 0), mostra: r.mostra ?? 'classe' }), moedas: save.moedas - price }
}
export function addClassXp(save, id, amount) {
  const before = classLevel(save, id)
  const xp = { ...rpgOf(save).xp, [id]: classXp(save, id) + Math.max(0, Math.round(amount)) }
  const next = setRpg(save, { xp })
  const after = classLevel(next, id)
  return { save: next, up: after > before ? after : 0 }
}

// ---------------------------------------------------------------- equipamentos
// cada espaço tem 3 níveis; aparece no boneco (proteção = luvas, amuleto = mochila, arma = brilho em volta)
export const SLOTS = [
  ['arma', 'Arma', 'Um brilho em volta do boneco (a cor muda com o nível).'],
  ['protecao', 'Proteção', 'Luvas no boneco.'],
  ['amuleto', 'Amuleto', 'Mochila no boneco.'],
]
export const TIERS = ['Nenhum', 'Madeira', 'Ferro', 'Assombrado']
export const TIER_COR = [null, '#d39a5b', '#cfe0f2', '#b47bff']
export const EQUIP_PODER = { arma: [0, 10, 24, 45], protecao: [0, 6, 15, 28], amuleto: [0, 6, 15, 28] }
export const EQUIP_VISUAL = {
  protecao: [null, 'accessory_14_gloves_01', 'accessory_14_gloves_03', 'accessory_14_gloves_04'],
  amuleto: [null, 'accessory_03_backpack_01', 'accessory_03_backpack_05', 'accessory_03_backpack_08'],
}
// receitas: [moedas, { material: quantidade }] para chegar no nível 1, 2 e 3
export const RECEITAS = {
  arma: [null, [60, { casca: 3 }], [180, { osso: 3, frasco_podre: 1 }], [450, { galho_assombrado: 3, coroa: 1 }]],
  protecao: [null, [60, { casca: 2, gosma: 1 }], [180, { frasco_podre: 3 }], [450, { abobora_assombrada: 3 }]],
  amuleto: [null, [60, { gosma: 3 }], [180, { osso: 2, frasco_podre: 1 }], [450, { galho_assombrado: 2, abobora_assombrada: 2 }]],
}
export const equipOf = (save) => ({ arma: 0, protecao: 0, amuleto: 0, ...rpgOf(save).equip })
/** quanto custa subir o espaço para o próximo nível (null = já está no máximo) */
export function nextRecipe(save, slot) {
  const t = equipOf(save)[slot] + 1
  const r = RECEITAS[slot][t]
  if (!r) return null
  const off = perk(save, 'engenheiro') ? 0.7 : 1
  return { tier: t, moedas: Math.round(r[0] * off), mats: r[1] }
}

// ---------------------------------------------------------------- poder na luta
/** poder de quem vai para a luta (o banco soma o do grupo e compara com o do monstro) */
export function powerOf(save, comidaEnergia = 0) {
  const c = myClass(save)
  if (!c) return 0
  const lv = classLevel(save)
  const eq = equipOf(save)
  const gear = EQUIP_PODER.arma[eq.arma] + EQUIP_PODER.protecao[eq.protecao] + EQUIP_PODER.amuleto[eq.amuleto]
  const food = Math.round((comidaEnergia / 3) * (c.premioTipo.comida ?? 1))
  return Math.round((12 + lv * 4) * c.forca * (classEvo(save) ? 1.1 : 1) + gear + food)
}

// ---------------------------------------------------------------- recompensa
export const RES_NOME = { vitoria: 'Vitória!', parcial: 'Vitória parcial', derrota: 'Derrota' }
/** o que cada um ganha (o mesmo para o grupo, mais o bônus da própria classe); classes = quem foi */
export function rewardOf(monstro, res, minhaClasse, classes = []) {
  const k = res === 'vitoria' ? 1 : res === 'parcial' ? 0.5 : 0
  const c = classById(minhaClasse)
  const p = c?.premioTipo ?? {}
  const streamer = classes.includes('streamer') ? 1.2 : 1
  const moedas = Math.round(monstro.moedas * k * streamer * (1 + (p.moedas ?? 0) / 100))
  const xp = Math.round(monstro.xp * (res === 'derrota' ? 0.2 : k) * (1 + (p.xp ?? 0) / 100))
  const mat = res === 'vitoria' ? 2 + (p.material ?? 0) : res === 'parcial' ? 1 : 0
  return { moedas, xp, material: monstro.material, qtd: mat }
}

/** frases do resumo da luta (cada pessoa ganha uma, conforme a classe; a semente deixa igual para todos) */
export function battleLog(membros, resultado, monstro) {
  let s = Math.floor((resultado?.seed ?? 0.5) * 9973) + 1
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const n = (a, b) => a + Math.floor(rnd() * (b - a + 1))
  const ok = resultado?.res !== 'derrota'
  const linhas = membros.map((m) => {
    const who = m.nome ?? 'Alguém'
    switch (m.classe) {
      case 'bombeiro': return `${who} (Bombeiro) segurou ${n(6, 18)} golpes do ${monstro.nome}.`
      case 'engenheiro': return `${who} (Engenheiro) levantou ${n(2, 5)} barreiras.`
      case 'medico': return `${who} (Médico) curou o grupo ${n(4, 12)} vezes.`
      case 'atleta': return `${who} (Atleta) acertou ${n(10, 30)} socos.`
      case 'cientista': return `${who} (Cientista) jogou ${n(5, 15)} frascos.`
      case 'chef': return `${who} (Chef) serviu um lanche no meio da luta.`
      case 'policial': return `${who} (Policial) apitou e travou o monstro ${n(2, 6)} vezes.`
      case 'programador': return `${who} (Programador) achou ${n(1, 3)} pontos fracos.`
      case 'streamer': return `${who} (Streamer) fez ${n(50, 900)} pessoas torcerem ao vivo.`
      default: return `${who} lutou com coragem.`
    }
  })
  const faltou = (resultado?.faltou ?? []).map((f) => `Faltou ${PRECISA_NOME[f] ?? f} no grupo.`)
  return [...linhas, ...faltou, ok ? `O ${monstro.nome} fugiu correndo!` : `O ${monstro.nome} foi forte demais desta vez.`]
}

// ---------------------------------------------------------------- visual no boneco
/** o que a pessoa escolheu mostrar: uniforme da classe, proteção (luvas) ou amuleto (mochila) */
export function applyRpgLook(char, save) {
  if (!char || char.pronto) return char
  const r = rpgOf(save)
  const c = myClass(save)
  if (r.mostra === 'classe' && c) {
    const e = classEvo(save)
    const u = e && classLevel(save) >= VISUAL_NIVEL ? c.evos[e] : c.base
    return { ...char, roupa: u.roupa, acessorio: u.acessorio ?? null }
  }
  const eq = equipOf(save)
  if ((r.mostra === 'protecao' || r.mostra === 'amuleto') && eq[r.mostra]) return { ...char, acessorio: EQUIP_VISUAL[r.mostra][eq[r.mostra]] }
  return char
}
/** cor do brilho da arma em volta do boneco (ou null) */
export const weaponGlow = (save) => TIER_COR[equipOf(save).arma] ?? null
