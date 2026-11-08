// Patch notes: tudo que mudou no sistema. A versão mais nova vem primeiro.
// type: 'novo' (coisa nova) | 'melhoria' (já existia e ficou melhor) | 'correcao' (problema que foi resolvido)

export const PATCH_NOTES = [
  {
    version: '1.5',
    date: '7 de novembro de 2026',
    title: 'Ao vivo, nota pros jogos e a pagina principal renovada',
    changes: [
      { type: 'novo', text: 'Os jogos agora têm nota, igual os filmes. De 0 a 5.' },
      { type: 'novo', text: 'Ao vivo: dá pra transmitir uma aba, uma janela ou a tela toda e a turma assiste junto.' },
      { type: 'novo', text: 'Quando alguém tá ao vivo aparece um aviso na página inicial e um pontinho vermelho no menu.' },
      { type: 'novo', text: 'Os filmes aceitam nota de meia estrela (0,5, 1,5 e por aí vai) e também nota zero.' },
      { type: 'novo', text: 'Pra dar a nota é só segurar e arrastar nas estrelas, não precisa ficar clicando.' },
      { type: 'novo', text: 'Ao cadastrar um jogo, a plataforma agora é uma lista. Quem postou o jogo pode trocar depois, editando.' },
      { type: 'novo', text: 'Os eventos podem ter endereço. Escreve a rua e o número e aparece um mapa do Google.' },
      { type: 'novo', text: 'Clicou num evento na página inicial, abre uma janela com tudo sobre ele e quem vai.' },
      { type: 'novo', text: 'Filmes e Jogos têm barra de pesquisa. Acha por nome, ano ou plataforma, e nem precisa lembrar do acento.' },
      { type: 'novo', text: 'Em Configurações tem um espaço de sugestões. Qualquer um da turma manda ideia de melhoria ou de ferramenta nova, e todo mundo vê a lista.' },
      { type: 'novo', text: 'Esta página de patch notes. O botão fica em Configurações.' },
      { type: 'melhoria', text: 'O mural de jogos da página inicial agora mostra os melhores, os de maior nota, em vez dos últimos postados. Se tiver pouco jogo avaliado, os mais novos completam o resto.' },
      { type: 'melhoria', text: 'O botão de dar nota no jogo ficou menor e foi pra linha das estrelas, não ficava proporcional antes.' },
      { type: 'melhoria', text: 'O tema virou um botão claro/escuro. A opção de tamanho do texto saiu.' },
      { type: 'melhoria', text: 'Os rankings "Quem mais postou" e "Por plataforma" ficam escondidos. Quem quiser liga em Configurações.' },
      { type: 'melhoria', text: 'A página inicial mostra os 2 próximos eventos do lado do mural. Sem evento marcado, o mural ocupa a linha toda.' },
      { type: 'melhoria', text: 'Os cards de evento foram arrumados, agora tudo fica dentro do card.' },
      { type: 'melhoria', text: 'Nos filmes, trailer e elenco só aparecem se você clicar em "Ver trailer e elenco". Quando abre o filme fica só a foto, a descrição e os comentários.' },
      { type: 'correcao', text: 'O grid da página inicial estava quebrado e bagunçado.' },
      { type: 'correcao', text: 'A capa dos jogos aparecia esticada na página inicial quando o jogo não tinha imagem. Resolvido.' },
    ],
  },
  {
    version: '1.4',
    title: 'Eventos, janelas e jogos',
    changes: [
      { type: 'novo', text: 'A página de Eventos mudou. Dá pra ver em calendário (o padrão) ou em cards, e a escolha fica salva em Configurações.' },
      { type: 'novo', text: 'No calendário, clicar num dia vazio mostra qual é o próximo evento.' },
      { type: 'novo', text: 'Quem postou um jogo agora pode editar ele depois.' },
      { type: 'novo', text: 'Adicionar evento, filme, jogo ou foto abre numa janela em cima da página. Se preferir o formulário do lado, como era antes, dá pra voltar em Configurações.' },
      { type: 'melhoria', text: 'O calendário começa a semana na segunda e o número do dia ficou centralizado no quadradinho.' },
      { type: 'melhoria', text: 'Os pôsteres na página de Filmes ficaram maiores.' },
      { type: 'melhoria', text: 'Os nomes dos jogos na página inicial ficaram maiores, mais fáceis de ler.' },
    ],
  },
]

export const LATEST_VERSION = PATCH_NOTES[0].version
