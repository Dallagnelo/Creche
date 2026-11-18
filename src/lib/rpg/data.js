// Regras do RPG da turma em forma de dados: atributos, classes, itens e monstros.
// O livro de regras completo está no doc "RPG da Creche — Regras v0.1".
// Ícones: game-icons.net (CC BY 3.0), em public/rpg/icons (scripts/rpg-icons.mjs).

export const ATTRS = [
  { id: 'for', name: 'Força', short: 'FOR' },
  { id: 'des', name: 'Destreza', short: 'DES' },
  { id: 'con', name: 'Constituição', short: 'CON' },
  { id: 'int', name: 'Inteligência', short: 'INT' },
  { id: 'sab', name: 'Sabedoria', short: 'SAB' },
  { id: 'car', name: 'Carisma', short: 'CAR' },
]

// XP total para chegar em cada nível (índice = nível)
export const XP_FOR_LEVEL = [0, 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]
export const proficiency = (level) => (level >= 9 ? 3 : level >= 5 ? 2 : 1)
export const DIFFICULTIES = [
  { label: 'Fácil', value: 10 },
  { label: 'Normal', value: 13 },
  { label: 'Difícil', value: 16 },
  { label: 'Muito difícil', value: 19 },
  { label: 'Heroico', value: 22 },
]

export const iconUrl = (icon) => `/rpg/icons/${icon}.svg`

