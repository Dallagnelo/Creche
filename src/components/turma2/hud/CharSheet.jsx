import { HUD_PATH as HUD } from '../../../lib/turma2/hudConfig'
import { Bar, Panel, MenuTabs, UiButton, Face } from './HudBits'
import { useState, useEffect } from 'react'
import { loadCharLib, DEFAULT_CHAR } from '../../../lib/turma2/character'
import { totalLevel, levelOf } from '../../../lib/turma2/skills'
import { myClass, classEvo, classXp, equipOf, classLevel, PAPEL_NOME, powerOf, SLOTS, TIER_COR, TIERS } from '../../../lib/turma2/rpg'
import { energyOf, ENERGY_MAX } from '../../../lib/turma2/economy'
import { clockText } from '../../../lib/turma2/clock'
import { CharThumb } from '../Turma2Character'

// Ficha do jogador (status, humor, classe e equipamento).
export const DIRS = ['down', 'left', 'up', 'right']
export const moodFace = (v) => (v >= 75 ? 'cara_feliz' : v >= 50 ? 'cara_ok' : v >= 25 ? 'cara_brava' : 'cara_triste')

/** uma linha de status da ficha: ícone, barra do pacote e o valor */
export function SheetBar({ icon, color, value, label, text }) {
  return (
    <div className="t2p-bar">
      <small className="t2p-barlabel">{label}</small>
      <Bar icon={icon} color={color} value={value} label={label} wide />
      <em>{text}</em>
    </div>
  )
}

/** status da configuração como barra (os de ícones viram fração: 4 de 5 = 80%) */
export const statusBar = (st) => {
  const icons = st.tipo === 'icones'
  const count = Math.max(1, Math.min(10, Number(st.qtd) || 5))
  const v = Number(st.valor) || 0
  return { id: st.id, icon: st.icone || 'i_coracao_p', color: icons ? 'verde' : st.cor || 'verde', value: icons ? v / count : v / 100, label: st.rotulo, text: icons ? `${v}/${count}` : `${Math.round(v)}%` }
}

