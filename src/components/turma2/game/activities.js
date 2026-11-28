import { countOf, BENS, energyOf, energyCost, withEnergy, fruitReady, giveGood, productOf, takeGood, giftPoints, friendOf, setFriend, ENERGY_MAX, growth, sprinklerSince, CROPS, sellPrice } from '../../../lib/turma2/economy'
import { T, ghostGone } from './gameHelpers'
import { gameTime } from '../../../lib/turma2/clock'
import { bonus, skillById, levelIn } from '../../../lib/turma2/skills'
import { perk, myClass, classLevel, powerOf, chooseClass, classById, classEvo, EVO_NIVEL, setRpg, rpgOf, nextRecipe, equipOf, SLOTS, TIERS, TIER_COR, ENERGIA_EXPEDICAO, addClassXp } from '../../../lib/turma2/rpg'
import { souEu } from '../../../services/turma2Rpg'

// O que acontece ao apertar E perto de algo (lojas, bichos, horta, cama, portal...) e o resultado das atividades.
// Recriado a cada render do jogo, como antes, então sempre vê o progresso mais novo.
export function makeActivities({ saveRef, skillsRef, worldRef, note, cineRef, setTelaoOpen, commit, setJob, gainXp, socialRef, hudRef, fxRef, uid, closeJob, job }) {
  // ---------------------------------------------------------------- atividades (E)
  const startAct = (a) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const w = worldRef.current
    const need = { pesca: 'vara', cozinha: 'panela', conserto: 'caixa' }[a.tipo]
    if (need && countOf(s, need) === 0) {
      note(`Você precisa de: ${BENS[need].nome}. Compre numa loja.`)
      return
    }
    const cine = cineRef.current
    if (cine && ['poltrona', 'levantar', 'pipoca', 'refri', 'telao'].includes(a.tipo)) {
      const wme = w?.me
      if (a.tipo === 'telao') setTelaoOpen(true)
      else if (a.tipo === 'levantar') cine.stand()
      else if (a.tipo === 'pipoca' || a.tipo === 'refri') {
        cine.grab(a.tipo === 'pipoca')
        note(a.tipo === 'pipoca' ? 'Peguei pipoca! 🍿 Senta numa poltrona e joga nos amigos' : 'Peguei um refri! 🥤')
      } else if (wme) {
        const seat = w.acts.find((x) => x.id === a.id)
        const [sx, sy] = seat?.cells.find(([x, y]) => x === wme.x && y === wme.y) ?? seat?.cells[0] ?? [wme.x, wme.y]
        wme.path = []
        wme.px = sx * T + T / 2
        wme.py = sy * T + 13
        wme.dir = 'up'
        cine.sit(`${sx},${sy}`)
      }
      return
    }
    if (a.tipo === 'conserto' || a.tipo === 'coragem') {
      const today = gameTime().day
      const en = energyOf(s, today)
      if (en < energyCost(s, a.tipo)) {
        note('Você está exausto… coma alguma coisa ou espere a manhã.')
        return
      }
      commit(withEnergy(s, today, en - energyCost(s, a.tipo)))
    }
    if (['pesca', 'cozinha', 'conserto', 'loja', 'coragem', 'portal', 'oficina', 'classes'].includes(a.tipo)) setJob({ tipo: a.tipo, id: a.id })
    else if (a.tipo === 'venda' || a.tipo === 'bau') setJob({ tipo: a.tipo })
    else if (a.tipo === 'fruta') {
      const today = gameTime().day
      if (!fruitReady(s, w.room.code, a.id, today)) return
      const qtd = 1 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() * 100 < bonus(s, cfg, 'jardinagem', 'dobro') ? 1 : 0)
      const next = giveGood({ ...s, frutas: { ...s.frutas, [w.room.code]: { ...s.frutas?.[w.room.code], [a.id]: today } } }, a.fruta, qtd)
      commit(gainXp(next, 'jardinagem', 4 * qtd))
      note(`Colheu ${qtd}× ${BENS[a.fruta].nome}. A árvore dá de novo daqui a uns dias.`)
    } else if (a.tipo === 'feno') {
      const today = gameTime().day
      if (s.fenoDia === today) return
      commit({ ...giveGood(s, 'feno', 5), fenoDia: today })
      note('Pegou 5 fenos. Dê um para cada bicho (E perto dele).')
    } else if (a.tipo === 'bicho') {
      const today = gameTime().day
      const room = w.room.code
      const b = s.bichos?.[room]?.[a.id] ?? {}
      const set = (patch, next = s) => ({ ...next, bichos: { ...next.bichos, [room]: { ...next.bichos?.[room], [a.id]: { ...b, ...patch } } } })
      if (a.step === 'coletar') {
        const prod = productOf(a.bicho)
        const qtd = Math.random() * 100 < bonus(s, cfg, 'criacao', 'dobro') ? 2 : 1
        commit(gainXp(set({ coletou: today }, giveGood(s, prod, qtd)), 'criacao', 10 * qtd))
        note(`Coletou ${qtd > 1 ? '2× ' : ''}${BENS[prod].nome}!`)
      } else if (a.step === 'alimentar') {
        if (!countOf(s, 'feno')) return note('Você não tem feno. Pegue no monte de feno ou compre na barraca.')
        commit(gainXp(set({ comeu: today, amor: (b.amor ?? 0) + 2 }, takeGood(s, 'feno')), 'criacao', 5))
        note(productOf(a.bicho) ? `Deu feno. Amanhã tem ${BENS[productOf(a.bicho)].nome.toLowerCase()}!` : 'Deu feno. Ele ficou feliz!')
      } else if (a.step === 'carinho') {
        commit(gainXp(set({ carinho: today, amor: (b.amor ?? 0) + 1 }), 'criacao', 3))
        socialRef.current?.emote('coracao', a.npc)
      }
    } else if (a.tipo === 'presente') {
      const today = gameTime().day
      const key = s.hot[s.sel]
      const id = key && s.inv.find((it) => it.key === key)?.bem
      if (!id) return
      const npc = w.npcs.find((n) => n.id === a.id)
      const pts = Math.round(giftPoints(npc, id) * (perk(s, 'streamer') && giftPoints(npc, id) > 0 ? 1.5 : 1))
      const am = friendOf(s, w.room.code, a.id)
      commit(setFriend(takeGood(s, id), w.room.code, a.id, { ...am, pts: Math.max(0, (am.pts ?? 0) + pts), presente: today, nome: npc.nome }))
      note(pts >= 80 ? `${npc.nome} amou o presente! ♥` : pts > 0 ? `${npc.nome} gostou do presente.` : `${npc.nome} não gostou nada disso…`, { cor: pts > 0 ? '#ff7aa8' : '#8a8a8a' })
      socialRef.current?.emote(pts >= 80 ? 'coracao' : pts > 0 ? 'nota' : 'triste', a.id)
      hudRef.current.talk(npc)
    } else if (a.tipo === 'cama') {
      const today = gameTime().day
      if (s.dormiu === today) return note('Você já dormiu hoje. Volte amanhã!')
      commit({ ...withEnergy(s, today, ENERGY_MAX), dormiu: today })
      fxRef.current?.('dormir')
      note('Você tirou um cochilo e acordou com a energia cheia. 💤', { big: true, cor: '#9ad0ff' })
    } else if (a.tipo === 'irrigador') {
      const plots = s.horta?.[w.room.code] ?? {}
      const { [a.cell]: _gone, ...rest } = plots
      commit(giveGood({ ...s, horta: { ...s.horta, [w.room.code]: rest } }, 'irrigador'))
      note('Recolheu o irrigador.')
    }
    else if (a.tipo === 'colher') {
      const today = gameTime().day
      const plots = s.horta?.[w.room.code] ?? {}
      const plot = plots[a.cell]
      if (!plot?.planta || growth(s, cfg, plot, today, sprinklerSince(plots, a.cell)) < 1) return
      const qtd = Math.random() * 100 < bonus(s, cfg, 'jardinagem', 'dobro') ? 2 : 1
      // colheu: a terra continua arada (e molhada, se já regou hoje)
      let next = giveGood({ ...s, horta: { ...s.horta, [w.room.code]: { ...plots, [a.cell]: { arado: today, agua: (plot.agua ?? []).filter((d) => d === today) } } } }, plot.planta, qtd)
      next = gainXp(next, 'jardinagem', CROPS[plot.planta].xp * qtd)
      commit(next)
      fxRef.current?.('colher', a.cell)
      socialRef.current?.tool('colher')
      note(`Colheu ${qtd > 1 ? '2× ' : ''}${BENS[plot.planta].nome}`)
    } else if (a.tipo === 'correio') {
      const me = w.me
      const far = (x, y) => Math.abs(x - me.x) + Math.abs(y - me.y)
      const opts = [
        ...w.npcs.filter((n) => n.nome).map((n) => ({ tipo: 'npc', id: n.id, nome: n.nome, x: n.x, y: n.y })),
        ...w.acts.filter((x) => x.tipo === 'caixa_correio').map((x) => ({ tipo: 'obj', id: x.id, nome: 'a caixa de correio marcada', x: x.cells[0][0], y: x.cells[0][1] })),
      ].filter((o) => far(o.x, o.y) >= 8)
      if (!opts.length) {
        note('Nenhum endereço para entregar neste mapa.')
        return
      }
      const to = opts[Math.floor(Math.random() * opts.length)]
      const dist = far(to.x, to.y)
      commit({ ...s, entrega: { mapa: w.room.code, para: { tipo: to.tipo, id: to.id }, nome: to.nome, dist, ate: Date.now() + (20 + dist * 1.1) * 1000 } })
      note(`Pegou um pacote! Leve para ${to.nome}.`, { big: true, cor: skillById(cfg, 'entregas').cor })
    } else if (a.tipo === 'entregar') {
      const e = s.entrega
      const late = Date.now() > e.ate
      const coins = Math.max(1, Math.round((4 + e.dist / 3) * (1 + bonus(s, cfg, 'entregas', 'moedas') / 100) * (perk(s, 'atleta') ? 1.2 : 1) * (late ? 0.5 : 1)))
      const next = gainXp({ ...s, entrega: null, moedas: s.moedas + coins }, 'entregas', Math.round((10 + e.dist / 2) * (late ? 0.5 : 1)))
      commit(next)
      note(`Entregue! +${coins} moedas${late ? ' (atrasou: metade)' : ''}`)
    }
  }
  /** conta para o banco a classe, o nível e o poder (os colegas veem no Portal) */
  const syncRpg = (s) => {
    const c = myClass(s)
    if (uid && c) souEu(c.id, classLevel(s), powerOf(s)).catch(() => {})
  }
  const jobResult = (r) => {
    const s = saveRef.current
    const cfg = skillsRef.current
    const room = worldRef.current?.room
    if (r.tipo === 'lance') {
      // pescar de novo: cada lance gasta energia (o primeiro já gastou ao usar a vara)
      const today = gameTime().day
      const en = energyOf(s, today)
      if (en < energyCost(s, 'vara')) {
        closeJob()
        note('Você está exausto… coma alguma coisa ou espere a manhã.')
        return
      }
      commit(withEnergy(s, today, en - energyCost(s, 'vara')))
    } else if (r.tipo === 'pesca') {
      commit(gainXp(giveGood(s, r.fish.id, r.fish.qtd), 'pesca', r.fish.xp * r.fish.qtd))
    } else if (r.tipo === 'cozinha') {
      let next = s
      for (const u of r.uses) next = takeGood(next, u)
      commit(gainXp(giveGood(next, r.dish, r.qtd), 'culinaria', r.xp))
    } else if (r.tipo === 'conserto') {
      const lv = levelIn(s, 'mecanica')
      const dbl = Math.random() * 100 < bonus(s, cfg, 'mecanica', 'dobro') ? 2 : 1
      const coins = Math.round((4 + lv / 4) * (1 + bonus(s, cfg, 'mecanica', 'moedas') / 100) * (perk(s, 'engenheiro') ? 1.25 : 1) * dbl)
      const next = { ...s, moedas: s.moedas + coins, consertos: { ...s.consertos, [room.code]: { ...s.consertos?.[room.code], [job.id]: Date.now() } } }
      commit(gainXp(next, 'mecanica', Math.round(18 + lv / 2)))
      note(`+${coins} moedas pelo conserto${dbl > 1 ? ' (pagaram em dobro!)' : ''}`)
    } else if (r.tipo === 'coragem') {
      ghostGone.set(`${room.code}:${job.id}`, Date.now())
      if (!r.ok) {
        commit(gainXp(s, 'coragem', 5))
        return
      }
      const lv = levelIn(s, 'coragem')
      const coins = Math.round((6 + lv / 3) * (1 + bonus(s, cfg, 'coragem', 'moedas') / 100))
      let next = { ...s, moedas: s.moedas + coins }
      const goo = Math.random() * 100 < 35 + bonus(s, cfg, 'coragem', 'dobro')
      if (goo) next = giveGood(next, 'gosma')
      commit(gainXp(next, 'coragem', 30))
      note(`+${coins} moedas${goo ? ' e uma gosma de fantasma' : ''}`)
    } else if (r.tipo === 'caixa' || r.tipo === 'tirar') {
      // caixa de venda: põe hoje, recebe na manhã seguinte (dá para tirar de volta no mesmo dia)
      const today = gameTime().day
      const box = s.caixa?.dia === today ? s.caixa : { dia: today, itens: {} }
      const have = r.tipo === 'caixa' ? countOf(s, r.id) : box.itens[r.id] ?? 0
      const qtd = Math.min(have, r.qtd)
      if (!qtd) return
      const itens = { ...box.itens, [r.id]: (box.itens[r.id] ?? 0) + (r.tipo === 'caixa' ? qtd : -qtd) }
      if (!itens[r.id]) delete itens[r.id]
      const moved = r.tipo === 'caixa' ? takeGood(s, r.id, qtd) : giveGood(s, r.id, qtd)
      commit({ ...moved, caixa: { dia: today, itens } })
    } else if (r.tipo === 'guardar' || r.tipo === 'retirar') {
      // baú: passa itens entre a mochila e o baú (o baú guarda do mesmo jeito que a mochila)
      const from = r.tipo === 'guardar' ? s.inv : s.bau ?? []
      const it = from.find((x) => x.key === r.key)
      if (!it) return
      const qtd = Math.min(it.qtd, r.qtd)
      const take = (list) => list.flatMap((x) => (x.key !== r.key ? [x] : x.qtd > qtd ? [{ ...x, qtd: x.qtd - qtd }] : []))
      const put = (list) => (list.some((x) => x.key === r.key) ? list.map((x) => (x.key === r.key ? { ...x, qtd: x.qtd + qtd } : x)) : [...list, { ...it, qtd }])
      commit(r.tipo === 'guardar' ? { ...s, inv: take(s.inv), bau: put(s.bau ?? []) } : { ...s, inv: put(s.inv), bau: take(s.bau ?? []) })
    } else if (r.tipo === 'vender') {
      const have = countOf(s, r.id)
      const qtd = Math.min(have, r.qtd)
      if (!qtd) return
      const total = sellPrice(s, cfg, r.id) * qtd
      commit(gainXp({ ...takeGood(s, r.id, qtd), moedas: s.moedas + total }, 'comercio', Math.max(1, Math.round(total * 0.8))))
    } else if (r.tipo === 'rpg_classe') {
      const next = chooseClass(s, r.id)
      if (!next) return note('Moedas insuficientes para trocar de classe.')
      commit(next)
      const c = classById(r.id)
      note(`Agora você é ${c.nome}! ${c.vila}`, { big: true, cor: c.cor })
      syncRpg(next)
    } else if (r.tipo === 'rpg_evo') {
      const c = myClass(s)
      if (!c || classEvo(s) || classLevel(s) < EVO_NIVEL) return
      const next = setRpg(s, { evo: { ...rpgOf(s).evo, [c.id]: r.evo } })
      commit(next)
      note(`Evoluiu para ${c.evos[r.evo].nome}!`, { big: true, cor: c.cor })
      syncRpg(next)
    } else if (r.tipo === 'rpg_mostra') {
      commit(setRpg(s, { mostra: r.v }))
    } else if (r.tipo === 'rpg_equip') {
      const rec = nextRecipe(s, r.slot)
      if (!rec || s.moedas < rec.moedas || Object.entries(rec.mats).some(([id, q]) => countOf(s, id) < q)) return
      let next = { ...s, moedas: s.moedas - rec.moedas }
      for (const [id, q] of Object.entries(rec.mats)) next = takeGood(next, id, q)
      next = setRpg(next, { equip: { ...equipOf(s), [r.slot]: rec.tier }, mostra: rpgOf(s).mostra ?? (r.slot === 'arma' ? null : r.slot) })
      commit(next)
      note(`Equipamento novo: ${SLOTS.find(([k]) => k === r.slot)[1]} de ${TIERS[rec.tier].toLowerCase()}!`, { big: true, cor: TIER_COR[rec.tier] })
      syncRpg(next)
    } else if (r.tipo === 'rpg_aceitou') {
      const today = gameTime().day
      let next = withEnergy(s, today, energyOf(s, today) - ENERGIA_EXPEDICAO)
      if (r.comida && countOf(next, r.comida)) next = takeGood(next, r.comida)
      commit(next)
    } else if (r.tipo === 'rpg_premio') {
      let next = { ...s, moedas: s.moedas + (r.moedas ?? 0) }
      if (r.qtd && BENS[r.material]) next = giveGood(next, r.material, r.qtd)
      const x = addClassXp(next, r.classe, r.xp ?? 0)
      commit(x.save)
      const c = classById(r.classe)
      note(`${r.res === 'vitoria' ? 'Vitória' : r.res === 'parcial' ? 'Quase' : 'Derrota'} contra ${r.monstro}: +${r.moedas} moedas, +${r.xp} XP${r.qtd ? `, ${r.qtd}× ${BENS[r.material].nome.toLowerCase()}` : ''}`, { big: true, cor: c?.cor })
      if (x.up) note(`${c?.nome ?? 'Classe'} subiu para o nível ${x.up}!${x.up >= EVO_NIVEL && !classEvo(x.save, r.classe) ? ' Escolha a evolução no quadro das classes.' : ''}`, { big: true, cor: c?.cor })
      syncRpg(x.save)
    } else if (r.tipo === 'comprar') {
      if (s.moedas < r.preco) return
      commit(giveGood({ ...s, moedas: s.moedas - r.preco }, r.id))
    }
  }
  return { startAct, jobResult }
}