// ------------------------------------------------------------------ classes
export const CLASSES = [
  {
    id: 'guerreiro', name: 'Guerreiro', icon: 'crossed-swords', attr: 'for', hp: 14, hpGain: 6, effort: 2, effortGain: 1,
    blurb: 'Aguenta a linha de frente e bate forte. Usa todas as armas, armaduras e escudo.',
    kit: { equipment: { main: 'espada-longa', off: 'escudo', body: 'cota-malha' }, bag: [['machadinha', 2], ['racao', 5], ['tochas', 1]], gold: 10 },
    abilities: [
      { level: 1, name: 'Postura', desc: 'Grátis, uma vez por rodada: Ofensiva (+2 de dano) ou Defensiva (+2 de defesa).' },
      { level: 1, name: 'Retomar fôlego', cost: 1, desc: 'Cura 1d8 + nível.' },
      { level: 5, name: 'Ataque extra', desc: 'Ataca 2 vezes com uma ação.' },
    ],
    paths: [
      { id: 'campeao', name: 'Campeão', abilities: ['Crítico ampliado: crítico com 19 ou 20.', 'Golpe devastador (2 Esforço): +2d8 e derruba se o alvo falhar em Força.', 'Imparável (1x por descanso): ao chegar a 0, fica com 1 e ataca de graça.'] },
      { id: 'protetor', name: 'Protetor', abilities: ['Interpor: recebe o ataque no lugar de um aliado ao lado.', 'Muralha (2 Esforço): aliados ao lado ganham +2 de defesa.', 'Última linha (1x por descanso): por 1 rodada, inimigos só atacam você, com desvantagem.'] },
    ],
  },
  {
    id: 'barbaro', name: 'Bárbaro', icon: 'battle-axe', attr: 'for', hp: 16, hpGain: 7, effort: 2, effortGain: 1, unarmored: 'con',
    blurb: 'Fúria e machado. Recebe metade do dano físico quando entra em Fúria.',
    kit: { equipment: { main: 'machado-grande' }, bag: [['machadinha', 2], ['racao', 5], ['corda', 1]], gold: 10 },
    abilities: [
      { level: 1, name: 'Fúria', cost: 2, desc: '3 rodadas: metade do dano físico, +2 de dano, vantagem em Força. Depois, 1 Ferida leve.' },
      { level: 1, name: 'Defesa sem armadura', desc: 'Sem armadura, defesa = 10 + Destreza + Constituição.' },
      { level: 5, name: 'Ataque extra', desc: 'Ataca 2 vezes com uma ação. Vantagem na iniciativa.' },
    ],
    paths: [
      { id: 'furioso', name: 'Furioso', abilities: ['Frenesi: em Fúria, ataca mais 1 vez por rodada.', 'Fúria cega: em Fúria, não sente medo nem é encantado.', 'Fúria eterna: em Fúria, teste de Constituição 15 para não cair.'] },
      { id: 'totem', name: 'Totem', abilities: ['Espírito do urso: em Fúria, metade de todo dano.', 'Espírito do lobo: aliados têm vantagem contra quem está ao seu lado.', 'Espírito da águia: salta 6 casas e cai com +3d6.'] },
    ],
  },
  {
    id: 'paladino', name: 'Paladino', icon: 'checked-shield', attr: 'for', effortAttr: 'car', hp: 13, hpGain: 5, effort: 3, effortGain: 1,
    blurb: 'Guerreiro sagrado com um juramento. Cura tocando e castiga com luz.',
    kit: { equipment: { main: 'espada-longa', off: 'escudo', body: 'cota-malha' }, bag: [['simbolo', 1], ['racao', 5]], gold: 5 },
    abilities: [
      { level: 1, name: 'Golpe sagrado', cost: 2, desc: 'Depois de acertar: +2d6 de dano (+1d6 contra mortos-vivos).' },
      { level: 1, name: 'Mãos curativas', desc: 'Reserva de 5 × nível de cura por descanso longo.' },
      { level: 5, name: 'Ataque extra e Aura de proteção', desc: 'Ataca 2 vezes; aliados próximos somam seu Carisma para resistir.' },
    ],
    paths: [
      { id: 'devocao', name: 'Devoção', abilities: ['Arma sagrada (2 Esforço): soma Carisma nos ataques por 3 rodadas.', 'Aura de coragem: aliados próximos não sentem medo.', 'Avatar sagrado (1x por descanso): inimigos têm desvantagem contra você.'] },
      { id: 'vinganca', name: 'Vingança', abilities: ['Inimigo jurado (1 Esforço): vantagem contra um alvo até ele cair.', 'Perseguidor: ataca de graça quando o jurado foge.', 'Anjo vingador (1x por descanso): voa e assusta inimigos.'] },
    ],
  },
  {
    id: 'ladino', name: 'Ladino', icon: 'plain-dagger', attr: 'des', hp: 10, hpGain: 4, effort: 2, effortGain: 1,
    blurb: 'Furtivo e preciso. Abre fechaduras e acerta onde dói.',
    kit: { equipment: { main: 'rapieira', body: 'couro' }, bag: [['arco-curto', 1], ['flechas', 1], ['adaga', 2], ['kit-ladrao', 1], ['racao', 5]], gold: 15 },
    abilities: [
      { level: 1, name: 'Ataque furtivo', desc: '+1d6 se o alvo estiver distraído ou cercado (sobe nos níveis 3, 5, 7 e 9).' },
      { level: 1, name: 'Especialista', desc: 'Dois tipos de teste somam a proficiência em dobro.' },
      { level: 5, name: 'Esquiva e Ação ardilosa', desc: 'Metade do dano de um ataque que viu; esconde ou recua sem gastar a ação.' },
    ],
    paths: [
      { id: 'gatuno', name: 'Gatuno', abilities: ['Mãos rápidas: usa item sem gastar a ação.', 'Escalador: escala sem teste.', 'Ladrão lendário: age 2 vezes na primeira rodada.'] },
      { id: 'assassino', name: 'Assassino', abilities: ['Assassinar: acerto em alvo surpreso é crítico.', 'Disfarce perfeito por 1 dia.', 'Golpe mortal: contra surpreso, o dano dobra de novo.'] },
    ],
  },
  {
    id: 'ranger', name: 'Ranger', icon: 'pocket-bow', attr: 'des', hp: 11, hpGain: 5, effort: 3, effortGain: 1,
    blurb: 'Caçador e rastreador. Arco certeiro e o grupo nunca passa fome.',
    kit: { equipment: { main: 'espada-curta', off: 'espada-curta', body: 'couro' }, bag: [['arco-longo', 1], ['flechas', 1], ['racao', 3], ['corda', 1]], gold: 10 },
    abilities: [
      { level: 1, name: 'Presa marcada', cost: 1, desc: '+1d4 de dano contra o alvo e vantagem para rastreá-lo.' },
      { level: 1, name: 'Explorador', desc: 'Em viagem o grupo gasta metade das rações.' },
      { level: 5, name: 'Ataque extra', desc: 'Ataca 2 vezes; a Presa marcada vira 1d6.' },
    ],
    paths: [
      { id: 'cacador', name: 'Caçador', abilities: ['Matador de gigantes: +1d8 contra alvo maior.', 'Saraivada (2 Esforço): ataca todos numa área.', 'Olho de falcão: com arco, crítico em 19 ou 20.'] },
      { id: 'feras', name: 'Mestre das feras', abilities: ['Companheiro animal: lobo, falcão ou javali.', 'Laço: o companheiro ataca 2 vezes.', 'Fúria da matilha (1x por descanso).'] },
    ],
  },
  {
    id: 'mago', name: 'Mago', icon: 'crystal-wand', attr: 'int', hp: 8, hpGain: 3, effort: 4, effortGain: 2,
    blurb: 'Magia poderosa e cara. Frágil: fique atrás do grupo.',
    kit: { equipment: { main: 'cajado' }, bag: [['grimorio', 1], ['foco-arcano', 1], ['adaga', 1], ['racao', 5]], gold: 15 },
    abilities: [
      { level: 1, name: 'Truques', desc: 'Raio de fogo (1d10 à distância), Mão mágica e Luz, sem custo.' },
      { level: 1, name: 'Grimório', desc: 'Mísseis mágicos (2), Escudo (1), Sono (2), Detectar magia (1).' },
      { level: 5, name: 'Bola de fogo e Contramágica', desc: 'Bola de fogo (4): 8d6 numa área. Contramágica (3): anula uma magia.' },
    ],
    paths: [
      { id: 'evocacao', name: 'Evocação', abilities: ['Esculpir magia: aliados ficam fora da área.', 'Magia potente: soma Inteligência no dano.', 'Sobrecarga (1x por descanso): magia de graça e com dano máximo.'] },
      { id: 'abjuracao', name: 'Abjuração', abilities: ['Barreira arcana: escudo de vida que recarrega.', 'Barreira para um aliado.', 'Santuário arcano (1x por descanso).'] },
    ],
  },
  {
    id: 'clerigo', name: 'Clérigo', icon: 'heart-plus', attr: 'sab', hp: 11, hpGain: 5, effort: 3, effortGain: 2,
    blurb: 'Cura, abençoa e espanta mortos-vivos. A cura gasta o mesmo Esforço da luta.',
    kit: { equipment: { main: 'maca', off: 'escudo', body: 'cota-escamas' }, bag: [['simbolo', 1], ['kit-cura', 1], ['racao', 5]], gold: 10 },
    abilities: [
      { level: 1, name: 'Curar ferimentos', cost: 1, desc: 'Cura 1d8 + Sabedoria ao tocar (2 Esforço à distância).' },
      { level: 1, name: 'Bênção e Afastar mortos-vivos', cost: 2, desc: '3 aliados somam 1d4 nos testes; mortos-vivos fogem.' },
      { level: 5, name: 'Reviver', cost: 5, desc: '+100 ouro em incenso: traz de volta quem morreu na rodada anterior.' },
    ],
    paths: [
      { id: 'vida', name: 'Vida', abilities: ['Cura abençoada: curas somam +2 + nível.', 'Cura em massa (4 Esforço).', 'Milagre (1x por mês): ressuscita sem pagar o templo.'] },
      { id: 'guerra', name: 'Guerra', abilities: ['Golpe guiado (1 Esforço): +10 num ataque.', 'Arma divina: +1d8 de dano.', 'Avatar da batalha: metade do dano físico.'] },
    ],
  },
  {
    id: 'druida', name: 'Druida', icon: 'wolf-head', attr: 'sab', hp: 10, hpGain: 4, effort: 3, effortGain: 2,
    blurb: 'Vira bicho e fala com a natureza. Nada de metal.',
    kit: { equipment: { main: 'cajado', off: 'escudo-madeira', body: 'gibao' }, bag: [['racao', 3]], gold: 10 },
    abilities: [
      { level: 1, name: 'Forma animal', cost: 2, desc: 'Vira lobo (vida 3 × nível, mordida 2d4).' },
      { level: 1, name: 'Magias da natureza', desc: 'Bom fruto (1), Enredar (2), Curar ferimentos (1).' },
      { level: 5, name: 'Formas maiores e Relâmpago', desc: 'Urso e águia; Invocar relâmpago (3): 3d10.' },
    ],
    paths: [
      { id: 'lua', name: 'Lua', abilities: ['Forma de combate: transforma sem gastar a ação.', 'Garras mágicas: +1d6.', 'Forma elemental (1x por descanso).'] },
      { id: 'terra', name: 'Terra', abilities: ['Recuperação natural: descanso curto devolve metade do Esforço.', 'Passo da floresta.', 'Fúria da natureza (4 Esforço).'] },
    ],
  },
  {
    id: 'bardo', name: 'Bardo', icon: 'lyre', attr: 'car', hp: 9, hpGain: 4, effort: 3, effortGain: 2,
    blurb: 'Inspira o grupo, resolve na conversa e debocha do inimigo.',
    kit: { equipment: { main: 'rapieira', body: 'couro' }, bag: [['instrumento', 1], ['adaga', 1], ['racao', 5]], gold: 15 },
    abilities: [
      { level: 1, name: 'Inspiração', cost: 1, desc: 'Um aliado soma 1d6 num teste depois de ver o dado.' },
      { level: 1, name: 'Magias do bardo', desc: 'Palavra curativa (1), Zombaria cruel (grátis), Encantar pessoa (2).' },
      { level: 5, name: 'Canção de descanso', desc: 'No descanso curto, o grupo cura +1d6.' },
    ],
    paths: [
      { id: 'labia', name: 'Lábia', abilities: ['Palavras cortantes: tira o dado do inimigo.', 'Persuasão mágica (3 Esforço).', 'Palavra final (1x por descanso).'] },
      { id: 'bravura', name: 'Bravura', abilities: ['Inspiração de combate: soma no dano ou defesa.', 'Ataque extra.', 'Hino de batalha (1x por descanso).'] },
    ],
  },
]
export const classOf = (id) => CLASSES.find((c) => c.id === id) ?? null

