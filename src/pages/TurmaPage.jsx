import { useMemo, useState } from 'react'
import FamilyTree from '../components/FamilyTree'
import { ErrorBox, Spinner } from '../components/Feedback'
import MemberModal from '../components/MemberModal'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { buildFamilyTree } from '../lib/familyTree'
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
        <div className="panel">
          <FamilyTree roots={tree.roots} meId={user.id} onSelect={(node) => setSelectedId(node.id)} />
        </div>
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
