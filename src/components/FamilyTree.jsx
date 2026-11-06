import Avatar from './Avatar'

// Um cartão da árvore: foto e nome. Clicar abre os detalhes da pessoa.
function TreeNode({ node, isMe, onSelect }) {
  const name = node.member.display_name
  const className = ['tree-node', isMe && 'is-me', node.isGhost && 'is-ghost'].filter(Boolean).join(' ')

  return (
    <button type="button" className={className} onClick={() => onSelect(node)} aria-label={`Ver detalhes de ${name}`}>
      <span className="tree-photo">
        <Avatar name={name} src={node.member.avatar_url} size="fill" />
      </span>
      <span className="tree-name">{name}</span>
      {isMe && <small className="tree-tag">você</small>}
      {node.isGhost && <small className="tree-tag tree-tag-ghost">fora do app</small>}
    </button>
  )
}

// Um nível da árvore. Chama a si mesmo para desenhar os filhos (recursão).
function Branch({ nodes, meId, onSelect, root = false }) {
  return (
    <ul className={root ? 'tree-branch tree-roots' : 'tree-branch'}>
      {nodes.map((node) => (
        <li key={node.id} className="tree-item">
          <TreeNode node={node} isMe={node.id === meId} onSelect={onSelect} />
          {node.children.length > 0 && <Branch nodes={node.children} meId={meId} onSelect={onSelect} />}
        </li>
      ))}
    </ul>
  )
}

export default function FamilyTree({ roots, meId, onSelect }) {
  return (
    <div className="tree-scroll">
      <div className="tree">
        <Branch nodes={roots} meId={meId} onSelect={onSelect} root />
      </div>
    </div>
  )
}