// ------------------------------------------------------------------ itens
// slot: weapon (uma mão), twohand, offhand, body, head, cape, hands, feet, neck, ring, none (só mochila)
// rarity: 0 comum, 1 incomum, 2 raro, 3 lendário
const I = (name, icon, slot, extra = {}) => ({ name, icon, slot, rarity: 0, price: '—', stat: '', desc: '', ...extra })
export const ITEMS = {
  // armas
  'adaga': I('Adaga', 'plain-dagger', 'weapon', { dmg: '1d4', finesse: true, stat: '1d4 · leve, arremesso', price: '2 ouro' }),
  'clava': I('Clava', 'wood-club', 'weapon', { dmg: '1d4', stat: '1d4 · leve', price: '5 pratas' }),
  'cajado': I('Cajado', 'wizard-staff', 'weapon', { dmg: '1d6', stat: '1d6 · versátil (1d8)', price: '2 pratas' }),
  'lanca': I('Lança', 'spear-feather', 'weapon', { dmg: '1d6', stat: '1d6 · arremesso', price: '1 ouro', metal: true }),
  'maca': I('Maça', 'flanged-mace', 'weapon', { dmg: '1d6', stat: '1d6', price: '5 ouro', metal: true }),
  'besta-leve': I('Besta leve', 'crossbow', 'twohand', { dmg: '1d8', ranged: true, stat: '1d8 · 16 casas · recarga', price: '25 ouro' }),
  'espada-curta': I('Espada curta', 'gladius', 'weapon', { dmg: '1d6', finesse: true, stat: '1d6 · leve, usa Destreza', price: '10 ouro', metal: true }),
  'machadinha': I('Machadinha', 'hatchet', 'weapon', { dmg: '1d6', stat: '1d6 · leve, arremesso', price: '5 ouro', metal: true }),
  'rapieira': I('Rapieira', 'stiletto', 'weapon', { dmg: '1d8', finesse: true, stat: '1d8 · usa Destreza', price: '25 ouro', metal: true }),
  'espada-longa': I('Espada longa', 'broadsword', 'weapon', { dmg: '1d8', stat: '1d8 · versátil (1d10)', price: '15 ouro', metal: true }),
  'machado-batalha': I('Machado de batalha', 'battle-axe', 'weapon', { dmg: '1d8', stat: '1d8 · versátil (1d10)', price: '10 ouro', metal: true }),
  'martelo': I('Martelo de guerra', 'warhammer', 'weapon', { dmg: '1d8', stat: '1d8 · versátil (1d10)', price: '15 ouro', metal: true }),
  'alabarda': I('Alabarda', 'halberd', 'twohand', { dmg: '1d10', heavy: true, stat: '1d10 · alcance 2, pesada', price: '20 ouro', metal: true }),
  'machado-grande': I('Machado grande', 'sharp-axe', 'twohand', { dmg: '1d12', heavy: true, stat: '1d12 · duas mãos, pesada', price: '30 ouro', metal: true }),
  'espada-grande': I('Espada grande', 'relic-blade', 'twohand', { dmg: '2d6', heavy: true, stat: '2d6 · duas mãos, pesada', price: '50 ouro', metal: true }),
  'arco-curto': I('Arco curto', 'pocket-bow', 'twohand', { dmg: '1d6', ranged: true, stat: '1d6 · 16 casas', price: '25 ouro' }),
  'arco-longo': I('Arco longo', 'high-shot', 'twohand', { dmg: '1d8', ranged: true, heavy: true, stat: '1d8 · 30 casas, pesada', price: '50 ouro' }),
  // armaduras e escudos
  'acolchoada': I('Armadura acolchoada', 'leather-vest', 'body', { def: 1, stat: '+1 defesa · desvantagem em furtividade', price: '5 ouro' }),
  'couro': I('Armadura de couro', 'leather-armor', 'body', { def: 1, stat: '+1 defesa', price: '10 ouro' }),
  'couro-batido': I('Couro batido', 'leather-armor', 'body', { def: 2, stat: '+2 defesa', price: '45 ouro', metal: true }),
  'gibao': I('Gibão de peles', 'fur-shirt', 'body', { def: 2, maxDes: 2, stat: '+2 defesa · Destreza máx. +2 · sem metal', price: '10 ouro' }),
  'cota-escamas': I('Cota de escamas', 'scale-mail', 'body', { def: 4, maxDes: 2, stat: '+4 defesa · Destreza máx. +2', price: '50 ouro', metal: true }),
  'peitoral': I('Peitoral', 'breastplate', 'body', { def: 4, maxDes: 2, stat: '+4 defesa · Destreza máx. +2', price: '150 ouro', metal: true }),
  'cota-malha': I('Cota de malha', 'chain-mail', 'body', { def: 6, maxDes: 0, strReq: 1, stat: '+6 defesa · precisa Força +1', price: '75 ouro', metal: true }),
  'placas': I('Armadura de placas', 'lamellar', 'body', { def: 8, maxDes: 0, strReq: 2, stat: '+8 defesa · precisa Força +2', price: '600 ouro', metal: true }),
  'escudo': I('Escudo', 'round-shield', 'offhand', { def: 2, stat: '+2 defesa', price: '10 ouro', metal: true }),
  'escudo-madeira': I('Escudo de madeira', 'shield', 'offhand', { def: 2, stat: '+2 defesa · sem metal', price: '10 ouro' }),
  'elmo': I('Elmo de ferro', 'barbute', 'head', { def: 1, stat: '+1 defesa', desc: 'Meio amassado.', price: '20 ouro', metal: true }),
  'luvas': I('Luvas de couro', 'gloves', 'hands', { stat: 'Protegem em escaladas', price: '2 ouro' }),
  'botas': I('Botas de viagem', 'boots', 'feet', { stat: 'Confortáveis', price: '3 ouro' }),
  // aventura
  'racao': I('Ração', 'meat', 'none', { stack: true, stat: '1 dia de comida', desc: 'O descanso longo gasta 1.', price: '5 pratas' }),
  'tochas': I('Tochas (3)', 'torch', 'none', { stat: 'Cada uma ilumina uma cena', price: '1 prata' }),
  'lanterna': I('Lanterna', 'lantern', 'none', { stat: 'Ilumina mais longe; gasta óleo', price: '5 ouro' }),
  'oleo': I('Frasco de óleo', 'oil-can', 'none', { stack: true, stat: 'Lanterna por 1 dia ou 1d6 de fogo', price: '1 prata' }),
  'corda': I('Corda (15 m)', 'rope-coil', 'none', { stat: 'Subir, descer, amarrar', price: '1 ouro' }),
  'pe-de-cabra': I('Pé de cabra', 'crowbar', 'none', { stat: 'Vantagem para forçar portas', price: '2 ouro' }),
  'saco-dormir': I('Saco de dormir', 'sleeping-bag', 'none', { stat: 'Sem ele, o descanso longo cura metade', price: '1 ouro' }),
  'kit-cura': I('Kit de cura', 'medical-pack', 'none', { stat: '10 usos · estabiliza quem caiu', price: '5 ouro' }),
  'kit-ladrao': I('Kit de ladrão', 'lockpicks', 'none', { stat: 'Abrir fechaduras e desarmar armadilhas', price: '25 ouro' }),
  'simbolo': I('Símbolo sagrado', 'holy-symbol', 'none', { stat: 'Foco do Clérigo e do Paladino', price: '5 ouro' }),
  'foco-arcano': I('Foco arcano', 'crystal-ball', 'none', { stat: 'Foco do Mago', price: '10 ouro' }),
  'grimorio': I('Grimório', 'spell-book', 'none', { stat: 'As magias do Mago', desc: 'Perder é um desastre.', price: '50 ouro' }),
  'instrumento': I('Instrumento musical', 'lyre', 'none', { stat: 'Foco do Bardo', price: '10 ouro' }),
  'flechas': I('20 flechas', 'quiver', 'none', { stat: 'Munição', price: '1 ouro' }),
  // poções
  'pocao-cura': I('Poção de cura', 'health-potion', 'none', { stack: true, heal: [2, 4, 2], usable: true, stat: 'Cura 2d4 + 2', desc: 'Tomar gasta a ação da rodada.', price: '50 ouro' }),
  'pocao-maior': I('Poção de cura maior', 'heart-bottle', 'none', { stack: true, rarity: 1, heal: [4, 4, 4], usable: true, stat: 'Cura 4d4 + 4', price: '150 ouro' }),
  'antidoto': I('Antídoto', 'round-bottom-flask', 'none', { stack: true, stat: 'Cura veneno', price: '25 ouro' }),
  'agua-benta': I('Água benta', 'holy-water', 'none', { stack: true, stat: '2d6 em mortos-vivos', price: '25 ouro' }),
  'fogo-alquimico': I('Fogo alquímico', 'fire-bomb', 'none', { stack: true, stat: '1d4 de fogo por rodada', price: '50 ouro' }),
  'elixir': I('Elixir de fôlego', 'fizzing-flask', 'none', { stack: true, effort: 3, usable: true, stat: 'Devolve 3 de Esforço', price: '75 ouro' }),
  'pergaminho': I('Pergaminho de magia', 'scroll-unfurled', 'none', { stack: true, stat: 'Uma magia sem gastar Esforço', price: '75 ouro' }),
  // mágicos
  'vela-eterna': I('Vela que não apaga', 'candle-light', 'none', { rarity: 0, stat: 'Ilumina para sempre', price: '50 ouro' }),
  'bolsa-devoradora': I('Bolsa devoradora', 'swap-bag', 'none', { rarity: 1, bagBonus: 6, stat: '+6 espaços na mochila', price: '300 ouro' }),
  'arma-mais-1': I('Espada longa +1', 'spinning-sword', 'weapon', { rarity: 1, magic: true, dmg: '1d8', atk: 1, dmgBonus: 1, stat: '1d8 · +1 acerto e dano', price: '400 ouro', metal: true }),
  'armadura-mais-1': I('Couro +1', 'leather-armor', 'body', { rarity: 1, magic: true, def: 2, stat: '+2 defesa', price: '500 ouro' }),
  'capa-silencio': I('Capa do silêncio', 'cape', 'cape', { rarity: 1, magic: true, stat: 'Vantagem em furtividade', desc: 'Tecido escuro que abafa os passos.', price: '400 ouro' }),
  'varinha-misseis': I('Varinha de mísseis', 'crystal-wand', 'weapon', { rarity: 1, magic: true, stat: '7 cargas de Mísseis mágicos', price: '350 ouro' }),
  'anel-protecao': I('Anel de proteção', 'ring', 'ring', { rarity: 2, magic: true, def: 1, stat: '+1 defesa e +1 para resistir', price: '2.000 ouro' }),
  'espada-flamejante': I('Espada flamejante', 'dripping-blade', 'weapon', { rarity: 2, magic: true, dmg: '1d8', stat: '1d8 + 2d6 de fogo', price: '3.000 ouro', metal: true }),
  'cajado-cura': I('Cajado da cura', 'wizard-staff', 'twohand', { rarity: 2, magic: true, dmg: '1d6', stat: '10 cargas de Curar ferimentos', price: '2.500 ouro' }),
  'amuleto-saude': I('Amuleto da saúde', 'gem-pendant', 'neck', { rarity: 2, magic: true, stat: 'Constituição passa a ser +3', price: '3.000 ouro' }),
  // tesouro e missão
  'esmeralda': I('Esmeralda', 'emerald', 'none', { rarity: 1, stat: 'Vale 100 ouro', price: '100 ouro' }),
  'coroa-lata': I('Coroa de lata', 'crown', 'head', { rarity: 1, stat: 'Item de missão', desc: 'A coroa do Rei goblin. Amassada e fedida.' }),
  'chave': I('Chave enferrujada', 'key', 'none', { stat: 'Item de missão', desc: 'Abre alguma porta da caverna.' }),
  'emblema': I('Emblema de lata', 'medal', 'none', { stat: 'Pista', desc: 'Uma coroa de lata desenhada. Achado na caravana.' }),
}
export const itemOf = (key) => ITEMS[key] ?? null
export const RARITY = [
  { label: 'Comum', color: '#8a6a3a' },
  { label: 'Incomum', color: '#4f9a3c' },
  { label: 'Raro', color: '#3c78c8' },
  { label: 'Lendário', color: '#e08a1e' },
]

