import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { formatAge, todayISO } from '../lib/format'
import { DEFAULT_CROP } from '../lib/imageCrop'
import { isGif, OTHER, removeAvatar, setAvatar, updateProfile } from '../services/profiles'
import Avatar from './Avatar'
import DateField from './DateField'
import { ErrorBox } from './Feedback'
import ImageCropper from './ImageCropper'

const BIO_MAX = 300

/**
 * Formulário do meu perfil. A foto é salva na hora em que você a escolhe;
 * os demais campos são salvos ao clicar em "Salvar perfil".
 *  - profile: dados atuais (vêm do banco)
 *  - members: lista da turma (para escolher "quem te chamou")
 *  - onChanged: avisa a página para recarregar a lista da turma
 */
export default function ProfileForm({ profile, members = [], onChanged }) {
  const { user, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  // Se a migração "migracao-turma.sql" já foi rodada, o perfil vem com as colunas novas.
  const hasTurmaFields = 'friends_since' in profile

  const [values, setValues] = useState({
    display_name: profile.display_name ?? '',
    birth_date: profile.birth_date ?? '',
    city: profile.city ?? '',
    favorite_game: profile.favorite_game ?? '',
    favorite_movie: profile.favorite_movie ?? '',
    bio: profile.bio ?? '',
    ...(hasTurmaFields && {
      friends_since: profile.friends_since ?? '',
      invited_by: profile.invited_by ?? (profile.invited_by_name ? OTHER : ''),
      invited_by_name: profile.invited_by_name ?? '',
    }),
  })
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [pending, setPending] = useState(null) // foto escolhida, ainda sendo ajustada: { file, url }
  const [photoCrop, setPhotoCrop] = useState(DEFAULT_CROP)

  // Libera a memória da pré-visualização quando ela troca ou a página fecha.
  useEffect(() => () => pending && URL.revokeObjectURL(pending.url), [pending])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Um só "handler" serve para todos os campos: o atributo name diz qual mudar.
  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setSaved(false)
  }

  async function afterChange() {
    await refreshProfile() // atualiza o menu/cabeçalho
    onChanged() // atualiza a lista da turma
  }

  // Escolher a foto só abre o editor de enquadramento; o envio acontece em "Usar esta foto".
  function handlePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!file) return
    setError(null)
    if (isGif(file)) {
      // GIF animado não passa pelo recorte (perderia a animação): vai direto, centralizado pelo navegador.
      sendGif(file)
      return
    }
    setPhotoCrop(DEFAULT_CROP)
    setPending({ file, url: URL.createObjectURL(file) })
  }

  async function sendGif(file) {
    setPhotoBusy(true)
    try {
      await setAvatar(user.id, file, profile.avatar_url)
      await afterChange()
    } catch (err) {
      setError(err)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleUsePhoto() {
    setPhotoBusy(true)
    setError(null)
    try {
      await setAvatar(user.id, pending.file, profile.avatar_url, photoCrop)
      setPending(null)
      await afterChange()
    } catch (err) {
      setError(err)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleRemovePhoto() {
    if (!window.confirm('Remover a sua foto de perfil?')) return
    setPhotoBusy(true)
    setError(null)
    try {
      await removeAvatar(user.id, profile.avatar_url)
      await afterChange()
    } catch (err) {
      setError(err)
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile(user.id, values)
      await afterChange()
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const age = formatAge(values.birth_date)

  return (
    <form className="card form panel" onSubmit={handleSubmit}>
      <div className="panel-head">
        <h2>Meu perfil</h2>
      </div>

      <div className="profile-photo">
        <Avatar name={values.display_name || '?'} src={profile.avatar_url} size={96} />
        <div className="profile-photo-actions">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handlePhoto}
            aria-label="Escolher foto de perfil"
          />
          <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={photoBusy}>
            {photoBusy ? 'Enviando...' : profile.avatar_url ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {profile.avatar_url && (
            <button type="button" className="btn btn-danger-ghost" onClick={handleRemovePhoto} disabled={photoBusy}>
              Remover foto
            </button>
          )}
          <span className="muted hint">Aceita foto e GIF de até 5 MB</span>
        </div>
      </div>

      {pending && (
        <div className="field avatar-adjust">
          <span>Escolha a parte da foto</span>
          <ImageCropper src={pending.url} value={photoCrop} onChange={setPhotoCrop} />
          <div className="adjuster-actions">
            <button type="button" className="btn btn-primary" onClick={handleUsePhoto} disabled={photoBusy}>
              {photoBusy ? 'Enviando...' : 'Usar esta foto'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)} disabled={photoBusy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="form-row">
        <label className="field">
          <span>Nome</span>
          <input name="display_name" value={values.display_name} onChange={handleChange} minLength={2} maxLength={40} required />
        </label>
        <div className="field">
          <span>Data de nascimento{age && ` · ${age}`}</span>
          <DateField
            name="birth_date"
            value={values.birth_date}
            onChange={handleChange}
            min="1900-01-01"
            max={todayISO()}
            clearable
            placeholder="Escolher data"
            ariaLabel="Data de nascimento"
          />
        </div>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Cidade</span>
          <input name="city" value={values.city} onChange={handleChange} maxLength={80} placeholder="Ex.: Porto Alegre" />
        </label>
        <label className="field">
          <span>Jogo favorito</span>
          <input name="favorite_game" value={values.favorite_game} onChange={handleChange} maxLength={80} />
        </label>
      </div>

      <label className="field">
        <span>Filme favorito</span>
        <input name="favorite_movie" value={values.favorite_movie} onChange={handleChange} maxLength={80} />
      </label>

      {/* Campos da página "A Turma" */}
      <fieldset className="fieldset">
        <legend>Na turma</legend>

        {hasTurmaFields ? (
          <>
            <div className="form-row">
              <div className="field">
                <span>Amigos desde</span>
                <DateField
                  name="friends_since"
                  value={values.friends_since}
                  onChange={handleChange}
                  min="1900-01-01"
                  max={todayISO()}
                  clearable
                  placeholder="Escolher data"
                  ariaLabel="Amigos desde"
                />
              </div>
              <label className="field">
                <span>Quem te chamou pro grupo?</span>
                <select name="invited_by" value={values.invited_by} onChange={handleChange}>
                  <option value="">Não informar</option>
                  {members
                    .filter((member) => member.id !== profile.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.display_name}
                      </option>
                    ))}
                  <option value={OTHER}>Outra pessoa (escrever o nome)</option>
                </select>
              </label>
            </div>

            {values.invited_by === OTHER && (
              <label className="field">
                <span>Nome de quem te chamou</span>
                <input name="invited_by_name" value={values.invited_by_name} onChange={handleChange} maxLength={80} />
              </label>
            )}
          </>
        ) : (
          <p className="muted">
            Para preencher &quot;Amigos desde&quot; e &quot;Quem te chamou&quot;, rode a migração{' '}
            <code>migracao-turma.sql</code> no Supabase.
          </p>
        )}
      </fieldset>

      <label className="field">
        <span>Sobre mim</span>
        <textarea
          name="bio"
          rows={4}
          maxLength={BIO_MAX}
          value={values.bio}
          onChange={handleChange}
          placeholder="Conte um pouco sobre você para a turma..."
        />
        <span className="muted hint">
          {values.bio.length}/{BIO_MAX}
        </span>
      </label>

      {error && <ErrorBox error={error} />}

      <div className="form-actions">
        {saved && (
          <span className="success" role="status">
            Perfil salvo!
          </span>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || photoBusy}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>
    </form>
  )
}
