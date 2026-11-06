import { useMemo, useState } from 'react'
import Avatar from '../components/Avatar'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import PostCard from '../components/PostCard'
import PostForm from '../components/PostForm'
import PostModal from '../components/PostModal'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { countBy } from '../lib/stats'
import { deletePost, listPosts, updatePostCrop } from '../services/posts'

export default function FeedPage() {
  const { user } = useAuth()
  const { data: posts, loading, error, reload } = useAsyncData(listPosts)
  const { settings } = useSettings()
  const asModal = settings.modalForms
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [selectedId, setSelectedId] = useState(null) // foto aberta na janela grande
  const selected = posts?.find((post) => post.id === selectedId) ?? null
  const setSelected = (post) => setSelectedId(post?.id ?? null)

  // Ranking de quem mais postou (calculado a partir dos posts já carregados).
  const ranking = useMemo(() => countBy(posts ?? [], (post) => post.author?.display_name ?? 'Alguém'), [posts])

  const showSide = !asModal || ranking.length > 0

  async function handleDelete(post) {
    if (!window.confirm('Apagar esta lembrança? Não dá para desfazer.')) return
    setActionError(null)
    try {
      await deletePost(post)
      setSelected(null)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Mural</h1>
          <p className="muted">
            {posts ? `${posts.length} ${posts.length === 1 ? 'lembrança guardada' : 'lembranças guardadas'}` : 'Carregando...'}
          </p>
        </div>
        {asModal ? (
          <button type="button" className="btn btn-new" aria-haspopup="dialog" onClick={() => setShowForm(true)}>
            + Nova lembrança
          </button>
        ) : (
          <a className="btn btn-primary page-head-action" href="#nova-lembranca">
            Nova lembrança
          </a>
        )}
      </div>

      <div className={showSide ? 'split' : undefined}>
        <section className="card panel" aria-labelledby="panel-all">
          <div className="panel-head">
            <h2 id="panel-all">Todas as lembranças</h2>
          </div>

          {actionError && <ErrorBox error={actionError} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !posts && <Spinner />}

          {posts && posts.length === 0 && (
            <EmptyState icon="🖼️" title="Nenhuma lembrança ainda">
              Seja o primeiro a postar uma foto do grupo!
            </EmptyState>
          )}

          {posts?.length > 0 && (
            <ul className="photo-grid photo-grid-auto">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} onOpen={setSelected} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {showSide && (
        <aside className="side">
          {!asModal && (
            <div id="nova-lembranca">
              <PostForm onCreated={reload} />
            </div>
          )}

          {ranking.length > 0 && (
            <section className="card panel" aria-labelledby="panel-rank">
              <div className="panel-head">
                <h2 id="panel-rank">Quem mais postou</h2>
              </div>
              <ul className="bars">
                {ranking.map((item) => (
                  <li key={item.label}>
                    <div className="bar-row">
                      <Avatar name={item.label} src={item.sample.author?.avatar_url} size={24} />
                      <span className="bar-label">{item.label}</span>
                      <span className="muted">{item.count}</span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${(item.count / ranking[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
        )}
      </div>

      {asModal && showForm && (
        <FormModal label="Nova lembrança" onClose={() => setShowForm(false)}>
          <PostForm
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false)
              reload()
            }}
          />
        </FormModal>
      )}

      {selected && (
        <PostModal
          post={selected}
          isOwner={selected.author_id === user.id}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onAdjust={async (post, crop) => {
            await updatePostCrop(post.id, crop)
            await reload()
          }}
        />
      )}
    </section>
  )
}
