import { ErrorBox, Spinner } from '../components/Feedback'
import ProfileForm from '../components/ProfileForm'
import { useAuth } from '../contexts/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { listProfiles } from '../services/profiles'
import { KEYS } from '../lib/dataCache'

// Aqui você edita o SEU perfil. Todo mundo aparece na página "A Turma".
export default function ProfilePage() {
  const { profile } = useAuth()
  // A lista da turma é usada no campo "Quem te chamou pro grupo?".
  const { data: members, error, reload } = useAsyncData(listProfiles, KEYS.profiles)

  return (
    <section className="stack narrow">
      <div className="page-head">
        <div>
          <h1>Perfil</h1>
        </div>
      </div>

      {error && <ErrorBox error={error} onRetry={reload} />}
      {profile ? <ProfileForm key={profile.id} profile={profile} members={members ?? []} onChanged={reload} /> : <Spinner />}
    </section>
  )
}
