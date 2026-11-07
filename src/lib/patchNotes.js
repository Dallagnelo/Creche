// Patch notes: tudo que foi melhorado no sistema. A versão mais nova vem primeiro.
// type: 'novo' (recurso novo) | 'melhoria' (já existia e ficou melhor) | 'correcao' (problema resolvido)

export const PATCH_NOTES = [
  {
    version: '1.5',
    date: '7 de novembro de 2026',
    title: 'Ao vivo, notas de filme e início renovado',
    changes: [
      { type: 'novo', text: 'Sugestão de melhorias e ferramentas novas' },
      { type: 'novo', text: 'Barra de pesquisa de filmes e jogos já postado' },
      { type: 'novo', text: 'Ao vivo: agora dá para transmitir uma aba, o Discord não vaza. A qualidade se ajusta sozinha.' },
      { type: 'novo', text: 'Aviso "AO VIVO" na página inicial e um ponto vermelho no menu quando alguém está transmitindo.' },
      { type: 'novo', text: 'Notas de filmes de 0 até 5 agora podem ser feitas' },
      { type: 'novo', text: 'Para dar a nota, é só segurar e arrastar sobre as estrelas, sem precisar ir clicando.' },
      { type: 'novo', text: 'Eventos podem ter endereço: basta por sua rua e numero de casa que vai aparecer um mapinha depois.' },
      { type: 'novo', text: 'Clicar num evento na página inicial abre uma janela com todos os detalhes e a lista de quem vai.' },
    ],
  },
  {
    version: '1.4',
    title: 'Eventos, janelas e jogos',
    changes: [
      { type: 'novo', text: 'Página de Eventos renovada, com dois jeitos de ver: calendário (padrão) ou cards. A escolha fica em Configurações.' },
      { type: 'novo', text: 'O calendário mostra o próximo evento quando você clica num dia sem nada marcado.' },
      { type: 'novo', text: 'Quem postou um jogo agora também pode editá-lo.' },
      { type: 'novo', text: 'Adicionar evento, filme, jogo e foto abre numa janela por cima da página. Em Configurações dá para voltar ao formulário ao lado, como antes.' },
      { type: 'melhoria', text: 'O calendário agora começa a semana na segunda-feira, e o número do dia fica centralizado no quadrado.' },
      { type: 'melhoria', text: 'Os pôsteres de filmes ficaram maiores na página de Filmes.' },
      { type: 'melhoria', text: 'Os nomes dos jogos na página inicial ficaram mais legíveis, com letras maiores.' },
    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version
