import { useState } from 'react'
import MyCharacter from '../components/turma2/Turma2Character'
import Turma2Editor from '../components/turma2/Turma2Editor'
import Turma2Game from '../components/turma2/Turma2Game'
import { useAuth } from '../contexts/AuthContext'

// /turma-2: a nova Turma, montada só com os sprites dos pacotes (por enquanto só o admin vê).
// "Jogar": anda pelos mapas. "Meu personagem": monta o visual. "Editor de mapas" (só admin).
const SUBS = {
  jogar: 'Escolha um mapa e saia andando.',
  personagem: 'Monte o seu visual: é com ele que você anda pelos mapas.',
  editor: 'Monte mapas com as peças do pacote e publique para a turma.',
}

export default function Turma2Page() {
  const { isAdmin, profile } = useAuth()
  const [tab, setTab] = useState('jogar')
  const tabs = [
    ['jogar', '🎮 Jogar'],
    ['personagem', '🧑 Meu personagem'],
    ...(isAdmin ? [['editor', '🛠️ Editor de mapas']] : []),
  ]
  const current = tab === 'editor' && !isAdmin ? 'jogar' : tab
  const character = profile?.turma2_char ?? null
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Turma 2.0</h1>
          <p className="page-sub">{SUBS[current]}</p>
        </div>
        <div className="t2-rooms" role="tablist" aria-label="Turma 2.0">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={current === k} className={current === k ? 'is-on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {current === 'jogar' && !character && (
        <p className="t2e-status t2-nudge">
          Você está com o boneco padrão.{' '}
          <button type="button" className="t2-link" onClick={() => setTab('personagem')}>
            Monte o seu personagem
          </button>
        </p>
      )}
      {current === 'editor' ? <Turma2Editor /> : current === 'personagem' ? <MyCharacter /> : <Turma2Game character={character} />}
    </>
  )
}
