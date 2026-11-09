import { useMemo, useState } from 'react'
import Avatar from '../components/Avatar'
import { EmptyState, ErrorBox, Spinner } from '../components/Feedback'
import FormModal from '../components/FormModal'
import AddMenu from '../components/AddMenu'
import AlbumCard from '../components/AlbumCard'
import AlbumForm from '../components/AlbumForm'
import AlbumModal from '../components/AlbumModal'
import PostCard from '../components/PostCard'
import PostForm from '../components/PostForm'
import PostModal from '../components/PostModal'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { countBy } from '../lib/stats'
import { deleteAlbum, listAlbums } from '../services/albums'
import { deletePost, listPosts, updatePostCaption, updatePostCrop } from '../services/posts'
import { KEYS } from '../lib/dataCache'

export default function FeedPage() {
  const { user, isAdmin } = useAuth()
  const { data: posts, loading, error, reload } = useAsyncData(listPosts, KEYS.posts)
  const { data: albumsData, reload: reloadAlbums } = useAsyncData(listAlbums, KEYS.albums)
  const albums = albumsData ?? []
  const { settings } = useSettings()
  const asModal = settings.modalForms
  const [showForm, setShowForm] = useState(false)
  const [albumForm, setAlbumForm] = useState(null) // null = fechado, 'new' = criar, ou o álbum que está sendo editado
  const [albumId, setAlbumId] = useState(null) // álbum aberto no carrossel
  const openAlbum = albums.find((album) => album.id === albumId) ?? null
  const [actionError, setActionError] = useState(null)
  const [selectedId, setSelectedId] = useState(null) // foto aberta na janela grande
  const selected = posts?.find((post) => post.id === selectedId) ?? null
  const setSelected = (post) => setSelectedId(post?.id ?? null)

  // Ranking de quem mais postou (calculado a partir dos posts já carregados).
  const ranking = useMemo(() => countBy(posts ?? [], (post) => post.author?.display_name ?? 'Alguém'), [posts])

  // Fotos soltas e álbuns misturados, do mais novo para o mais antigo (álbum conta pela última foto colocada).
  const items = useMemo(
    () =>
      [
        ...(posts ?? []).map((post) => ({ key: `p-${post.id}`, at: post.created_at, post })),
        ...albums.map((album) => ({ key: `a-${album.id}`, at: album.lastAt, album })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at)),
    [posts, albums],
  )

  const showRanking = settings.showStats && ranking.length > 0
  const showSide = !asModal || showRanking

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

  async function handleDeleteAlbum(album) {
    if (!window.confirm(`Apagar o álbum "${album.title}" e todas as fotos dele? Não dá para desfazer.`)) return
    setActionError(null)
    try {
      await deleteAlbum(album)
      setAlbumForm(null)
      setAlbumId(null)
      reloadAlbums()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <section className="stack">
      <div className="page-head">
        <div>
          <h1>Mural</h1>
        </div>
        {asModal ? (
          <AddMenu onPhoto={() => setShowForm(true)} onAlbum={() => setAlbumForm('new')} />
        ) : (
          <div className="page-head-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAlbumForm('new')}>
              Novo álbum
            </button>
            <a className="btn btn-primary page-head-action" href="#nova-lembranca">
              Nova lembrança
            </a>
          </div>
        )}
      </div>

      <div className={showSide ? 'split' : undefined}>
        <section className="card panel mural-panel" aria-labelledby="panel-all">
          <div className="panel-head">
            <h2 id="panel-all">Todas as lembranças</h2>
          </div>

          {actionError && <ErrorBox error={actionError} />}
          {error && <ErrorBox error={error} onRetry={reload} />}
          {loading && !posts && <Spinner />}

          {posts && items.length === 0 && (
            <EmptyState icon="🖼️" title="Nenhuma lembrança ainda">
              Seja o primeiro a postar uma foto do grupo!
            </EmptyState>
          )}

          {items.length > 0 && (
            <ul className="photo-grid photo-grid-auto">
              {items.map((item) => (
                <li key={item.key}>
                  {item.album ? (
                    <AlbumCard album={item.album} onOpen={(album) => setAlbumId(album.id)} />
                  ) : (
                    <PostCard post={item.post} onOpen={setSelected} />
                  )}
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

          {showRanking && (
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
        <FormModal className="sheet-modal" label="Nova lembrança" onClose={() => setShowForm(false)}>
          <PostForm
            onCancel={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false)
              reload()
            }}
          />
        </FormModal>
      )}

      {openAlbum && (
        <AlbumModal
          album={openAlbum}
          userId={user.id}
          isAdmin={isAdmin}
          onClose={() => setAlbumId(null)}
          onEdit={setAlbumForm}
          onChanged={reloadAlbums}
          onDelete={handleDeleteAlbum}
        />
      )}

      {albumForm && (
        <FormModal className="album-shell" label={albumForm === 'new' ? 'Novo álbum' : 'Editar álbum'} onClose={() => setAlbumForm(null)}>
          <AlbumForm
            album={albumForm === 'new' ? null : albumForm}
            onCancel={() => setAlbumForm(null)}
            onSaved={() => {
              setAlbumForm(null)
              reloadAlbums()
            }}
            onDelete={handleDeleteAlbum}
          />
        </FormModal>
      )}

      {selected && (
        <PostModal
          post={selected}
          isOwner={selected.author_id === user.id || isAdmin}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onCaption={async (post, caption) => {
            await updatePostCaption(post.id, caption)
            await reload()
          }}
          onAdjust={async (post, crop) => {
            await updatePostCrop(post.id, crop)
            await reload()
          }}
        />
      )}
    </section>
  )
}
