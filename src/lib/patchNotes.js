// Patch notes: tudo que mudou no sistema. A versão mais nova vem primeiro.
//
// COMO EDITAR
// - Para uma versão nova, copie o bloco abaixo e cole ACIMA dele (a mais nova fica no topo).
// - type: 'novo' (coisa nova) | 'melhoria' (já existia e ficou melhor) | 'correcao' (problema resolvido)
// - Cada item de `changes` é uma linha da lista.

export const PATCH_NOTES = [
  {
    version: '1.0',
    date: '1 de janeiro de 2026',
    title: 'Tudo que há de novo scooby doo !',
    changes: [
           // { type: 'novo', text: 'Exemplo de uma coisa nova. Troque este texto pelo seu.' },
      { type: 'novo', text: 'Agora podemos adicionar fotos nos jogos.' },
      { type: 'novo', text: 'Novo método de carregamento de dados para melhorar desempenho do site.' },
      { type: 'novo', text: 'Agora é possível criar album de foto onde pode ser colocados várias fotos por multiplas pessoas.' },
      { type: 'melhoria', text: 'Melhorias no albúm de fotos.' },
      { type: 'melhoria', text: 'Melhorias no seletor de jogos de filmes.' },
      { type: 'melhoria', text: 'Eventos agora podem ser editados.' },
      { type: 'melhoria', text: 'Feito mudanças na escolha da hora dos eventos.' },
      { type: 'melhoria', text: 'Melhorias gerais no layout mobile, não é a atualização final.' },
      { type: 'correcao', text: 'Corrigido chat da live que estava com problema.' },
      { type: 'correcao', text: 'Corrigido o painel de sugestão, agora é possível editar e apagar.' },


    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version
