import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { ErrorBox, Spinner } from '../components/Feedback'
import MemberModal from '../components/MemberModal'
import RoomScene from '../components/RoomScene'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { KEYS } from '../lib/dataCache'
import { buildFamilyTree } from '../lib/familyTree'
import { listLiveTimes } from '../services/liveTime'
import { listProfiles } from '../services/profiles'
import { TURMA_NOVA_PARA_TODOS } from '../lib/features'
import { setLzConfigs } from '../lib/roomLimezu'
import { listLabItemConfigs } from '../services/turmaLab'

// "A Turma": a sala pixelada onde todo mundo que está na página aparece e anda.
// Embaixo, a turma inteira; clicar numa pessoa (na sala ou na lista) abre os detalhes dela.
// lab = "Turma (nova)": só os móveis do pacote LimeZu, sala/corredor/quartos separados da Turma de hoje.
// Na troca definitiva (TURMA_NOVA_PARA_TODOS = true) a página /turma de todo mundo passa a ser a nova.
export default function TurmaPage({ lab: labPage = false }) {
  const lab = labPage || TURMA_NOVA_PARA_TODOS
  // ajustes dos móveis do pacote feitos pelo admin (nome, tapete, parede, assento, cama...)
  useEffect(() => {
    if (!lab) return
    listLabItemConfigs().then(setLzConfigs).catch(() => {})
  }, [lab])
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsyncData(listProfiles, KEYS.profiles)
  const { data: liveTimes } = useAsyncData(listLiveTimes, KEYS.liveTimes)
  const [selectedId, setSelectedId] = useState(null)
  const [inRoom, setInRoom] = useState([])
  const onlineIds = useOutletContext()?.onlineIds ?? []

  // a árvore não aparece mais, mas os detalhes da pessoa ainda mostram quem convidou quem
  const tree = useMemo(() => (data ? buildFamilyTree(data) : null), [data])
  const selected = tree?.nodes.find((node) => node.id === selectedId) ?? null
  const members = (tree?.nodes ?? [])
    .filter((node) => !node.isGhost)
    .sort((a, b) => Number(inRoom.includes(b.id)) - Number(inRoom.includes(a.id)) || a.member.display_name.localeCompare(b.member.display_name, 'pt-BR'))

  // lista estável para o corredor (uma porta por pessoa)
  const roomMembers = useMemo(
    () => (data ?? []).map((member) => ({ id: member.id, name: member.display_name })),
    [data],
  )

  return (
    <section className="stack turma-page">
      <div className="page-head">
        <div>
          <h1>{labPage ? 'A Turma (nova)' : 'A Turma'}</h1>
          {labPage && <p className="muted turma-lab-note">Só o adm vê. Tudo aqui é novo (móveis do pacote LimeZu) e fica separado da Turma de hoje.</p>}
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={reload} />}

      <RoomScene lab={lab} members={roomMembers} onlineIds={onlineIds} onSelectPerson={(id) => setSelectedId(id)} onPeopleChange={setInRoom} />

      <section className="turma-members" aria-labelledby="turma-members-title">
        <h2 id="turma-members-title">
          Membros <span className="muted">({members.length})</span>
        </h2>
        {loading && !data && <Spinner />}
        <ul className="turma-chips">
          {members.map((node) => (
            <li key={node.id}>
              <button type="button" className="turma-chip" onClick={() => setSelectedId(node.id)}>
                <span className="turma-chip-photo">
                  <Avatar name={node.member.display_name} src={node.member.avatar_url} size={36} />
                  {inRoom.includes(node.id) && <span className="online-dot" aria-label="Aqui com você" />}
                </span>
                <span className="turma-chip-name">
                  {node.member.display_name}
                  {node.id === user.id && <span className="muted"> (você)</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <MemberModal
          node={selected}
          isMe={selected.id === user.id}
          liveSeconds={liveTimes?.[selected.id] ?? 0}
          onClose={() => setSelectedId(null)}
          onSelect={(node) => setSelectedId(node.id)}
        />
      )}
    </section>
  )
}
