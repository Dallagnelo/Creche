import { HUD_PATH as HUD } from '../../../lib/turma2/hudConfig'
import { TIPOS, levelOf, totalLevel } from '../../../lib/turma2/skills'
import { useState, useEffect } from 'react'
import { loadCharLib } from '../../../lib/turma2/character'
import { Panel, MenuTabs } from './HudBits'
import { CharThumb } from '../Turma2Character'

// Janela das habilidades.
export const TIPO_NOME = Object.fromEntries(TIPOS.map(([k, l]) => [k, l]))

/** janela das habilidades: nível e XP de cada uma; clique abre as passivas e o visual */
export function SkillsPanel({ cfg, save, lib, character, onWear, onClose, onTab }) {
  const [open, setOpen] = useState(cfg.skills[0]?.id)
  const [charLib, setCharLib] = useState(null)
  useEffect(() => {
    loadCharLib().then(setCharLib).catch(() => {})
  }, [])
  const person = character && !character.pronto ? character : { corpo: 'body_03', olhos: 'eyes_02', cabelo: 'hairstyle_01_01' }
  const sk = cfg.skills.find((s) => s.id === open)
  const info = levelOf(save.xp?.[open] ?? 0)
  return (
    <Panel title={`Habilidades · nível total ${totalLevel(save, cfg)}`} onClose={onClose} className="t2h-skillsp t2h-menu">
      {onTab && <MenuTabs tab="habilidades" onTab={onTab} />}
      <div className="t2s-body">
        <ul className="t2s-list">
          {cfg.skills.map((s) => {
            const l = levelOf(save.xp?.[s.id] ?? 0)
            return (
              <li key={s.id}>
                <button type="button" className={`t2s-item${open === s.id ? ' is-on' : ''}`} style={{ '--sk': s.cor }} onClick={() => setOpen(s.id)}>
                  <img className="t2h-pix t2s-icon" src={`${HUD}${s.icone}.png`} alt="" />
                  <span className="t2s-name">{s.nome}</span>
                  <b className="t2s-lv">{l.nivel}</b>
                  <span className="t2s-xp" aria-hidden="true">
                    <span style={{ width: `${l.pct * 100}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {sk && (
          <div className="t2s-detail" style={{ '--sk': sk.cor }}>
            <div className="t2s-head">
              <img className="t2h-pix" src={`${HUD}${sk.icone}.png`} alt="" />
              <div>
                <span className="t2h-title">{sk.nome}</span>
                <span className="t2h-muted">
                  Nível {info.nivel}
                  {info.falta ? ` · faltam ${info.falta} XP para o ${info.nivel + 1}` : ' · nível máximo!'}
                </span>
              </div>
            </div>
            <span className="t2s-xp is-big" role="meter" aria-label={`XP de ${sk.nome}`} aria-valuenow={Math.round(info.pct * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${info.pct * 100}%` }} />
            </span>
            <p className="t2s-desc">{sk.desc}</p>
            <ul className="t2s-passives">
              {sk.passivas.map((p, i) => {
                const on = info.nivel >= p.nivel
                return (
                  <li key={i} className={on ? 'is-on' : ''}>
                    <span className="t2s-plv">{on ? '✔' : `🔒 ${p.nivel}`}</span>
                    <span>
                      <b>{p.nome}</b> <small className="t2h-muted">({TIPO_NOME[p.tipo]} +{p.valor}%)</small>
                      <br />
                      <small>{p.desc}</small>
                    </span>
                  </li>
                )
              })}
            </ul>
            {sk.visual && (
              <div className="t2s-look">
                {charLib && <CharThumb lib={charLib} char={{ ...person, roupa: sk.visual.roupa, acessorio: sk.visual.acessorio }} scale={3} />}
                <span>
                  <b>Visual: {sk.visual.nome}</b>
                  <br />
                  <small className="t2h-muted">{info.nivel >= sk.visual.nivel ? 'Liberado!' : `Libera no nível ${sk.visual.nivel}`}</small>
                </span>
                {info.nivel >= sk.visual.nivel && onWear && (
                  <button type="button" className="t2h-text-btn" onClick={() => onWear(save.veste === sk.id ? null : sk.id)}>
                    {save.veste === sk.id ? 'Tirar' : 'Vestir'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
