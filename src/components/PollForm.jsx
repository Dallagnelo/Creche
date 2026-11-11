import { useMemo, useState } from 'react'
import { usePhone } from '../hooks/useMediaQuery'
import { todayISO } from '../lib/format'
import { createPoll } from '../services/polls'
import { getMovieDetails } from '../lib/tmdb'
import MovieSearch from './MovieSearch'
import DateField from './DateField'
import { ErrorBox } from './Feedback'
import Icon from './Icon'
import { Poster, Tag } from './PollBits'
import SheetTop from './SheetTop'
import TimeField from './TimeField'

const PRESETS = [1, 3, 6, 12, 24, 48]
const MAX_HOURS = 720

function closeText(date, now) {
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const pad = (n) => String(n).padStart(2, '0')
  if (date.toDateString() === now.toDateString()) return `hoje às ${time}`
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${time}`
}

// Nova votação. No computador é uma janela com tudo junto (filmes à esquerda, tempo e evento à direita);
// no celular são dois passos em tela cheia.
export default function PollForm({ onCancel, onCreated }) {
  const phone = usePhone()
  const [step, setStep] = useState(1)
  const [picked, setPicked] = useState([])
  const [extras, setExtras] = useState([]) // filmes escolhidos na busca (TMDB), só para esta votação
  const [title, setTitle] = useState('')
  const [choice, setChoice] = useState(6) // número de horas ou 'other'
  const [custom, setCustom] = useState('')
  const [noTimer, setNoTimer] = useState(true)
  const [makeEvent, setMakeEvent] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // "Outro": horas e minutos digitados nos mesmos quadrinhos da hora do evento
  const customHours = custom ? Number(custom.split(':')[0] || 0) + Number(custom.split(':')[1] || 0) / 60 : 0
  const hours = noTimer ? null : choice === 'other' ? customHours : choice
  const hoursOk = noTimer || (Number.isFinite(hours) && hours >= 1 / 60 - 1e-9 && hours <= MAX_HOURS)
  const closesAt = hoursOk && !noTimer ? new Date(Date.now() + hours * 3600000) : null

  // O evento precisa começar depois que a votação encerrar.
  const eventStart = useMemo(() => {
    if (!makeEvent || !date) return null
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time ? time.split(':').map(Number) : [23, 59]
    return new Date(y, m - 1, d, hh, mm)
  }, [makeEvent, date, time])
  const eventTooEarly = Boolean(eventStart) && eventStart <= (closesAt ?? new Date())

  // Escolheu um filme na busca: ele entra só nesta votação (não vai para a lista da página Filmes).
  function addFromWeb(found) {
    const id = `tmdb:${found.tmdb_id}`
    setExtras((list) => (list.some((item) => item.id === id) ? list : [...list, { ...found, id }]))
    setPicked((list) => (list.includes(id) ? list : [...list, id]))
  }
  // Tocar num filme escolhido tira ele da votação.
  const togglePick = (id) => {
    setPicked((list) => list.filter((item) => item !== id))
    setExtras((list) => list.filter((item) => item.id !== id))
  }

  const step1Ok = picked.length >= 2
  const step2Ok = title.trim().length > 0 && hoursOk && (!makeEvent || (Boolean(date) && !eventTooEarly))
  const canSubmit = step1Ok && step2Ok && !saving

  async function handleSubmit(event) {
    event?.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      // Só os dados do filme vão para a votação (não entram na lista da página Filmes).
      const chosen = []
      for (const key of picked) {
        const web = extras.find((item) => item.id === key)
        if (!web) continue
        // a busca não traz o código do IMDb: pega nos detalhes (se falhar, segue sem ele)
        const details = await getMovieDetails(web.tmdb_id).catch(() => null)
        chosen.push({ ...web, ...(details ?? {}) })
      }
      const id = await createPoll({ title, movies: chosen, hours: noTimer ? null : hours, makeEvent, date, time, place })
      onCreated(id)
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const filmesPart = (
    <section className="pf-col pf-movies" aria-label="Filmes da votação">
      <div className="pf-col-head">
        <span className="pf-kicker">{phone ? 'Passo 1 de 2' : '1 · Escolha os filmes'}</span>
        <Tag icon="check" tone="mint">{picked.length === 1 ? '1 filme' : `${picked.length} filmes`}</Tag>
      </div>
      {phone && <h3 className="pf-ask">Quais filmes entram na disputa?</h3>}
      <MovieSearch bare label="Buscar filme para votação" placeholder="Nome do filme, ex.: Interestelar" onSelect={addFromWeb} />
      {extras.length > 0 && <span className="pf-sub">Filmes na votação · toque para tirar</span>}
      {extras.length === 0 && <p className="pf-empty">Busque um filme acima e toque no resultado para adicionar. Escolha pelo menos 2.</p>}
      <div className="pf-grid">
        {extras.map((movie) => {
          const on = picked.includes(movie.id)
          return (
            <button key={movie.id} type="button" className={`pf-pick${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => togglePick(movie.id)}>
              <span className="pf-pick-art">
                <Poster movie={movie} size="w185" />
                {on && <span className="pf-check"><Icon name="check" /></span>}
              </span>
              <span className="pf-pick-title">{movie.title}</span>
            </button>
          )
        })}
      </div>
    </section>
  )

  const configPart = (
    <section className="pf-col pf-config" aria-label="Tempo e evento">
      <div className="pf-col-head">
        <span className="pf-kicker">{phone ? 'Passo 2 de 2' : '2 · Tempo e evento'}</span>
        {phone && <Tag icon="check" tone="mint">{picked.length} filmes</Tag>}
      </div>

      <label className="field">
        <span>Título da votação</span>
        <input type="text" required maxLength={100} placeholder="Ex.: Qual filme vemos na sexta?" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <div className="field">
        <span>Quanto tempo fica aberta?</span>
        <div className="pf-chips" role="group" aria-label="Tempo aberta">
          {PRESETS.map((value) => (
            <button key={value} type="button" className={`pf-chip${!noTimer && choice === value ? ' is-on' : ''}`} disabled={noTimer} aria-pressed={!noTimer && choice === value} onClick={() => setChoice(value)}>
              {value} h
            </button>
          ))}
          <button type="button" className={`pf-chip${!noTimer && choice === 'other' ? ' is-on' : ''}`} disabled={noTimer} aria-pressed={!noTimer && choice === 'other'} onClick={() => setChoice('other')}>
            Outro
          </button>
        </div>
        {!noTimer && choice === 'other' && (
          <div className="pf-other">
            <TimeField value={custom} ariaLabel="Duração da votação (horas e minutos)" maxHour={99} clearLabel="Limpar" onChange={setCustom} />
          </div>
        )}
      </div>

      <label className="pf-switch">
        <span><strong>Sem prazo</strong><small>Só quem criou encerra</small></span>
        <input type="checkbox" role="switch" checked={noTimer} onChange={(event) => setNoTimer(event.target.checked)} />
        <i aria-hidden="true" />
      </label>

      <label className="pf-switch">
        <span><strong>Virar evento ao encerrar</strong><small>Vencedor (ou empatados) entram no evento</small></span>
        <input type="checkbox" role="switch" checked={makeEvent} onChange={(event) => setMakeEvent(event.target.checked)} />
        <i aria-hidden="true" />
      </label>

      {makeEvent && (
        <div className="pf-event">
          <div className="form-row form-row-time">
            <div className="field">
              <span>Dia do evento</span>
              <DateField value={date} min={todayISO()} ariaLabel="Dia do evento" onChange={(event) => setDate(event.target.value || todayISO())} />
            </div>
            <div className="field">
              <span>Hora (opcional)</span>
              <TimeField value={time} ariaLabel="Hora do evento" onChange={setTime} />
            </div>
          </div>
          <label className="field">
            <span>Local (opcional)</span>
            <input type="text" maxLength={100} placeholder="Ex.: Casa do João" value={place} onChange={(event) => setPlace(event.target.value)} />
          </label>
        </div>
      )}

      <p className={`pf-note${eventTooEarly ? ' is-error' : ''}`} role={eventTooEarly ? 'alert' : undefined}>
        {eventTooEarly
          ? 'O evento precisa ser depois do fim da votação. Escolha outro dia ou hora.'
          : noTimer
            ? 'Sem prazo: você encerra quando quiser' + (makeEvent ? ', e o evento é criado nesse momento.' : '.')
            : closesAt
              ? `Encerra ${closeText(closesAt, new Date())}` + (makeEvent ? '. O evento só é criado nesse momento.' : '.')
              : 'Informe a duração: pelo menos 1 minuto.'}
      </p>
      {error && <ErrorBox error={error} />}
    </section>
  )

  return (
    <form className="form pf-form sheet-modal" onSubmit={handleSubmit}>
      {phone ? <SheetTop title="Nova votação" onClose={onCancel} /> : (
        <header className="pf-head"><h2>Nova votação</h2><button type="button" className="pf-x" aria-label="Fechar" onClick={onCancel}><Icon name="close" /></button></header>
      )}
      <div className={`pf-body${phone ? ' sheet-body' : ''}`}>
        {phone ? (step === 1 ? filmesPart : (
          <>
            <button type="button" className="pf-back" onClick={() => setStep(1)}>‹ Filmes</button>
            {configPart}
          </>
        )) : (
          <>
            {filmesPart}
            {configPart}
          </>
        )}
      </div>
      <div className="pf-foot sheet-foot-actions">
        {phone ? (
          step === 1 ? (
            <button type="button" className="btn btn-primary" disabled={!step1Ok} onClick={() => setStep(2)}>
              Continuar · {picked.length} {picked.length === 1 ? 'filme' : 'filmes'}
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>{saving ? 'Abrindo…' : 'Abrir votação'}</button>
          )
        ) : (
          <>
            <span className="pf-need muted">{step1Ok ? '' : 'Escolha pelo menos 2 filmes.'}</span>
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>{saving ? 'Abrindo…' : 'Abrir votação'}</button>
          </>
        )}
      </div>
    </form>
  )
}
