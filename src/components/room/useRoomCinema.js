import { useRef, useState, useEffect } from 'react'
import { frontRowY, inCinemaSeat } from './roomHelpers'
import { CINEMA_KEY } from '../../lib/rooms'
import { addCinemaStats } from '../../services/cinema'

// Cine turma: quem está nas poltronas, brincadeiras da plateia e os números do cinema (tempo, sessões, pipocas).
export function useRoomCinema({ stateRef, roomKey }) {
  // plateia do Cine turma (modo cinema do telão): quem está sentado nas poltronas e o balão de cada um agora
  const cinemaPeople = useRef(() => {
    const st = stateRef.current
    const front = frontRowY(st.scene)
    return [...st.players.values()].filter((p) => inCinemaSeat(st.scene, p)).map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl ?? null,
      look: p.look,
      hold: p.hold ?? null,
      away: !!p.away,
      awayAt: p.awayAt || 0,
      phone: !!p.phone,
      nap: !!p.nap,
      front: Math.abs(p.y - front) < 0.3,
      bubble: p.bubble && p.bubble.until > st.time ? p.bubble.text : null,
    }))
  }).current
  // sentou numa poltrona do cinema: o telão abre grande (modo cinema); levantou: volta para a parede
  const [seated, setSeated] = useState(false)
  useEffect(() => {
    if (roomKey !== CINEMA_KEY) {
      setSeated(false)
      return undefined
    }
    const timer = setInterval(() => {
      const st = stateRef.current
      setSeated(inCinemaSeat(st.scene, st.me))
    }, 250)
    return () => clearInterval(timer)
  }, [roomKey])
  // brincadeiras da plateia: o overlay manda ("jogar pipoca no fulano") e escuta o que os outros fazem
  const cineApi = useRef({
    act: (act, to, extra) => stateRef.current.cine?.(act, to, extra) ?? 'no',
    subscribe: (listener) => {
      const set = stateRef.current.cineListeners
      set.add(listener)
      return () => set.delete(listener)
    },
  }).current

  // ingressos e números do cinema: tempo assistindo sentado (com vídeo no telão), sessões de 10+ min e pipocas
  useEffect(() => {
    let watched = 0
    let counted = false
    let pending = 0
    let ticks = 0
    const flush = (session = false) => {
      const st = stateRef.current
      const thrown = st.cineThrown
      const received = st.cineReceived
      if (!pending && !session && !thrown && !received) return
      st.cineThrown = 0
      st.cineReceived = 0
      addCinemaStats({ seconds: pending, session, thrown, received })
      pending = 0
    }
    const timer = setInterval(() => {
      const st = stateRef.current
      const watching = !!st.items?.yt && inCinemaSeat(st.scene, st.me)
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
  }, [])
  const standUpFromCinema = useRef(() => {
    const st = stateRef.current
    const me = st.me
    if (!me?.pose) return
    for (const act of ['away', 'phone', 'nap']) if (me[act]) st.cine?.(act, null, { v: false })
    st.goTo?.({ x: me.standX ?? Math.round(me.x), y: me.standY ?? Math.round(me.y) + 1 })
  }).current
  return { cinemaPeople, seated, standUpFromCinema, cineApi }
}