// ------------------------------------------------------------------ monstros
const M = (name, icon, cost, hp, def, atk, dmg, special, tactic, extra = {}) => ({ name, icon, cost, hp, def, atk, dmg, special, tactic, ...extra })
export const MONSTERS = {
  'rato': M('Rato gigante', 'rat', 1, 5, 12, 3, '1d4+1', 'Vantagem se outro rato estiver ao lado do alvo', 'Vem em bando e cerca quem estiver sozinho'),
  'kobold': M('Kobold', 'lizardman', 1, 5, 12, 4, '1d4+2', 'Monta armadilhas', 'Ataca de longe e foge para as armadilhas'),
  'goblin': M('Goblin', 'goblin', 1, 7, 13, 4, '1d6+2', 'Esconde-se sem gastar a ação', 'Emboscada; foge quando metade do bando cai'),
  'esqueleto': M('Esqueleto', 'skeleton', 1, 13, 13, 4, '1d6+2', 'Dano dobrado de maça e martelo', 'Avança em linha reta e nunca foge'),
  'lobo': M('Lobo', 'wolf-head', 2, 11, 13, 4, '2d4+2', 'Derruba (For 11)', 'Caça em matilha; ataca quem já caiu'),
  'bandido': M('Bandido', 'bandit', 2, 11, 12, 3, '1d6+1', '—', 'Rouba e corre; rende-se se perder'),
  'zumbi': M('Zumbi', 'shambling-zombie', 2, 22, 8, 3, '1d6+1', 'Ao chegar a 0, Con (5 + dano) para ficar com 1', 'Segue o mesmo alvo até o fim'),
  'aranha': M('Aranha gigante', 'spider-alt', 2, 15, 14, 5, '1d8+3', 'Veneno 2d8 (Con 11) e teia', 'Prende quem está longe e morde quem está preso'),
  'orc': M('Orc', 'orc-head', 3, 15, 13, 5, '1d12+3', 'Avança sem gastar a ação', 'Corre para o corpo a corpo'),
  'hobgoblin': M('Hobgoblin', 'goblin-head', 3, 11, 18, 3, '1d8+1', '+2d6 com aliado ao lado do alvo', 'Luta em formação'),
  'gnoll': M('Gnoll', 'hyena-head', 3, 22, 15, 4, '1d8+2', 'Ao derrubar alguém, morde de graça', 'Persegue quem foge'),
  'cultista': M('Cultista', 'cultist', 3, 9, 12, 4, '2d6', 'Sacrifica-se para curar 2d8 do líder', 'Protege o líder'),
  'ghoul': M('Ghoul', 'carnivore-mouth', 4, 22, 12, 4, '2d4+2', 'Paralisa 1 rodada (Con 10)', 'Paralisa um e chama os outros'),
  'harpia': M('Harpia', 'harpy', 4, 38, 11, 3, '2d4+1', 'Canto atrai (Sab 11)', 'Encanta e voa para longe'),
  'bugbear': M('Bugbear', 'bear-head', 5, 27, 16, 4, '2d8+2', '+2d6 na primeira rodada', 'Ataca quem fica para trás'),
  'lobo-atroz': M('Lobo atroz', 'wolf-howl', 5, 37, 14, 5, '2d6+3', 'Derruba (For 13)', 'Ataca quem está cercado'),
  'ogro': M('Ogro', 'ogre', 8, 59, 11, 6, '2d8+4', 'Arremessa pedras 2d10', 'Burro: dá para enganar'),
  'mimico': M('Mímico', 'mimic-chest', 8, 58, 12, 5, '1d8+3', 'Gruda (For 13)', 'Espera alguém abrir o "baú"'),
  'troll': M('Troll', 'troll', 10, 84, 15, 7, '2×2d6+4', 'Regenera 10 por rodada (menos com fogo)', 'Só foge do fogo'),
  'wyvern': M('Wyvern', 'wyvern', 12, 110, 13, 7, '2d6+4', 'Ferrão: veneno 7d6 (Con 15)', 'Ataca do alto'),
  'gigante': M('Gigante da colina', 'giant', 12, 105, 13, 8, '2×3d8+5', 'Rochas 3d10', 'Esmaga quem está perto'),
  'elemental-fogo': M('Elemental de fogo', 'fire-silhouette', 12, 102, 13, 6, '2×2d6+3', 'Quem toca leva 1d10', 'Incendeia tudo'),
  'rei-goblin': M('Rei goblin', 'goblin', 8, 30, 15, 5, '2d6+3', 'Chama 1d4 goblins por rodada', 'Segunda fase: bombas 2d6 numa área', { boss: true, crown: true }),
  'necromante': M('Necromante', 'skull-staff', 15, 60, 13, 6, '3d8', 'Ergue 2 esqueletos por rodada', 'Segunda fase: suga vida', { boss: true }),
  'dragao-jovem': M('Dragão vermelho jovem', 'spiked-dragon-head', 30, 178, 18, 10, '2d10+6', 'Sopro de fogo 16d6 (Des 17)', 'Segunda fase: voa e só desce para sopros', { boss: true }),
  'dragao-anciao': M('Dragão vermelho ancião', 'dragon-head', 60, 300, 20, 14, '2d10+8', 'Sopro de fogo 20d6 (Des 20)', 'Segunda fase: o covil pega fogo', { boss: true }),
}
export const monsterOf = (key) => MONSTERS[key] ?? null

