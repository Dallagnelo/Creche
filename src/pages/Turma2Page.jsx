import Turma2Game from '../components/turma2/Turma2Game'

// /turma-2: a nova Turma, montada só com os sprites dos pacotes (por enquanto só o admin vê).
// Teste: os mapas ao ar livre (Orla e Acampamento), com um boneco para andar.
export default function Turma2Page() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Turma 2.0</h1>
          <p className="page-sub">Teste: escolha um mapa e saia andando.</p>
        </div>
      </div>
      <Turma2Game />
    </>
  )
}
