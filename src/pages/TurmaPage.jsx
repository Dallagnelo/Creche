import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { ErrorBox, Spinner } from '../components/Feedback'
import MemberModal from '../components/MemberModal'
import RoomScene from '../components/RoomScene'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useWhereabouts } from '../hooks/useWhereabouts'
import { KEYS } from '../lib/dataCache'
import { buildFamilyTree } from '../lib/familyTree'
import { listLiveTimes } from '../services/liveTime'
import { listCinemaStats } from '../services/cinema'
import CinemaRanking from '../components/CinemaRanking'
import { listProfiles } from '../services/profiles'

// "A Turma": a sala pixelada onde todo mundo que está na página aparece e anda.
// Embaixo, a turma inteira; clicar numa pessoa (na sala ou na lista) abre os detalhes dela.
export default function TurmaPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsyncData(listProfiles, KEYS.profiles)
  const { data: liveTimes } = useAsyncData(listLiveTimes, KEYS.liveTimes)
  const { data: cinemaStats } = useAsyncData(listCinemaStats, KEYS.cinemaStats)
  const [selectedId, setSelectedId] = useState(null)
  const [inRoom, setInRoom] = useState([])
  const onlineIds = useOutletContext()?.onlineIds ?? []
  const [myRoom, setMyRoom] = useState(null)
  const where = useWhereabouts(user.id, myRoom) // { userId: 'Nome da sala' } de quem está com o jogo aberto
  // situação de cada pessoa: aqui com você, em outra sala, online fora do jogo, ou offline
  const statusOf = (id) => {
    if (id === user.id) return { kind: 'here', text: myRoom ? `Em: ${myRoom}` : 'No jogo' }
    if (inRoom.includes(id)) return { kind: 'here', text: 'Aqui com você' }
    if (!onlineIds.includes(id)) return { kind: 'off', text: 'Offline' }
    if (where[id]) return { kind: 'game', text: `Em: ${where[id]}` }
    return { kind: 'on', text: 'Online · fora do jogo' }
  }
  const RANK = { here: 0, game: 1, on: 2, off: 3 }

  // a árvore não aparece mais, mas os detalhes da pessoa ainda mostram quem convidou quem
  const tree = useMemo(() => (data ? buildFamilyTree(data) : null), [data])
  const selected = tree?.nodes.find((node) => node.id === selectedId) ?? null
  const members = (tree?.nodes ?? [])
    .filter((node) => !node.isGhost)
    .sort((a, b) => RANK[statusOf(a.id).kind] - RANK[statusOf(b.id).kind] || a.member.display_name.localeCompare(b.member.display_name, 'pt-BR'))

  // lista estável para o corredor (uma porta por pessoa)
  const roomMembers = useMemo(
    () => (data ?? []).map((member) => ({ id: member.id, name: member.display_name })),
    [data],
  )

  return (
    <section className="stack turma-page">
      {/* título só para leitores de tela: a página começa direto no conteúdo */}
      <h1 className="sr-only">A Turma</h1>

      {error && <ErrorBox error={error} onRetry={reload} />}

      <RoomScene members={roomMembers} onlineIds={onlineIds} onSelectPerson={(id) => setSelectedId(id)} onPeopleChange={setInRoom} onRoomChange={setMyRoom} />

      <section className="turma-members" aria-labelledby="turma-members-title">
        <h2 id="turma-members-title">
          Membros <span className="muted">({members.length})</span>
        </h2>
        {loading && !data && <Spinner />}
        <ul className="turma-chips">
          {members.map((node) => {
            const status = statusOf(node.id)
            return (
              <li key={node.id}>
                <button type="button" className={`turma-chip is-${status.kind}`} onClick={() => setSelectedId(node.id)}>
                  <span className="turma-chip-photo">
                    <Avatar name={node.member.display_name} src={node.member.avatar_url} size={36} />
                    <span className={`turma-chip-dot is-${status.kind}`} aria-hidden="true" />
                  </span>
                  <span className="turma-chip-text">
                    <span className="turma-chip-name">
                      {node.member.display_name}
                      {node.id === user.id && <span className="muted"> (você)</span>}
                    </span>
                    <span className="turma-chip-status">{status.text}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <CinemaRanking />

      {selected && (
        <MemberModal
          node={selected}
          isMe={selected.id === user.id}
          liveSeconds={liveTimes?.[selected.id] ?? 0}
          cinemaStats={cinemaStats?.[selected.id] ?? null}
          onClose={() => setSelectedId(null)}
          onSelect={(node) => setSelectedId(node.id)}
        />
      )}
    </section>
  )
}