/** ficha do personagem (modelo da prévia do Modern User Interface): nome, boneco, rosto, nível, status e resumo */
export function CharSheet({ name, character, save, cfg, skillsCfg, g, onTab, onClose, onHelp, onFull, full }) {
  const [charLib, setCharLib] = useState(null)
  const [dir, setDir] = useState(0)
  useEffect(() => {
    loadCharLib().then(setCharLib).catch(() => {})
  }, [])
  const person = character ?? DEFAULT_CHAR // boneco padrão (antes aparecia um "?")
  const level = skillsCfg ? totalLevel(save, skillsCfg) : 1
  const skills = skillsCfg?.skills ?? []
  // progresso até o próximo nível: média do que falta em cada habilidade
  const cls = myClass(save) // classe do RPG (null = ainda não escolheu)
  const evoName = cls && classEvo(save) ? cls.evos[classEvo(save)]?.nome : null
  const xpPct = cls ? levelOf(classXp(save, cls.id)).pct : skills.length ? skills.reduce((a, sk) => a + levelOf(save.xp?.[sk.id] ?? 0).pct, 0) / skills.length : 0
  const eq = equipOf(save)
  const best = skills.map((sk) => ({ sk, l: levelOf(save.xp?.[sk.id] ?? 0) })).sort((a, b) => b.l.nivel - a.l.nivel || b.l.pct - a.l.pct)[0]
  const energy = energyOf(save, g.day)
  const humor = cfg.status.find((st) => st.id === 'humor')
  const top = cfg.status
    .filter((st) => st.id !== 'fome' && st.id !== 'humor')
    .map((st) => (st.id === 'energia' && skillsCfg ? { id: 'energia', icon: 'i_raio', color: energy / ENERGY_MAX > 0.5 ? 'verde' : energy / ENERGY_MAX > 0.2 ? 'amarela' : 'vermelha', value: energy / ENERGY_MAX, label: 'Energia', text: `${energy}` } : statusBar(st)))
  if (skillsCfg && !top.some((b) => b.id === 'energia')) top.push({ id: 'energia', icon: 'i_raio', color: 'verde', value: energy / ENERGY_MAX, label: 'Energia', text: `${energy}` })
  const dayPct = (((g.minutes - 360 + 1440) % 1440) / 1440)
  const bottom = [{ id: 'tempo', icon: 'i_ampulheta', color: 'vermelha', value: dayPct, label: 'Dia passando', text: clockText(g) }, ...cfg.status.filter((st) => st.id === 'fome').map((st) => ({ ...statusBar(st), color: 'amarela' }))]
  const friends = Object.values(save.amigos ?? {}).filter((a) => (a.pts ?? 0) > 0).length
  const items = save.inv.reduce((a, it) => a + (it.tipo === 'moeda' ? 0 : it.qtd || 1), 0)
  return (
    <Panel title="Ficha do personagem" onClose={onClose} className="t2h-menu t2p">
      <MenuTabs tab="personagem" onTab={onTab} />
      <div className="t2p-body">
        <div className="t2p-left t2p-fundo">
          <div className="t2p-name">
            <span>{name}</span>
          </div>
          <div className="t2p-figs">
            <div className="t2p-fig">
              <UiButton cell={[5, 2]} label="Virar" onClick={() => setDir((d) => (d + 3) % 4)} />
              <span className="t2p-thumb">{charLib && person ? <CharThumb lib={charLib} char={person} scale={3} dir={DIRS[dir]} /> : <img className="t2h-pix" src={`${HUD}i_pergunta.png`} alt="" style={{ width: 36, height: 48 }} />}</span>
              <UiButton cell={[4, 2]} label="Virar" onClick={() => setDir((d) => (d + 1) % 4)} />
            </div>
            <div className="t2p-side">
              <div className="t2p-face">{person && <Face char={person} size={64} />}</div>
              <div className="t2p-level" title={`Nível total das habilidades: ${level}`}>
                <img className="t2h-pix" src={`${HUD}i_estrela.png`} alt="" />
                <b>{level}</b>
                <small>nível</small>
              </div>
            </div>
          </div>
          {humor && (
            <div className="t2p-mood" title={`${humor.rotulo || 'Humor'}: ${Math.round(Number(humor.valor) || 0)}%`}>
              <span className="t2p-moodface">
                <img className="t2h-pix" src={`${HUD}${moodFace(Number(humor.valor) || 0)}.png`} alt="" />
              </span>
              <Bar color={humor.cor || 'azul'} value={(Number(humor.valor) || 0) / 100} label={humor.rotulo || 'Humor'} wide />
            </div>
          )}
        </div>
        <div className="t2p-right">
          <div className="t2p-fundo t2p-xp">
            <img className="t2h-pix" src={`${HUD}i_estrela.png`} alt="" />
            <span className="t2p-seg" role="meter" aria-label={cls ? 'XP da classe' : 'Progresso do próximo nível'} aria-valuenow={Math.round(xpPct * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${xpPct * 100}%` }} />
            </span>
            <small>{cls ? `XP de ${cls.nome}: ${Math.round(xpPct * 100)}% até o nível ${classLevel(save) + 1}` : best && best.l.nivel > 1 ? `Melhor habilidade: ${best.sk.nome}` : 'Faça atividades para subir de nível'}</small>
          </div>
          <div className="t2p-fundo t2p-group">
            {top.map((b) => (
              <SheetBar key={b.id} {...b} />
            ))}
          </div>
          <div className="t2p-fundo t2p-group">
            {bottom.map((b) => (
              <SheetBar key={b.id} {...b} />
            ))}
          </div>
          <div className="t2p-class" style={{ '--cls': cls?.cor ?? '#b98a5e' }}>
            {cls ? (
              <>
                <b>{evoName ?? cls.nome}</b>
                <small>
                  {PAPEL_NOME[cls.papel]} · nível {classLevel(save)} · poder {powerOf(save)}
                </small>
              </>
            ) : (
              <>
                <b>Sem classe</b>
                <small>Escolha no Portal dos Monstros</small>
              </>
            )}
          </div>
          <div className="t2p-equip">
            {SLOTS.map(([k, nome]) => (
              <span key={k} className={`t2p-eq${eq[k] ? ' is-on' : ''}`} style={{ '--tier': TIER_COR[eq[k]] ?? 'transparent' }} title={`${nome}: ${TIERS[eq[k]]}`}>
                <small>{nome}</small>
                <b>{TIERS[eq[k]]}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="t2p-foot">
        <div className="t2p-tiles">
          <span className="t2p-tile" title="Moedas">
            <img className="t2h-pix" src={`${HUD}i_moeda_grande.png`} alt="" />
            <b>{save.moedas}</b>
          </span>
          <button type="button" className="t2p-tile" onClick={() => onTab('mochila')} title="Itens na mochila">
            <img className="t2h-pix" src={`${HUD}i_mochila.png`} alt="" />
            <b>{items}</b>
          </button>
          <button type="button" className="t2p-tile" onClick={() => onTab('amigos')} title="Amigos">
            <img className="t2h-pix" src={`${HUD}i_coracao.png`} alt="" />
            <b>{friends}</b>
          </button>
          <span className="t2p-tile" title={`${g.weekday}. ${g.dayOfSeason} · ${g.season}`}>
            <img className="t2h-pix" src={`${HUD}i_livro.png`} alt="" />
            <b>{g.dayOfSeason}</b>
          </span>
        </div>
        <div className="t2p-btns">
          {onHelp && <UiButton cell={[1, 3]} label="Ajuda" hotkey="H" onClick={onHelp} />}
          <UiButton cell={[6, 0]} label="Mapas" hotkey="M" onClick={() => onTab('mapas')} />
          {onFull && <UiButton icon="i_cheia" label={full ? 'Sair da tela cheia' : 'Tela cheia'} hotkey="F" pressed={full} onClick={onFull} />}
        </div>
      </div>
    </Panel>
  )
}
