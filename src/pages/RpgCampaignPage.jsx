import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Spinner } from '../components/Feedback'
import CharacterCreator from '../components/rpg/CharacterCreator'
import CharacterSheet from '../components/rpg/CharacterSheet'
import Lobby from '../components/rpg/Lobby'
import EncounterBanner from '../components/rpg/EncounterBanner'
import MasterPanel from '../components/rpg/MasterPanel'
import RoundPanel, { roundState, timeLeft } from '../components/rpg/RoundPanel'
import RpgIcon from '../components/rpg/RpgIcon'
import { useAuth } from '../contexts/AuthContext'
import { classOf, derived, fmtMod, proficiency } from '../lib/rpg/data'
import { listProfiles } from '../services/profiles'
import { createCharacter, deleteCampaign, getTable, roll, saveAction, updateCharacter } from '../services/rpg'
import '../styles/rpg.css'

const TABS = [
  { id: 'mesa', label: 'Mesa' },
  { id: 'ficha', label: 'Minha ficha' },
  { id: 'grupo', label: 'Grupo' },
  { id: 'diario', label: 'Diário' },
  { id: 'mestre', label: 'Mestre', master: true },
]

/** Mesa de uma campanha: cena, ficha, grupo, diário e (para o mestre) o painel de controle. */
export default function RpgCampaignPage() {
  const { campaignId } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [table, setTable] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mesa')
  const [profiles, setProfiles] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [, setTick] = useState(0)

  const isMasterGuess = table?.campaign?.master_id === user?.id
  const load = useCallback(
    async (master = isMasterGuess) => {
      try {
        let data = await getTable(campaignId, { master })
        // descobre que é o mestre na primeira carga: busca de novo com os números dos inimigos e o baú
        if (data && !master && data.campaign.master_id === user?.id) data = await getTable(campaignId, { master: true })
        setTable(data)
        setError(null)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    },
    [campaignId, isMasterGuess, user?.id],
  )

  useEffect(() => {
    load()
    // confere de tempos em tempos (outros jogadores podem ter jogado) e quando a aba volta a ter foco
    const timer = setInterval(() => load(), 30000)
    const clock = setInterval(() => setTick((t) => t + 1), 60000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      clearInterval(clock)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const master = table?.campaign?.master_id === user?.id
  useEffect(() => {
    if ((master || isAdmin) && !profiles) listProfiles().then(setProfiles).catch(() => setProfiles([]))
  }, [master, isAdmin, profiles])

  if (loading && !table) return <Spinner />
  if (error && !table) return <ErrorBox error={error} onRetry={() => load()} />
  if (!table) {
    return (
      <div className="rpg">
        <p className="rpg-panel rpg-empty">Campanha não encontrada (ou você não foi chamado para ela).</p>
        <Link to="/rpg" className="rpg-btn-ghost" style={{ alignSelf: 'flex-start' }}>Voltar</Link>
      </div>
    )
  }

  const { campaign, characters, current, rounds, actions, rolls, enemies, members } = table
  const myChar = characters.find((c) => c.user_id === user?.id) ?? null
  const isPlayer = members.some((m) => m.user_id === user?.id)
  const state = roundState(current, characters, actions)
  const pending = state === 'open' && myChar && !actions.some((a) => a.character_id === myChar.id)
  const previous = current?.status === 'aberta' ? rounds[1] : null

  async function handleRoll({ sides, count, modifier, label }) {
    const r = await roll({ campaignId, sides, count, modifier, label, roundId: current?.id ?? null, characterId: myChar?.id ?? null })
    setTable((t) => ({ ...t, rolls: [r, ...t.rolls] }))
    return r
  }

  async function rollAttr(attr) {
    if (!myChar) return
    const mod = (myChar.attrs?.[attr.id] ?? 0) + proficiency(myChar.level)
    await handleRoll({ sides: 20, count: 1, modifier: mod, label: `Teste de ${attr.name}` })
    setTab('mesa')
  }

  async function saveSheet(patch) {
    await updateCharacter(myChar.id, patch)
    setTable((t) => ({ ...t, characters: t.characters.map((c) => (c.id === myChar.id ? { ...c, ...patch } : c)) }))
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir a campanha "${campaign.name}"? Personagens, rodadas e rolagens somem junto. Não dá para desfazer.`)) return
    try {
      await deleteCampaign(campaign.id)
      navigate('/rpg')
    } catch (err) {
      setError(err)
    }
  }

  const lobby = campaign.status === 'lobby'
  const tabs = TABS.filter((t) => !t.master || master).filter((t) => t.id !== 'ficha' || isPlayer || myChar)
  const viewChar = characters.find((c) => c.id === viewing)

  return (
    <section className="stack">
      <div className="rpg">
        <header className="rpg-split">
          <div style={{ minWidth: 0 }}>
            <Link to="/rpg" className="rpg-kicker" style={{ textDecoration: 'none' }}>← Campanhas</Link>
            <h1>{campaign.name}</h1>
            <p className="rpg-soft rpg-italic">
              {campaign.status === 'lobby' ? 'Sala de espera · ' : ''}{master ? 'Você é o mestre.' : `Mestre: ${campaign.master?.display_name ?? '—'}`}
              {current ? ` · Rodada ${current.number}${state === 'open' ? `, ${timeLeft(current.closes_at)}` : state === 'closed' ? ', fechada' : ''}` : ''}
            </p>
          </div>
          <span className="rpg-row">
            <button type="button" className="rpg-btn-ghost" onClick={() => load()}>Atualizar</button>
            {isAdmin && <button type="button" className="rpg-btn-dark" onClick={handleDelete}>Excluir campanha</button>}
          </span>
        </header>

        {error && lobby && <ErrorBox error={error} onRetry={() => load()} />}
        {lobby && <Lobby table={table} user={user} isAdmin={isAdmin} profiles={profiles} onReload={() => load()} />}
        {!lobby && (<>

        <EncounterBanner enemies={enemies} master={master} roundLabel={current ? `Rodada ${current.number}` : ''} />

        <nav className="rpg-tabs" aria-label="Seções da campanha">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => { setTab(t.id); setViewing(null) }}>
              {t.label}
              {t.id === 'mesa' && pending && <span className="rpg-badge" aria-label="sua vez">!</span>}
              {t.id === 'mestre' && state === 'closed' && <span className="rpg-badge" aria-label="rodada para resolver">!</span>}
            </button>
          ))}
        </nav>

        {error && <ErrorBox error={error} onRetry={() => load()} />}

        {tab === 'mesa' && (
          <>
            {isPlayer && !myChar && <CharacterCreator onCreate={async (c) => { await createCharacter(campaignId, c); await load() }} />}
            <RoundPanel
              round={current}
              previous={previous}
              characters={characters}
              actions={actions}
              rolls={rolls}
              myChar={myChar}
              members={members}
              onSaveAction={async (form) => { await saveAction({ roundId: current.id, characterId: myChar.id, ...form }); await load() }}
              onRoll={handleRoll}
            />
          </>
        )}

        {tab === 'ficha' && (myChar ? (
          <CharacterSheet character={myChar} editable onSave={saveSheet} onRollAttr={rollAttr} />
        ) : isPlayer ? (
          <CharacterCreator onCreate={async (c) => { await createCharacter(campaignId, c); await load() }} />
        ) : null)}

        {tab === 'grupo' && (viewChar ? (
          <>
            <button type="button" className="rpg-btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setViewing(null)}>← O grupo</button>
            <CharacterSheet character={viewChar} editable={false} onSave={async () => {}} />
          </>
        ) : (
          <div className="rpg-pick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {characters.length === 0 && <p className="rpg-panel rpg-empty">Ninguém criou personagem ainda.</p>}
            {characters.map((c) => {
              const cls = classOf(c.class)
              return (
                <button key={c.id} type="button" className="rpg-card" onClick={() => setViewing(c.id)}>
                  <span className="rpg-split">
                    <span className="rpg-row" style={{ gap: 8 }}><RpgIcon name={cls?.icon ?? 'crossed-swords'} /><b style={{ fontSize: 18 }}>{c.name}</b></span>
                    <span className="rpg-ink-soft rpg-italic">{cls?.name} nv {c.level}</span>
                  </span>
                  <span className="rpg-row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <span className="rpg-bar" aria-hidden="true"><i style={{ width: `${(c.hp / c.hp_max) * 100}%` }} /></span>
                    <b style={{ whiteSpace: 'nowrap' }}>{c.hp}/{c.hp_max}</b>
                  </span>
                  <span className="rpg-ink-soft" style={{ fontSize: 14 }}>
                    {c.status === 'caido' ? 'Caído!' : c.status === 'morto' ? 'Morto' : `Defesa ${derived(c).defense} · ataque ${fmtMod(derived(c).attack)}`}
                    {members.find((m) => m.user_id === c.user_id)?.profile?.display_name ? ` · ${members.find((m) => m.user_id === c.user_id).profile.display_name}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        ))}

        {tab === 'diario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {rounds.length === 0 && <p className="rpg-panel rpg-empty">A história ainda não começou.</p>}
            {rounds.map((r) => (
              <article key={r.id} className="rpg-panel" aria-labelledby={`r-${r.id}`}>
                <h2 id={`r-${r.id}`}>Rodada {r.number} · {r.kind === 'combate' ? 'Combate' : 'Exploração'}</h2>
                <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{r.scene}</p>
                {r.resolution ? (
                  <p className="rpg-italic" style={{ whiteSpace: 'pre-line', lineHeight: 1.6, borderLeft: '3px solid #a8823f', paddingLeft: 12 }}>{r.resolution}</p>
                ) : (
                  <p className="rpg-ink-soft rpg-italic">Em andamento.</p>
                )}
              </article>
            ))}
          </div>
        )}

        {tab === 'mestre' && master && <MasterPanel table={table} profiles={profiles} onReload={() => load(true)} />}
        </>)}
      </div>
    </section>
  )
}