// ------------------------------------------------------------------ ficha
export const EQUIP_SLOTS = [
  { key: 'neck', label: 'Amuleto', accepts: ['neck'], ghost: 'gem-pendant' },
  { key: 'head', label: 'Cabeça', accepts: ['head'], ghost: 'barbute' },
  { key: 'cape', label: 'Capa', accepts: ['cape'], ghost: 'cape' },
  { key: 'main', label: 'Arma', accepts: ['weapon', 'twohand'], ghost: 'broadsword' },
  { key: 'body', label: 'Corpo', accepts: ['body'], ghost: 'leather-armor' },
  { key: 'off', label: 'Mão secundária', accepts: ['offhand', 'weapon'], ghost: 'round-shield' },
  { key: 'ring1', label: 'Anel', accepts: ['ring'], ghost: 'ring' },
  { key: 'hands', label: 'Mãos', accepts: ['hands'], ghost: 'gloves' },
  { key: 'ring2', label: 'Anel', accepts: ['ring'], ghost: 'ring' },
  { key: 'feet', label: 'Pés', accepts: ['feet'], ghost: 'boots' },
]
export const MAX_MAGIC = 3
const mod = (n) => (n >= 0 ? `+${n}` : `${n}`)
export const fmtMod = mod

/** Vida e Esforço máximos para um nível (ganho fixo por nível). */
export function maxStats(cls, attrs, level = 1) {
  const con = attrs.con ?? 0
  const effortAttr = attrs[cls.effortAttr ?? cls.attr] ?? 0
  const hp = cls.hp + con + (level - 1) * Math.max(1, cls.hpGain + con)
  const effort = Math.max(1, cls.effort + effortAttr + (level - 1) * cls.effortGain)
  return { hp, effort }
}

