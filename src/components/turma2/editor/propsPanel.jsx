import { KIND_NAME, TILE_KINDS, leftOf, rgbToHex, hexToRgb, MODOS } from './editorHelpers'
import { themeName } from '../../../lib/turma2/assets'
import { Num, LightFields } from './EditorInputs'
import { actTypeOf, ACT_LABEL, ACT_TYPES } from '../../../lib/turma2/economy'

// Painel da direita do editor: campos da coisa selecionada (objeto, porta, personagem, luz...) ou do mapa.
export function makePropsPanel({ selected, sel, updateItem, lib, chosen, allTargets, bichos, setCharEdit, duplicateSel, removeSel }) {
  const propsPanel = () => {
    if (!selected) return null
    const k = sel.kind
    const up = (patch) => updateItem(k, sel.id, patch)
    return (
      <section className="t2e-card">
        <h3>
          {KIND_NAME[k]}
          {(k === 'object' || k === 'anim') && <small>{k === 'object' ? (selected.src === 'moveis' ? `${themeName(selected.t)} #${selected.n}` : selected.n) : selected.n}</small>}
        </h3>
        {k === 'object' || k === 'anim' || k === 'light' || k === 'traffic' ? (
          <div className="t2e-row">
            <Num label="X (px)" value={selected.x} onChange={(v) => up({ x: v })} />
            <Num label="Y (px)" value={selected.y} onChange={(v) => up({ y: v })} />
          </div>
        ) : null}
        {TILE_KINDS.has(k) && (
          <div className="t2e-row">
            <Num label="X" value={selected.x} min={0} onChange={(v) => up({ x: v })} />
            <Num label="Y" value={selected.y} min={0} onChange={(v) => up({ y: v })} />
          </div>
        )}
        {k === 'object' && (
          <>
            <div className="t2e-row">
              <Num label="Fileiras que bloqueiam" value={selected.d ?? 1} min={0} max={30} onChange={(v) => up({ d: v })} />
              <label className="t2e-check">
                <input type="checkbox" checked={!!selected.f} onChange={(e) => up({ f: e.target.checked || undefined })} />
                Espelhar
              </label>
            </div>
            <p className="muted t2e-tip">0 = dá para passar por cima (tapete, sombra). O boneco passa atrás do resto.</p>
            <label className="t2e-check">
              <input type="checkbox" checked={!!selected.chao} onChange={(e) => up({ chao: e.target.checked ? 1 : undefined, d: e.target.checked ? 0 : selected.d })} />
              No chão (todo mundo passa por cima: tapete, deque, toalha, faixa)
            </label>
            <label className="t2e-check">
              <input type="checkbox" checked={!!selected.porta} onChange={(e) => up({ porta: e.target.checked ? 1 : undefined, d: e.target.checked ? 0 : selected.d })} />
              Só aparece quando alguém chega perto (porta abrindo)
            </label>
            <label className="t2e-field">
              <span>Atividade (tecla E no jogo)</span>
              <select value={selected.at ?? ''} onChange={(e) => up({ at: e.target.value || undefined })}>
                <option value="">
                  Automática{selected.src !== 'moveis' && actTypeOf(selected.t, selected.n) ? ` (${ACT_LABEL[actTypeOf(selected.t, selected.n)]})` : ' (nenhuma)'}
                </option>
                <option value="nada">Nenhuma</option>
                {ACT_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <LightFields value={selected.l} onChange={(l) => up({ l })} />
          </>
        )}
        {k === 'anim' && (
          <>
            <div className="t2e-row">
              <Num label="Velocidade (quadros/s)" value={selected.fps ?? 8} min={1} max={30} onChange={(v) => up({ fps: v })} />
              <Num label="Fileiras que bloqueiam" value={selected.d ?? 0} min={0} max={20} onChange={(v) => up({ d: v })} />
            </div>
            <div className="t2e-row">
              <Num label="Largura do quadro" value={selected.fw ?? lib.anims[selected.n][3]} min={4} max={512} onChange={(v) => up({ fw: v })} />
              <Num label="Quadros" value={selected.fr ?? lib.anims[selected.n][5]} min={1} max={64} onChange={(v) => up({ fr: v })} />
            </div>
            <p className="muted t2e-tip">Se a animação "pular", ajuste a largura do quadro e o número de quadros.</p>
            <label className="t2e-field">
              <span>Aparece</span>
              <select value={selected.w ?? ''} onChange={(e) => up({ w: e.target.value })}>
                <option value="">Sempre</option>
                <option value="n">Só à noite (fantasmas, vagalumes)</option>
                <option value="d">Só de dia (pássaros)</option>
              </select>
            </label>
            <LightFields value={selected.l} onChange={(l) => up({ l })} />
          </>
        )}
        {k === 'patrol' && (
          <>
            <div className="t2e-row">
              <Num label="Começo X" value={selected.x0} onChange={(v) => up({ x0: v })} />
              <Num label="Fim X" value={selected.x1} onChange={(v) => up({ x1: v })} />
            </div>
            <div className="t2e-row">
              <Num label="Pé Y" value={selected.y} onChange={(v) => up({ y: v })} />
              <Num label="Velocidade" value={selected.speed ?? 14} min={2} max={200} onChange={(v) => up({ speed: v })} />
            </div>
            <label className="t2e-field">
              <span>Animado voltando</span>
              <select value={selected.l} onChange={(e) => up({ l: e.target.value })}>
                <option value={selected.r}>O mesmo, espelhado</option>
                {Object.keys(lib.anims)
                  .filter((n) => n !== selected.r)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
              </select>
            </label>
            {chosen.anims && chosen.anims.n !== selected.r && (
              <button type="button" onClick={() => up({ r: chosen.anims.n, l: leftOf(chosen.anims.n, lib.anims) })}>
                Trocar por "{chosen.anims.n}"
              </button>
            )}
          </>
        )}
        {k === 'light' && (
          <>
            <div className="t2e-row">
              <Num label="Raio" value={selected.r} min={8} max={400} onChange={(v) => up({ r: v })} />
              <label className="t2e-field">
                <span>Cor</span>
                <input type="color" value={rgbToHex(selected.c)} onChange={(e) => up({ c: hexToRgb(e.target.value) })} />
              </label>
            </div>
            <label className="t2e-check">
              <input type="checkbox" checked={!!selected.giro} onChange={(e) => up({ giro: e.target.checked || undefined })} />
              Farol (um facho de luz girando à noite)
            </label>
          </>
        )}
        {k === 'traffic' && (
          <>
            <p className="muted t2e-tip">{selected.a ?? selected.n}</p>
            <div className="t2e-row">
              <Num label="Velocidade (px/s)" value={selected.speed ?? 60} min={-300} max={300} onChange={(v) => up({ speed: v })} />
              <button type="button" onClick={() => up({ speed: -(selected.speed ?? 60) })}>
                Inverter direção
              </button>
            </div>
            <p className="muted t2e-tip">Positivo vai para a direita; negativo, para a esquerda. Use a peça virada para o lado certo (car_right / car_left). Carro para e buzina se o jogador estiver na frente.</p>
            {selected.a && (
              <Num label="Largura do quadro" value={selected.fw ?? lib.anims[selected.a]?.[3]} min={4} max={512} onChange={(v) => up({ fw: v })} />
            )}
          </>
        )}
        {k === 'door' && (
          <>
            <label className="t2e-field">
              <span>Leva para</span>
              <select
                value={selected.to}
                onChange={(e) => {
                  const t = allTargets.find((x) => x.code === e.target.value)
                  up({ to: e.target.value, sx: t?.spawn?.[0] ?? 0, sy: t?.spawn?.[1] ?? 0 })
                }}
              >
                {allTargets.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="t2e-row">
              <Num label="Aparece em X" value={selected.sx} min={0} onChange={(v) => up({ sx: v })} />
              <Num label="Aparece em Y" value={selected.sy} min={0} onChange={(v) => up({ sy: v })} />
            </div>
            <p className="muted t2e-tip">Dica: no mapa de destino, ponha outra porta de volta para cá.</p>
          </>
        )}
        {k === 'npc' && (
          <>
            <label className="t2e-field">
              <span>É um bicho? (Modern Farm)</span>
              <select value={selected.bicho ?? ''} onChange={(e) => up({ bicho: e.target.value || undefined, modo: e.target.value ? 'passeia' : selected.modo })}>
                <option value="">Não, é uma pessoa</option>
                {Object.entries(bichos ?? {}).map(([k, b]) => (
                  <option key={k} value={k}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </label>
            {!selected.bicho && (
              <button type="button" className="t2e-npc-look" onClick={() => setCharEdit(sel.id)}>
                <span>Mudar o visual</span>
              </button>
            )}
            <label className="t2e-field">
              <span>Nome (aparece no balão)</span>
              <input value={selected.nome ?? ''} maxLength={30} placeholder="Seu Zé do quiosque" onChange={(e) => up({ nome: e.target.value })} />
            </label>
            <label className="t2e-field">
              <span>O que fala quando você chega perto</span>
              <textarea rows={3} maxLength={240} value={selected.fala ?? ''} placeholder="Vazio = não fala nada" onChange={(e) => up({ fala: e.target.value })} />
            </label>
            <label className="t2e-field">
              <span>Jeito</span>
              <select value={selected.modo ?? 'parado'} onChange={(e) => up({ modo: e.target.value })}>
                {MODOS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {selected.modo === 'passeia' ? (
              <Num label="Até quantos quadradinhos de distância" value={selected.raio ?? 3} min={1} max={20} onChange={(v) => up({ raio: v })} />
            ) : selected.modo === 'celular' ? null : (
              <label className="t2e-field">
                <span>Virado para</span>
                <select value={selected.dir ?? 'down'} onChange={(e) => up({ dir: e.target.value })}>
                  {(selected.modo === 'senta'
                    ? [
                        ['right', 'Direita'],
                        ['left', 'Esquerda'],
                      ]
                    : [
                        ['down', 'Frente'],
                        ['up', 'Costas'],
                        ['left', 'Esquerda'],
                        ['right', 'Direita'],
                      ]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected.modo === 'senta' && <p className="muted t2e-tip">Ponha em cima de um banco ou cadeira e, em "Onde dá para andar", deixe esse quadradinho livre se quiser.</p>}
          </>
        )}
        {k === 'item' && (
          <>
            {selected.tipo === 'moeda' ? (
              <Num label="Vale quantas moedas" value={selected.valor ?? 1} min={1} max={999} onChange={(v) => up({ valor: v })} />
            ) : (
              <>
                <label className="t2e-field">
                  <span>Nome na mochila</span>
                  <input value={selected.nome ?? ''} maxLength={40} onChange={(e) => up({ nome: e.target.value })} />
                </label>
                <label className="t2e-field">
                  <span>Descrição (opcional)</span>
                  <textarea rows={2} maxLength={160} value={selected.desc ?? ''} onChange={(e) => up({ desc: e.target.value })} />
                </label>
              </>
            )}
            <p className="muted t2e-tip">Cada jogador pega uma vez só. Em "Ajuda" do jogo dá para recomeçar.</p>
          </>
        )}
        {k === 'water' && (
          <>
            <div className="t2e-row">
              <Num label="Largura" value={selected.w} min={1} onChange={(v) => up({ w: v })} />
              <Num label="Altura" value={selected.h} min={1} onChange={(v) => up({ h: v })} />
            </div>
            <label className="t2e-field">
              <span>Tipo</span>
              <select value={selected.kind} onChange={(e) => up({ kind: e.target.value })}>
                <option value="lago">Lago (com margem)</option>
                <option value="mar">Mar (areia em cima)</option>
              </select>
            </label>
          </>
        )}
        <div className="t2e-row t2e-actions">
          <button type="button" onClick={duplicateSel}>
            Duplicar
          </button>
          <button type="button" className="danger" onClick={removeSel}>
            Apagar
          </button>
        </div>
      </section>
    )
  }
  return { propsPanel }
}
