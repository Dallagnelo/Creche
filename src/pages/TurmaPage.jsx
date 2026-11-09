import { useMemo, useState } from 'react'
import FamilyTree from '../components/FamilyTree'
import { ErrorBox, Spinner } from '../components/Feedback'
import MemberModal from '../components/MemberModal'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { buildFamilyTree } from '../lib/familyTree'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { formatLiveTime } from '../lib/format'
import { listLiveTimes } from '../services/liveTime'
import { listProfiles } from '../services/profiles'
import { KEYS } from '../lib/dataCache'

// "A Turma": a árvore de quem chamou quem. Clicar numa pessoa abre os detalhes dela.
export default function TurmaPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsyncData(listProfiles, KEYS.profiles)
  const { data: liveTimes } = useAsyncData(listLiveTimes, KEYS.liveTimes)
  const [selectedId, setSelectedId] = useState(null)

  const tree = useMemo(() => (data ? buildFamilyTree(data) : null), [data])
  const selected = tree?.nodes.find((node) => node.id === selectedId) ?? null

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>A Turma</h1>
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={reload} />}
      {loading && !data && <Spinner />}

      {tree && (
        <>
          <div className="panel desk-only-block">
            <FamilyTree roots={tree.roots} meId={user.id} onSelect={(node) => setSelectedId(node.id)} />
          </div>
          <ul className="turma-list phone-only-block">
            {tree.nodes
              .filter((node) => !node.isGhost)
              .map((node) => {
                const seconds = liveTimes?.[node.id] ?? 0
                return (
                  <li key={node.id}>
                    <button type="button" className="turma-row" onClick={() => setSelectedId(node.id)}>
                      <Avatar name={node.member.display_name} src={node.member.avatar_url} size={48} />
                      <span className="turma-row-text">
                        <strong>{node.member.display_name}</strong>
                        <span>{seconds > 0 ? `Tempo de live: ${formatLiveTime(seconds)}` : 'Nunca transmitiu'}</span>
                      </span>
                      <Icon name="chevron-right" />
                    </button>
                  </li>
                )
              })}
          </ul>
        </>
      )}

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