/** Espaços da mochila: 8 + Força (+6 com a bolsa devoradora). */
export function bagSize(character) {
  const str = character.attrs?.for ?? 0
  const bonus = (character.bag ?? []).some((cell) => cell && ITEMS[cell.id]?.bagBonus) ? 6 : 0
  return Math.max(4, 8 + str + bonus)
}

/** Defesa, acerto e dano da ficha a partir do equipamento. */
export function derived(character) {
  const cls = classOf(character.class)
  const a = character.attrs ?? {}
  const eq = character.equipment ?? {}
  const items = Object.values(eq).map((id) => ITEMS[id]).filter(Boolean)
  const body = ITEMS[eq.body]
  const des = a.des ?? 0
  let defense = 10 + (body && body.maxDes !== undefined ? Math.min(des, body.maxDes) : des)
  if (!body && cls?.unarmored) defense += a[cls.unarmored] ?? 0
  defense += items.reduce((sum, item) => sum + (item.def ?? 0), 0)
  const weapon = ITEMS[eq.main]
  const useDes = weapon && (weapon.finesse || weapon.ranged) && des > (a.for ?? 0)
  const stat = useDes ? des : a.for ?? 0
  const prof = proficiency(character.level ?? 1)
  const attack = stat + prof + (weapon?.atk ?? 0)
  const damage = weapon?.dmg ? `${weapon.dmg}${mod(stat + (weapon.dmgBonus ?? 0))}` : `1${mod(stat)}`
  const magic = items.filter((item) => item.magic).length
  return { defense, attack, damage, prof, magic, stat }
}

/** Monta o personagem novo com o kit da classe. */
export function newCharacter(cls, name, attrs) {
  const { hp, effort } = maxStats(cls, attrs, 1)
  const bag = cls.kit.bag.map(([id, qty]) => (ITEMS[id]?.stack || qty > 1 ? { id, qty } : { id }))
  return {
    name: name.trim(),
    class: cls.id,
    hp, hp_max: hp, effort, effort_max: effort,
    attrs,
    gold: cls.kit.gold,
    equipment: { ...cls.kit.equipment },
    bag,
  }
}
