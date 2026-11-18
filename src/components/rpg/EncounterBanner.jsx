import { monsterOf } from '../../lib/rpg/data'
import RpgIcon from './RpgIcon'

const conditionOf = (e) => {
  if (e.condition) return e.condition
  if (e.hp <= 0) return 'Derrotado'
  if (e.hp * 4 <= e.hp_max) return 'Quase caindo'
  if (e.hp * 4 <= e.hp_max * 3) return 'Ferido'
  return 'Inteiro'
}
const pctOf = { Inteiro: 100, Ferido: 60, 'Quase caindo': 22, Derrotado: 0 }

/** O monstro que o grupo enfrenta agora: a única figura da tela. O mestre vê os números; os jogadores, só o estado. */
export default function EncounterBanner({ enemies, master, roundLabel }) {
  const alive = enemies.filter((e) => conditionOf(e) !== 'Derrotado')
  if (!enemies.length) return null
  const main = [...alive].sort((a, b) => (monsterOf(b.monster_key)?.cost ?? 0) - (monsterOf(a.monster_key)?.cost ?? 0))[0] ?? enemies[0]
  const info = monsterOf(main.monster_key)
  const cond = conditionOf(main)
  const pct = master ? Math.max(0, Math.round((main.hp / main.hp_max) * 100)) : pctOf[cond]

  return (
    <section className="rpg-panel-stone rpg-foe" aria-label="Enfrentando agora">
      <div className="rpg-foe-art">
        <RpgIcon name={info?.icon ?? 'skull-crossed-bones'} label={main.name} />
        {info?.crown && <RpgIcon name="crown" className="rpg-crown" />}
      </div>
      <div className="rpg-foe-info">
        <span className="rpg-kicker">{alive.length ? 'Enfrentando agora' : 'Encontro vencido'}{roundLabel ? ` · ${roundLabel}` : ''}</span>
        <h2 style={{ fontSize: 28, color: 'var(--cream)' }}>{main.name}</h2>
        <div className="rpg-row" style={{ maxWidth: 480 }}>
          <div className="rpg-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          <b style={{ fontFamily: 'var(--display)', color: master ? 'var(--gold-hi)' : '#e07a5f' }}>
            {master ? `${Math.max(0, main.hp)}/${main.hp_max}` : cond}
          </b>
        </div>
        {master && info && <span className="rpg-soft" style={{ fontSize: 14 }}>Defesa {main.defense} · ataque +{info.atk} ({info.dmg}) · {info.special}</span>}
        {enemies.length > 1 && (
          <div className="rpg-foe-list">
            {enemies.filter((e) => e !== main).map((e) => (
              <span key={e.id} className={`rpg-chip${conditionOf(e) === 'Derrotado' ? ' is-down' : ''}`}>
                <RpgIcon name={monsterOf(e.monster_key)?.icon ?? 'skull-crossed-bones'} />
                {e.name} · {master ? `${Math.max(0, e.hp)}/${e.hp_max}` : conditionOf(e)}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
