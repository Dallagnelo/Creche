// Patch notes: tudo que foi melhorado no sistema. A versão mais nova vem primeiro.
// type: 'novo' (recurso novo) | 'melhoria' (já existia e ficou melhor) | 'correcao' (problema resolvido)

export const PATCH_NOTES = [
  {
    version: '1.5',
    date: '7 de novembro de 2026',
    title: 'Ao vivo, notas de filme e início renovado',
    changes: [
      { type: 'novo', text: 'Na transmissão, dá para escolher o que transmitir: só uma aba ou janela (o Discord não vaza) ou a tela inteira com o som do sistema.' },
      { type: 'novo', text: 'Aviso "AO VIVO" na página inicial e um ponto vermelho no menu quando alguém está transmitindo.' },
      { type: 'novo', text: 'Notas de filme de que vai de 0 a 5.' },
      { type: 'novo', text: 'Para dar a nota, é só segurar e arrastar sobre as estrelas, sem precisar ir clicando.' },
      { type: 'novo', text: 'Eventos podem ter endereço: se colocar o nome da rua e numero vai mostrar um mapinha.' },
      { type: 'novo', text: 'Clicar num evento na página inicial abre uma janela com todos os detalhes e a lista de quem vai.' },
      { type: 'melhoria', text: 'A página inicial mostra os 2 próximos eventos ao lado do mural.' },
      { type: 'melhoria', text: 'Nos filmes, o trailer e o elenco só aparecem quando você pede, pelo botão "Ver trailer e elenco".' },
    ],
  },
  {
    version: '1.4',
    title: 'Eventos, janelas e jogos',
    changes: [
      { type: 'novo', text: 'Página de Eventos renovada, com dois jeitos de ver: calendário (padrão) ou cards. A escolha fica em Configurações.' },
      { type: 'novo', text: 'O calendário mostra o próximo evento quando você clica num dia sem nada marcado.' },
      { type: 'novo', text: 'Quem postou um jogo agora também pode editá-lo.' },
      { type: 'novo', text: 'Adicionar evento, filme, jogo e foto abre numa janela por cima da página. Em Configurações (FEITA PARA O YURI) dá para voltar ao formulário ao lado, como antes.' },
      { type: 'melhoria', text: 'O calendário agora tem o número do dia centralizado no quadrado.' },
      { type: 'melhoria', text: 'Os pôsteres de filmes ficaram maiores na página de Filmes.' },
      { type: 'melhoria', text: 'Os nomes dos jogos na página inicial ficaram mais legíveis.' },
    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version
