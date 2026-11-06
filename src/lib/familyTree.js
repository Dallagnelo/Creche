// Monta a árvore "quem chamou quem" a partir da lista de perfis.
//
// Cada pessoa vira um NÓ: { id, member, parent, children, isGhost }.
//  * invited_by          -> o pai é outro perfil do app.
//  * invited_by_name     -> quem chamou NÃO usa o app. Criamos um nó "fantasma" só com o nome
//                           (se o nome for igual ao de alguém do app, ligamos nele).
//  * sem nenhum dos dois -> a pessoa é uma raiz (topo da árvore).

// Mais antigos primeiro; quem não preencheu "amigo desde" vai para o fim.
function byFriendship(a, b) {
  const x = a.member.friends_since
  const y = b.member.friends_since
  if (x && y) return x.localeCompare(y) || a.member.display_name.localeCompare(b.member.display_name)
  if (x) return -1
  if (y) return 1
  return a.member.display_name.localeCompare(b.member.display_name)
}

// Fantasmas primeiro (quem chamou os primeiros costuma ser mais antigo), depois por data.
function byOrder(a, b) {
  if (a.isGhost !== b.isGhost) return a.isGhost ? -1 : 1
  return byFriendship(a, b)
}

const normalize = (text) => text.trim().toLowerCase()

export function buildFamilyTree(profiles) {
  const nodes = new Map()
  for (const profile of profiles) {
    nodes.set(profile.id, { id: profile.id, member: profile, parent: null, children: [], isGhost: false })
  }

  const byName = new Map()
  for (const node of nodes.values()) {
    const key = normalize(node.member.display_name)
    if (!byName.has(key)) byName.set(key, node)
  }

  // 1) Descobre o pai de cada pessoa.
  const ghosts = new Map()
  for (const node of [...nodes.values()]) {
    const { invited_by: invitedBy, invited_by_name: invitedByName } = node.member

    if (invitedBy && nodes.has(invitedBy)) {
      node.parent = nodes.get(invitedBy)
    } else if (invitedByName?.trim()) {
      const key = normalize(invitedByName)
      let parent = byName.get(key)
      if (!parent) {
        if (!ghosts.has(key)) {
          ghosts.set(key, {
            id: `ghost:${key}`,
            member: { display_name: invitedByName.trim() },
            parent: null,
            children: [],
            isGhost: true,
          })
        }
        parent = ghosts.get(key)
      }
      if (parent !== node) node.parent = parent
    }
  }

  const all = [...nodes.values(), ...ghosts.values()].sort(byOrder)

  // 2) Quebra ciclos (A chamou B e B chamou A): sem isso ninguém seria raiz e todos sumiriam.
  for (const node of all) {
    const seen = new Set()
    let current = node
    while (current?.parent) {
      if (seen.has(current.id)) {
        current.parent = null
        break
      }
      seen.add(current.id)
      current = current.parent
    }
  }

  // 3) Liga filhos aos pais (já na ordem certa) e separa as raízes.
  const roots = []
  for (const node of all) {
    if (node.parent) node.parent.children.push(node)
    else roots.push(node)
  }

  return { roots, nodes: all }
}
