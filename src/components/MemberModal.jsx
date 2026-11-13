import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatAge, formatFriendship, formatLiveTime, formatMonthYear } from '../lib/format'
import Avatar from './Avatar'
import { useBackClose } from '../lib/backClose'
import { backdropClose } from '../lib/backdrop'

// Botão pequeno com foto + nome que leva para a janela de outra pessoa da árvore.
function PersonLink({ node, onSelect }) {
  return (
    <button type="button" className="person-link" onClick={() => onSelect(node)}>
      <Avatar name={node.member.display_name} src={node.member.avatar_url} size={24} />
      {node.member.display_name}
    </button>
  )
}

// Janela com os detalhes de uma pessoa (ou só o nome, se ela não usa o app).
export default function MemberModal({ node, isMe, liveSeconds = 0, onClose, onSelect }) {
  const { member, parent, children, isGhost } = node
  const age = formatAge(member.birth_date)

  useBackClose(onClose)

  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const facts = [
    member.favorite_game && { label: 'Jogo favorito', value: member.favorite_game },
    member.favorite_movie && { label: 'Filme favorito', value: member.favorite_movie },
  ].filter(Boolean)

  return (
    <div className="modal-backdrop" {...backdropClose(onClose)}>
      <article
        className="card modal member-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${member.display_name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="member-head">
          <div className="member-photo">
            <Avatar name={member.display_name} src={member.avatar_url} size="fill" />
          </div>
          <div className="member-title">
            <h2 className="turma-name">
              {member.display_name}
              {isMe && <span className="turma-you">você</span>}
            </h2>
            {(age || member.city) && <p className="muted">{[age, member.city].filter(Boolean).join(' · ')}</p>}
            {isGhost && <p className="muted">Não usa o app, só aparece porque chamou alguém da turma.</p>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        {!isGhost && (
          <p className={member.bio ? 'member-bio' : 'member-bio muted'}>
            {member.bio || 'Ainda não escreveu nada sobre si.'}
          </p>
        )}

        <dl className="turma-facts">
          {!isGhost && (
            <div>
              <dt>Amigo há</dt>
              <dd>
                {member.friends_since ? (
                  <>
                    {formatFriendship(member.friends_since)}
                    <small className="muted">desde {formatMonthYear(member.friends_since)}</small>
                  </>
                ) : (
                  <span className="muted">Não informado</span>
                )}
              </dd>
            </div>
          )}

          {!isGhost && (
            <div>
              <dt>Chamado por</dt>
              <dd>{parent ? <PersonLink node={parent} onSelect={onSelect} /> : <span className="muted">Ninguém (começou o grupo)</span>}</dd>
            </div>
          )}

          {children.length > 0 && (
            <div>
              <dt>Chamou</dt>
              <dd className="person-list">
                {children.map((child) => (
                  <PersonLink key={child.id} node={child} onSelect={onSelect} />
                ))}
              </dd>
            </div>
          )}

          {!isGhost && (
            <div>
              <dt>Tempo de live</dt>
              <dd>{liveSeconds > 0 ? formatLiveTime(liveSeconds) : <span className="muted">Nunca transmitiu</span>}</dd>
            </div>
          )}

          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {isMe && (
          <div className="modal-actions">
            <Link to="/perfil" className="btn">
              Editar meu perfil
            </Link>
          </div>
        )}
      </article>
    </div>
  )
}
