import { useRef, useEffect } from 'react'
import { T } from './gameHelpers'
import { addCinemaStats } from '../../../services/cinema'

// Cine Planeta: plateia nas poltronas, brincadeiras e os números do cinema (mesma tabela do Cine turma).
export function useGameCinema({ cineRef, worldRef, uid, profile, heroRef, boxRef, room, socialRef }) {
  // ---------------------------------------------------------------- cinema (igual ao Cine turma)
  // plateia do modo cinema: quem está sentado nas poltronas (você e os outros), com o balão de cada um
  const lookCache = useRef(new WeakMap()).current
  const lookOf = (img) => {
    if (!img) return null
    if (!lookCache.has(img)) lookCache.set(img, { t2: img })
    return lookCache.get(img)
  }
  const cinemaPeople = useRef(() => [])
  cinemaPeople.current = () => {
    const cine = cineRef.current
    const w = worldRef.current
    if (!cine || !w) return []
    const now = performance.now()
    const rowOf = (py) => Math.floor((py - 1) / T)
    const front = Math.min(...(w.acts ?? []).filter((a) => a.tipo === 'poltrona').flatMap((a) => a.cells.map((c) => c[1])))
    const bubble = (b) => (b && b.until > now ? b.texto ?? null : null)
    const list = []
    if (cine.st.sit && uid) {
      const [, y] = cine.st.sit.split(',').map(Number)
      list.push({ id: uid, name: profile?.display_name ?? 'Você', look: lookOf(heroRef.current), hold: cine.st.hold, away: cine.st.away, awayAt: cine.st.awayAt, phone: cine.st.phone, nap: cine.st.nap, front: y === front, bubble: bubble(cine.st.me?.bubble) })
    }
    for (const p of cine.peers?.values() ?? []) {
      if (!p.sit || p.px === null || !p.img) continue
      list.push({ id: p.id, name: p.nome ?? 'Alguém', look: lookOf(p.img), hold: p.hold, away: p.away, awayAt: p.awayAt, phone: p.phone, nap: p.nap, front: rowOf(p.py) === front, bubble: bubble(p.bubble) })
    }
    return list
  }
  const getCinemaPeople = useRef(() => cinemaPeople.current()).current
  const cineApi = useRef({
    act: (a, to, extra) => cineRef.current?.act(a, to, extra) ?? 'no',
    subscribe: (listener) => cineRef.current?.subscribe(listener) ?? (() => {}),
  }).current
  const telaoRect = useRef({
    css: true,
    left: 'var(--t2-sx)',
    top: 'var(--t2-sy)',
    width: 'var(--t2-sw)',
    height: 'var(--t2-sh)',
    get aspect() {
      const b = boxRef.current
      return b && b.clientHeight ? b.clientWidth / b.clientHeight : 2
    },
  }).current
  // ingressos e números do cinema (mesma tabela do Cine turma): tempo assistindo sentado, sessões de 10+ min e pipocas
  const watchingCinema = !!(room?.telao && uid)
  useEffect(() => {
    if (!watchingCinema) return undefined
    let watched = 0
    let counted = false
    let pending = 0
    let ticks = 0
    const flush = (session = false) => {
      const st = cineRef.current?.st
      const thrown = st?.thrown ?? 0
      const received = st?.received ?? 0
      if (!pending && !session && !thrown && !received) return
      if (st) {
        st.thrown = 0
        st.received = 0
      }
      addCinemaStats({ seconds: pending, session, thrown, received })
      pending = 0
    }
    const timer = setInterval(() => {
      const st = cineRef.current?.st
      const watching = !!(st?.yt && st.sit)
      if (watching) {
        watched += 15
        pending += 15
      } else {
        watched = 0
        counted = false
      }
      ticks += 1
      if (watching && !counted && watched >= 600) {
        counted = true
        flush(true) // ganhou um ingresso
      } else if (ticks % 4 === 0) flush()
    }, 15000)
    return () => {
      clearInterval(timer)
      flush()
    }
  }, [watchingCinema])
  const cinemaSay = (text) => {
    socialRef.current?.say(text)
    return true
  }

  return { telaoRect, getCinemaPeople, cinemaSay, cineApi }
}
