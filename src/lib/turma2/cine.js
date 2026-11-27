// Cinema da Turma 2.0 (Cine Planeta): o mesmo Cine turma da sala, dentro de um mapa.
// Telão com vídeo do YouTube (ou uma live) tocando junto para todo mundo do mapa, poltronas (sentou: modo cinema
// com a plateia), pipoca para jogar nos amigos, refri, banheiro, celular, cochilo, ola, nota ao vivo e o gráfico.
// Nada fica salvo: passa pelo "ao vivo" do mapa (turma2Live: presença + acontecimentos).

export const CINE_POPCORN = 10 // punhados num balde da pipoqueira
export const cleanHold = (hold) =>
  hold && typeof hold === 'object'
    ? { popcorn: Math.max(0, Math.min(CINE_POPCORN, Math.floor(Number(hold.popcorn) || 0))), soda: !!hold.soda }
    : null

/**
 * meId: você; peers: Map dos outros no mapa (o jogo guarda sit/hold/away/... de cada um, vindos da presença);
 * send(ev): manda um acontecimento para o mapa; track(meta): atualiza a sua presença;
 * onYt(video): o vídeo do telão mudou; onSit(bool): você sentou/levantou.
 */
export function makeCine({ meId, peers, send, track, onYt, onSit }) {
  const st = { yt: null, hold: null, sit: null, away: false, awayAt: 0, phone: false, nap: false, listeners: new Set(), thrown: 0, received: 0 }
  const emit = (ev) => st.listeners.forEach((listener) => listener(ev))
  const meta = () => ({ sit: !!st.sit, hold: st.hold, away: st.away, awayAt: st.awayAt, phone: st.phone, nap: st.nap, yt: !!st.yt })
  const share = () => track(meta())
  // cada aparelho tem o relógio um pouco diferente: manda "há quantos ms começou" e quem recebe converte
  const withElapsed = (p) => (p.kind === 'item' && p.on?.type === 'yt' ? { ...p, elapsed: Date.now() - p.on.at } : p)
  const localYt = (on, elapsed) => (on?.type === 'yt' && Number.isFinite(elapsed) ? { ...on, at: Date.now() - Math.max(0, elapsed) } : on)

  const apply = (id, p, { sync = false } = {}) => {
    if (!p || typeof p !== 'object') return
    const mine = id === meId
    const who = mine ? st : peers.get(id)
    if (p.kind === 'item' && p.item === 'yt') {
      const on = mine ? p.on : localYt(p.on, p.elapsed)
      // resposta de "em que ponto está?": só vale se você ainda não tem vídeo (ou é o mesmo, para acertar o ponto)
      if (sync && st.yt && !(st.yt.type === 'yt' && on?.type === 'yt' && st.yt.id === on.id && !st.yt.synced)) return
      st.yt = on ? { ...on, synced: sync || undefined } : null
      onYt(st.yt)
      if (mine) share()
      return
    }
    if (p.kind === 'hold' && who && !mine) who.hold = cleanHold(p.hold)
    if (p.kind !== 'cine') return
    if (['away', 'phone', 'nap'].includes(p.act) && who) {
      who[p.act] = !!p.v
      if (p.act === 'away') who.awayAt = who.away ? (Number.isFinite(p.t) ? p.t : Date.now()) : 0
      // uma coisa de cada vez: no banheiro não dorme nem mexe no celular; pegou o celular, acordou
      if (p.v && p.act !== 'phone') who.phone = false
      if (p.v && p.act !== 'nap') who.nap = false
      emit({ act: p.act, from: id, v: !!p.v, at: Date.now() })
    }
    if (p.act === 'chart' && Array.isArray(p.pts)) emit({ act: 'chart', from: id, key: String(p.key ?? '').slice(0, 40), pts: p.pts.slice(0, 200), crew: p.crew ?? null, at: Date.now() })
    if (p.act === 'mood') emit({ act: 'mood', from: id, v: Math.max(-2, Math.min(2, Math.round(Number(p.v) || 0))), at: Date.now() })
    if (['popcorn', 'poke', 'shh', 'wave', 'screen'].includes(p.act)) {
      const unit = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5)
      if (p.act === 'popcorn' && p.to === meId && !mine) st.received += 1
      emit({ act: p.act, from: id, to: p.to ?? null, x: unit(p.x), y: unit(p.y), at: Date.now() })
    }
  }
  const doFx = (p) => {
    apply(meId, p)
    send({ k: 'fx', p: withElapsed(p) })
  }

  let lastCine = 0
  const api = {
    st,
    apply,
    /** alguém chegou e quer saber o que passa no telão */
    answer() {
      if (st.yt) send({ k: 'fx', sync: 1, p: withElapsed({ kind: 'item', item: 'yt', on: st.yt }) })
    },
    ask() {
      send({ k: 'ytask' })
    },
    setYt(on) {
      doFx({ kind: 'item', item: 'yt', on: on ?? null })
    },
    grab(popcorn) {
      st.hold = { popcorn: popcorn ? CINE_POPCORN : st.hold?.popcorn ?? 0, soda: popcorn ? !!st.hold?.soda : true }
      doFx({ kind: 'hold', hold: st.hold })
      share()
    },
    sit(key) {
      st.sit = key
      share()
      onSit(true)
    },
    stand() {
      if (!st.sit) return
      for (const a of ['away', 'phone', 'nap']) if (st[a]) api.act(a, null, { v: false })
      st.sit = null
      share()
      onSit(false)
    },
    /** brincadeiras da plateia (o overlay do cinema chama): jogar pipoca, cutucar, pedir silêncio, puxar a ola… */
    act(act, to = null, extra = {}) {
      if (act === 'away' || act === 'phone' || act === 'nap') {
        if (!!st[act] === !!extra.v) return 'ok'
        doFx({ kind: 'cine', act, v: !!extra.v, t: Date.now() })
        share()
        return 'ok'
      }
      if (act === 'chart') {
        doFx({ kind: 'cine', act: 'chart', key: extra.key, pts: extra.pts, crew: extra.crew ?? null })
        return 'ok'
      }
      if (act === 'mood') {
        doFx({ kind: 'cine', act: 'mood', v: Math.max(-2, Math.min(2, Math.round(Number(extra.v) || 0))) })
        return 'ok'
      }
      if (!['popcorn', 'poke', 'shh', 'wave', 'screen'].includes(act)) return 'no'
      if (Date.now() - lastCine < (act === 'screen' ? 1000 : 700)) return 'wait'
      if (act === 'popcorn' || act === 'screen') {
        if (!(st.hold?.popcorn > 0)) return 'empty'
        st.hold = { ...st.hold, popcorn: st.hold.popcorn - 1 }
        doFx({ kind: 'hold', hold: st.hold })
        share()
        st.thrown += 1
      }
      lastCine = Date.now()
      // pipoca na tela: o ponto onde bate é sorteado aqui e vai igual para todo mundo
      const spot = act === 'screen' ? { x: 0.15 + Math.random() * 0.7, y: 0.12 + Math.random() * 0.5 } : {}
      doFx({ kind: 'cine', act, to, ...spot })
      return 'ok'
    },
    subscribe(listener) {
      st.listeners.add(listener)
      return () => st.listeners.delete(listener)
    },
    share,
  }
  return api
}
