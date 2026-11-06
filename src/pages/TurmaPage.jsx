import { useMemo, useState } from 'react'
import FamilyTree from '../components/FamilyTree'
import { ErrorBox, Spinner } from '../components/Feedback'
import MemberModal from '../components/MemberModal'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatFriendship } from '../lib/format'
import { buildFamilyTree } from '../lib/familyTree'
import { listProfiles } from '../services/profiles'

// "A Turma": a árvore de quem chamou quem. Clicar numa pessoa abre os detalhes dela.
export default function TurmaPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsyncData(listProfiles)
  const [selectedId, setSelectedId] = useState(null)

  const tree = useMemo(() => (data ? buildFamilyTree(data) : null), [data])
  const selected = tree?.nodes.find((node) => node.id === selectedId) ?? null

  // Data do amigo mais antigo = "o grupo existe desde".
  const groupSince = data
    ?.map((member) => member.friends_since)
    .filter(Boolean)
    .sort()[0]

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>A Turma</h1>
          <p className="muted">
            {data
              ? `${data.length} ${data.length === 1 ? 'amigo' : 'amigos'}${
                  groupSince ? ` · o grupo existe há ${formatFriendship(groupSince)}` : ''
                } · toque em alguém para ver os detalhes`
              : 'Carregando...'}
          </p>
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
          onClose={() => setSelectedId(null)}
          onSelect={(node) => setSelectedId(node.id)}
        />
      )}
    </section>
  )
}
