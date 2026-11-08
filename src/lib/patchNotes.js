// Patch notes: tudo que foi melhorado no sistema. A versão mais nova vem primeiro.
// type: 'novo' (recurso novo) | 'melhoria' (já existia e ficou melhor) | 'correcao' (problema resolvido)

export const PATCH_NOTES = [
  {
    version: '1.5',
    date: '7 de novembro de 2026',
    title: 'Ao vivo, notas de filme e início renovado',
    changes: [
      { type: 'novo', text: 'Ao vivo: agora dá para transmitir uma aba, uma janela ou a tela inteira para a turma assistir junto (até 10 pessoas, sem precisar de nenhum outro programa). A qualidade se ajusta sozinha.' },
      { type: 'novo', text: 'Na transmissão, dá para escolher o que transmitir: só uma aba ou janela (o Discord não vaza) ou a tela inteira com o som do sistema.' },
      { type: 'novo', text: 'Aviso "AO VIVO" na página inicial e um ponto vermelho no menu quando alguém está transmitindo.' },
      { type: 'novo', text: 'Notas de filme de meia em meia estrela (0,5, 1, 1,5...) e também nota zero.' },
      { type: 'novo', text: 'Para dar a nota, é só segurar e arrastar sobre as estrelas, sem precisar ir clicando.' },
      { type: 'novo', text: 'Jogos agora também podem ser avaliados, igual aos filmes: nota de 0 a 5 (meia em meia estrela), comentário opcional, média no card e as notas de cada pessoa na janela do jogo.' },
      { type: 'novo', text: 'Eventos podem ter endereço: a janela do evento mostra o mapa do Google, com os botões "Abrir no Google Maps" e "Como chegar".' },
      { type: 'novo', text: 'Clicar num evento na página inicial abre uma janela com todos os detalhes e a lista de quem vai.' },
      { type: 'novo', text: 'Barra de pesquisa nas páginas de Filmes e Jogos para achar rápido o que já foi cadastrado (por nome, ano ou plataforma; não precisa de acento).' },
      { type: 'novo', text: 'Sugestões: em Configurações, qualquer pessoa da turma pode mandar ideias de melhorias ou de ferramentas novas, e todo mundo vê a lista.' },
      { type: 'novo', text: 'Patch notes: esta página, com tudo que mudou no sistema (botão em Configurações).' },
      { type: 'melhoria', text: 'A página inicial mostra os 2 próximos eventos ao lado do mural, com o grid todo alinhado. Sem eventos marcados, o mural ocupa a linha inteira.' },
      { type: 'melhoria', text: 'Nos filmes, o trailer e o elenco só aparecem quando você pede, pelo botão "Ver trailer e elenco". Ao abrir, ficam a foto, a descrição e os comentários.' },
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
