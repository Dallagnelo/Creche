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
      { type: 'novo', text: 'Sala da turma renovada.' },
      { type: 'novo', text: 'Sistema para divisão de contas.' },
      { type: 'novo', text: 'Novo sistema para procura de games via API.' },
      { type: 'novo', text: 'Agora é possível fazer votação para filmes.' },
      { type: 'novo', text: 'PopUp avisando novos eventos adicionados.' },
      { type: 'novo', text: 'Sistema de notificações (Precisa ser ativado no cell ou PC separadamente).' },


      { type: 'melhoria', text: 'Melhorias no álbum de fotos.' },
      { type: 'melhoria', text: 'Eventos agora podem ser editados.' },
      { type: 'melhoria', text: 'Feito mudanças na escolha da hora dos eventos.' },
      { type: 'melhoria', text: 'Melhorias gerais no layout mobile, não é a atualização final.' },

      { type: 'correcao', text: 'Corrigido chat da live que estava com problema.' },
      { type: 'correcao', text: 'Corrigido o painel de sugestão, agora é possível editar e apagar.' },
      { type: 'correcao', text: 'Corrigo bug que não deixa o evento sair.' },
      { type: 'correcao', text: 'Corrigo bug de evento na tela principal.' },
      { type: 'correcao', text: 'Corrigo bug no álbum de foto.' },





    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version
