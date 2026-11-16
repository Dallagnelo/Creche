import { useState } from 'react'
import { lzConfigOf, setLzConfigs } from '../lib/roomLimezu'
import { listLabItemConfigs, saveLabItemConfig } from '../services/turmaLab'
import { ErrorBox } from './Feedback'
import FormModal from './FormModal'

// Turma (nova), só admin: ajusta o "jeito" de um móvel do pacote (vale para todas as cores e para todo mundo).
const KINDS = [
  { id: 'solid', label: 'Móvel comum', hint: 'Bloqueia a passagem.' },
  { id: 'floor', label: 'Tapete / piso', hint: 'Dá para pisar em cima.' },
  { id: 'wall', label: 'Vai na parede', hint: 'Quadro, janela, prateleira...' },
  { id: 'seat', label: 'Assento', hint: 'Cadeira, sofá, banco.' },
  { id: 'bed', label: 'Cama', hint: 'Dá para deitar.' },
  { id: 'pass', label: 'Atravessável', hint: 'Porta aberta, cortina...' },
]
const DIRS = {
  seat: [
    { id: 'down', label: 'De frente (olha para baixo)' },
    { id: 'up', label: 'De costas (olha para cima)' },
    { id: 'left', label: 'Olha para a esquerda' },
    { id: 'right', label: 'Olha para a direita' },
  ],
  bed: [
    { id: 'up', label: 'Cabeceira em cima' },
    { id: 'down', label: 'Cabeceira embaixo' },
    { id: 'left', label: 'Cabeceira à esquerda' },
    { id: 'right', label: 'Cabeceira à direita' },
  ],
}

export default function LzItemConfig({ itemKey, onClose }) {
  const info = lzConfigOf(itemKey)
  const [name, setName] = useState(info?.config.name ?? '')
  const [kind, setKind] = useState(info?.config.kind ?? 'solid')
  const [dir, setDir] = useState(info?.config.dir ?? (info?.config.kind === 'bed' ? 'up' : 'down'))
  const [h, setH] = useState(info?.config.h ?? 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  if (!info) return null

  async function save(reset = false) {
    setSaving(true)
    setError(null)
    try {
      const config = reset ? null : { name: name.trim() || undefined, kind, dir: DIRS[kind] ? dir : undefined, h: kind === 'floor' ? undefined : Number(h) }
      await saveLabItemConfig(info.group, config)
      setLzConfigs(await listLabItemConfigs())
      onClose()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <FormModal label="Ajustar móvel" onClose={onClose} className="lzcfg">
      <div className="xp-form">
        <div className="xp-form-head">
          <h2>Ajustar móvel</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <p className="muted lzcfg-note">Vale para todas as cores deste móvel e para todo mundo. Código: {info.group}</p>
        <label className="xp-field">
          <span>Nome</span>
          <input value={name} maxLength={40} placeholder={info.defaultLabel} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="xp-field">
          <span>Tipo</span>
          <div className="lzcfg-kinds">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={`lzcfg-kind${kind === k.id ? ' is-on' : ''}`} onClick={() => setKind(k.id)}>
                <b>{k.label}</b>
                <small className="muted">{k.hint}</small>
              </button>
            ))}
          </div>
        </div>
        {DIRS[kind] && (
          <label className="xp-field">
            <span>{kind === 'bed' ? 'Cabeceira' : 'Para onde a pessoa olha'}</span>
            <select value={dir} onChange={(e) => setDir(e.target.value)}>
              {DIRS[kind].map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind !== 'floor' && kind !== 'wall' && (
          <label className="xp-field">
            <span>Fundura no chão (quadradinhos)</span>
            <select value={h} onChange={(e) => setH(e.target.value)}>
              {[1, 2, 3, 4].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <ErrorBox error={error} />}
        <div className="modal-actions">
          {info.custom && (
            <button type="button" className="btn btn-ghost" onClick={() => save(true)} disabled={saving}>
              Voltar ao padrão
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={() => save()} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </FormModal>
  )
}
