import { itemRect, TILE } from '../../lib/room'
import { spriteOf, pick, playNotes, MELODIES } from '../../lib/roomDraw'
import { cleanHold, DEFAULT_ON, isCinemaSeatItem, CINE_POPCORN } from './roomHelpers'

// O que acontece quando alguém usa um móvel (sentar, ligar, tocar...) e como os efeitos chegam dos outros.
export function createRoomActions({ st, user, players, fx, headTop, setYtVideo, share, navRef, setPanel, sitDown, setEditingAvatar, setDjError }) {
  const findItem = (id) => st.scene.furniture.find((it) => it.id === id)
  // Telão: cada aparelho tem o relógio um pouco diferente. Em vez do horário em que o vídeo começou,
  // quem envia manda "há quantos ms começou"; quem recebe converte para o próprio relógio.
  const withElapsed = (payload) =>
    payload.kind === 'item' && payload.item === 'yt' && payload.on?.type === 'yt'
      ? { ...payload, elapsed: Date.now() - payload.on.at }
      : payload
  const localYt = (on, elapsed) => (on?.type === 'yt' && Number.isFinite(elapsed) ? { ...on, at: Date.now() - Math.max(0, elapsed) } : on)
  const applyFx = (payload) => {
    if (payload.id !== user.id && payload.elapsed != null) payload = { ...payload, on: localYt(payload.on, payload.elapsed) }
    const p = players.get(payload.id)
    const item = findItem(payload.item)
    const rect = item ? itemRect(item, spriteOf(item)) : null
    const top = rect ? { x: rect.x + rect.w / 2, y: rect.y } : null
    if (payload.kind === 'notes' && top) for (let i = 0; i < 4; i += 1) setTimeout(() => fx('note', top.x, top.y, pick(['♪', '♫'])), i * 260)
    if (payload.kind === 'steam' && top) for (let i = 0; i < 6; i += 1) setTimeout(() => fx('steam', top.x + (Math.random() - 0.5) * rect.w * 0.6, top.y + 4), i * 180)
    if (payload.kind === 'water' && top) for (let i = 0; i < 3; i += 1) setTimeout(() => fx('drop', top.x, top.y - 4, '💧'), i * 180)
    if (payload.kind === 'bubble' && p) {
      p.bubble = { text: String(payload.text).slice(0, 80), until: st.time + (payload.long ? 5 : 3.2) }
      p.typing = 0 // falou: some o "digitando..."
    }
    // "digitando...": quem digita renova a cada poucos segundos; se parar de chegar (fechou a aba), some sozinho
    if (payload.kind === 'typing' && p) p.typing = payload.v ? st.time + 7 : 0
    if (payload.kind === 'hold' && p) p.hold = cleanHold(payload.hold)
    if (payload.kind === 'cine' && ['away', 'phone', 'nap'].includes(payload.act) && p) {
      // banheiro (o overlay anima o bonequinho andando), celular aceso e cochilo
      p[payload.act] = !!payload.v
      if (payload.act === 'away') p.awayAt = p.away ? (Number.isFinite(payload.t) ? payload.t : Date.now()) : 0
      // uma coisa de cada vez: no banheiro não dorme nem mexe no celular; pegou o celular, acordou
      if (payload.v && payload.act !== 'phone') p.phone = false
      if (payload.v && payload.act !== 'nap') p.nap = false
      st.cineListeners.forEach((listener) => listener({ act: payload.act, from: payload.id, v: !!payload.v, at: Date.now() }))
    }
    if (payload.kind === 'cine' && payload.act === 'chart' && Array.isArray(payload.pts)) {
      // gráfico final da nota ao vivo (o hook do telão confere os números)
      const ev = { act: 'chart', from: payload.id, key: String(payload.key ?? '').slice(0, 40), pts: payload.pts.slice(0, 200), crew: payload.crew ?? null, at: Date.now() }
      st.cineListeners.forEach((listener) => listener(ev))
    }
    if (payload.kind === 'cine' && payload.act === 'mood') {
      // nota ao vivo do filme (-2 odiando … +2 amando): só vai para o overlay do cinema
      const v = Math.max(-2, Math.min(2, Math.round(Number(payload.v) || 0)))
      st.cineListeners.forEach((listener) => listener({ act: 'mood', from: payload.id, v, at: Date.now() }))
    }
    if (payload.kind === 'cine' && ['popcorn', 'poke', 'shh', 'wave', 'screen'].includes(payload.act)) {
      const unit = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5)
      const ev = { act: payload.act, from: payload.id, to: payload.to ?? null, x: unit(payload.x), y: unit(payload.y), at: Date.now() }
      // na sala (fora do modo cinema) também aparece em cima de quem levou
      const target = players.get(ev.to)
      const icon = { popcorn: '🍿', poke: '👉', shh: '🤫' }[ev.act]
      if (target && icon) fx('note', target.x * TILE + 8, headTop(target) - 6, icon)
      if (ev.act === 'popcorn' && ev.to === user.id) st.cineReceived += 1
      st.cineListeners.forEach((listener) => listener(ev))
    }
    if (payload.kind === 'pet') st.petBubbles[payload.item] = { text: String(payload.text).slice(0, 40), until: st.time + 2.2 }
    if (payload.kind === 'item') {
      st.items[payload.item] = payload.on
      if (payload.item === 'yt') setYtVideo(payload.on ?? null)
    }
  }
  const doFx = (payload) => {
    applyFx({ id: user.id, ...payload })
    share('fx', withElapsed(payload))
  }
  const isOn = (item) => st.items[item.id] ?? item.on ?? DEFAULT_ON[item.act] ?? false

  // ---------- o que cada móvel faz
  const freeSeat = (item) =>
    item.seats?.find((seat) => ![...players.values()].some((p) => p.pose && Math.abs(p.x - seat.x) < 0.3 && Math.abs(p.y - seat.y) < 0.3))
  const act = (item, me) => {
    const go = (to, label) => ({ label, run: () => navRef.current(to) })
    const show = (data) => setPanel({ id: item.id, ...data })
    const say = (text) => doFx({ kind: 'bubble', text })
    const toggle = () => {
      const on = !isOn(item)
      doFx({ kind: 'item', item: item.id, on })
      return on
    }
    if (item.seats) {
      const seat = freeSeat(item)
      if (!seat) {
        say('Tá ocupado!')
        return
      }
      sitDown(me, seat, { x: Math.round(me.x), y: Math.round(me.y) })
      share('pose', { x: seat.x, y: seat.y, pose: seat.pose, dir: seat.dir, sx: me.standX, sy: me.standY })
    }
    setPanel(null)
    // Cine turma: a pipoqueira dá um balde (10 punhados para jogar nos amigos) e a máquina, um refri
    if (st.scene.furniture.some(isCinemaSeatItem) && (String(item.key).startsWith('popcorn') || item.act === 'vending')) {
      const popcorn = String(item.key).startsWith('popcorn')
      me.hold = { popcorn: popcorn ? CINE_POPCORN : me.hold?.popcorn ?? 0, soda: popcorn ? !!me.hold?.soda : true }
      doFx({ kind: 'hold', hold: me.hold })
      playNotes(popcorn ? [784, 988, 1175] : [523, 392, 262], { wave: 'square', gap: 0.08, volume: 0.05 })
      say(popcorn ? 'Peguei pipoca! 🍿 Senta e joga nos amigos' : 'Peguei um refri! 🥤')
      st.track()
      return
    }
    switch (item.act) {
      case 'door':
        st.leave?.(item.door)
        return
      case 'tv': {
        const on = toggle()
        show({
          title: 'TV',
          text: on ? 'TV ligada! Sente no sofá para assistir.' : 'TV desligada.',
          actions: [go('/filmes', 'Ver filmes da turma'), { label: on ? 'Desligar' : 'Ligar', run: () => act(item, me) }],
        })
        break
      }
      case 'sit':
        if (item.id === 'sofa') show({ title: 'Sofá', text: 'Assistindo TV com a turma 📺', actions: [go('/filmes', 'Ver filmes')] })
        break
      case 'bed':
        show({ title: item.label, text: 'Dormindo... toque no chão para levantar.' })
        break
      case 'arcade':
        say(pick(['Novo recorde! 🏆', 'Mais uma ficha!', 'Game over 😵']))
        playNotes([784, 988, 1175, 1568], { wave: 'square', gap: 0.08, volume: 0.05 })
        show({ title: 'Fliperama', text: 'Os jogos da turma estão aqui.', actions: [go('/jogos', 'Ver jogos')] })
        break
      case 'pc': {
        const on = toggle()
        if (on) say(pick(['Jogando no PC 🖥️', 'GG! 🎮', 'Só mais uma partida']))
        show({ title: 'PC', text: on ? 'PC ligado.' : 'PC desligado.', actions: [go('/jogos', 'Ver jogos da turma')] })
        break
      }
      case 'live':
        say(pick(['Testando, 1, 2, 3 🎤', 'Boa noite, turma! 🎤', 'Alguém liga o som?']))
        show({ title: 'Palco', text: 'Sobe no palco e chama a turma para a live!', actions: [go('/ao-vivo', 'Ir para o Ao vivo')] })
        break
      case 'vote':
        say('Votando 🗳️')
        show({ title: 'Urna', text: 'As votações da turma ficam aqui.', actions: [go('/votacoes', 'Ver votações')] })
        break
      case 'board':
        show({ title: 'Mural de fotos', text: 'As fotos e álbuns da turma.', actions: [go('/mural', 'Abrir o mural')] })
        break
      case 'calendar':
        show({
          title: 'Calendário',
          text: `Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
          actions: [go('/eventos', 'Ver eventos')],
        })
        break
      case 'books':
        say(pick(['Lendo um livro 📖', 'Esse é bom!', 'Hmm, interessante...']))
        show({ title: 'Estante', text: 'Aqui fica o diário do site.', actions: [go('/patch-notes', 'Ver novidades')] })
        break
      case 'piano':
        playNotes(pick(MELODIES))
        doFx({ kind: 'notes', item: item.id })
        show({ title: 'Piano', text: 'Tocando uma música 🎹', actions: [{ label: 'Tocar de novo', run: () => act(item, me) }] })
        break
      case 'guitar':
        playNotes(pick([[330, 392, 494, 659, 494, 392], [294, 370, 440, 587, 440, 370]]), { gap: 0.13 })
        doFx({ kind: 'notes', item: item.id })
        say('Tocando violão 🎸')
        break
      case 'drums':
        playNotes([98, 196, 98, 98, 196, 147, 98], { wave: 'square', gap: 0.12, volume: 0.07 })
        doFx({ kind: 'notes', item: item.id })
        say('Tum tum tsss 🥁')
        break
      case 'music': {
        const on = !st.items.music
        doFx({ kind: 'item', item: 'music', on })
        if (on) playNotes([392, 523, 659, 523, 587, 494, 392], { wave: 'square', gap: 0.15, volume: 0.04 })
        show({ title: 'Som', text: on ? 'Som ligado 🎶' : 'Som desligado.', actions: [{ label: on ? 'Desligar' : 'Ligar', run: () => act(item, me) }] })
        break
      }
      case 'lamp':
      case 'fire':
      case 'fan': {
        // "clique" do interruptor: agudo ao ligar, grave ao desligar
        const on = toggle()
        playNotes(on ? [880, 1320] : [660, 440], { wave: 'square', gap: 0.04, volume: 0.03 })
        break
      }
      case 'cook':
        doFx({ kind: 'steam', item: item.id })
        say(pick(['Cozinhando... 🍳', 'Fazendo um café ☕', 'Miojo de novo? 🍜']))
        break
      case 'fridge':
        say(pick(['Peguei um refri 🥤', 'Cadê o pudim? 🍮', 'Só tem água 💧']))
        break
      case 'coffee':
        say(pick(['Que café bom ☕', 'Um lanchinho 🍪', 'Cadê o controle?']))
        break
      case 'clock':
        say(`São ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ⏰`)
        break
      case 'mirror':
        say(pick(['Tô bonito(a) hoje ✨', 'Ajeitando o cabelo', 'Que pessoa linda!']))
        break
      case 'wardrobe':
        say('Trocando de roupa 👕')
        setEditingAvatar(true)
        break
      case 'plant':
        doFx({ kind: 'water', item: item.id })
        say('Reguei a planta 🌱')
        break
      case 'dj':
        say(pick(['Manda o link que eu toco! 🎧', 'Bora fazer uma festa? 🎶', 'Qual vai ser a próxima? 💿']))
        setDjError('')
        show({ title: '🎧 DJ Creche', dj: true })
        break
      case 'teleport': {
        // teletransporte: luz, som de ficção científica e... zap, outro lugar
        const target = item.target === 'mine' ? `quarto:${user.id}` : item.target
        if (!target) {
          say('Bzzzt... sem destino 🌀')
          break
        }
        playNotes([262, 392, 523, 784, 1047, 1568], { wave: 'sine', gap: 0.06, volume: 0.06 })
        for (let i = 0; i < 5; i += 1) setTimeout(() => fx('note', me.x * TILE + 8 + (Math.random() - 0.5) * 14, me.y * TILE + 4, '✨'), i * 70)
        say(pick(['Energizar! ✨', 'Zap! 🌀', 'Teletransportando...']))
        setTimeout(() => st.leave?.(target), 450)
        break
      }
      case 'menu': {
        // cardápio da cafeteria: muda toda semana
        const menus = [
          'Cardápio: cappuccino + pão de queijo ☕🧀', 'Cardápio: chocolate quente + bolo de cenoura 🍫🥕', 'Cardápio: café gelado + cookie 🧊🍪',
          'Cardápio: chá de hibisco + torta de limão 🍋', 'Cardápio: mocha + brownie 🤎', 'Cardápio: latte + croissant 🥐',
        ]
        const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000))
        say(menus[week % menus.length])
        break
      }
      case 'vending':
        playNotes([523, 392, 262], { wave: 'square', gap: 0.09, volume: 0.05 })
        say(pick(['Caiu um refri! 🥤', 'Peguei um suco de uva 🍇', 'A máquina engoliu minha moeda 😤', 'Água com gás? Sério?']))
        break
      case 'claw': {
        const win = Math.random() < 0.3
        playNotes(win ? [523, 659, 784, 1047] : [392, 330, 262], { wave: 'square', gap: 0.1, volume: 0.05 })
        say(win ? `Peguei ${pick(['um ursinho 🧸', 'um dinossauro 🦖', 'um patinho 🐥', 'um unicórnio 🦄', 'um polvo 🐙'])}!` : pick(['Quase! 😩', 'A garra soltou...', 'Essa máquina é roubada! 😤', 'Mais uma ficha...']))
        if (win) doFx({ kind: 'notes', item: item.id })
        break
      }
      case 'photo':
        st.flashAt = st.time
        playNotes([1568, 2093], { wave: 'square', gap: 0.05, volume: 0.04 })
        say('Xiiis! 📸')
        show({ title: 'Cabine de fotos', text: 'Foto tirada! As fotos de verdade da turma ficam no mural.', actions: [go('/mural', 'Abrir o mural')] })
        break
      case 'say':
        if (item.says?.length) say(pick(item.says))
        break
      default:
    }
    st.track()
  }
  return { doFx, act, applyFx, isOn }
}
