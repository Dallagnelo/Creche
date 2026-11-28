# Como o código do Creche é organizado

Regras para quem mexe no código (pessoa ou IA). Valem para tudo que for criado ou alterado daqui em diante.

## Tamanho dos arquivos
- Um arquivo deve ter **um assunto só**. Mire em até **400 linhas**; passou de **800**, divida antes de crescer mais.
- Ao mexer num arquivo que já passou de 800 linhas, aproveite e tire dele a parte que você está mexendo.
- Exceção: arquivos de dados (listas de sprites, JSON, catálogos) podem ser grandes.

## Onde fica cada coisa
- `src/pages/`: uma página por rota. A página só monta a tela; a lógica fica nos componentes, hooks e serviços.
- `src/components/`: componentes. Um componente grande ganha **uma pasta própria** com as partes dele:
  - `components/room/`: a sala da Turma (`RoomScene.jsx` + barra, painel, chat, desenho, ações, controles, cinema).
  - `components/turma2/game/`: o motor do jogo Turma 2.0 (`useGameEngine`, `drawFrame`, atividades, cinema).
  - `components/turma2/editor/`: o editor de mapas (desenho, mouse, teclado, painel da direita, formulários).
  - `components/turma2/hud/`: peças da interface do jogo (botões, barras, ficha, habilidades).
- `src/services/`: tudo que fala com o Supabase ou com APIs de fora. Componentes não chamam o Supabase direto.
- `src/lib/`: funções puras e dados (sem React). Se crescer, vira pasta (ex.: `lib/avatar/` com cabelo, rosto, roupa).
- `src/hooks/`: hooks usados por mais de uma tela.
- `src/styles/`: CSS. `global.css` e `polish.css` só listam as partes (`styles/global/`, `styles/polish/`).

## Como dividir um componente grande
- **Pedaço da tela (JSX)** → componente próprio no mesmo diretório, recebendo props (ex.: `RoomBar`, `RoomPanel`).
- **Lógica com estado/efeitos** → hook `useAlgo.js` (ex.: `useRoomControls`, `useEditorPointer`). Chame o hook
  no mesmo lugar onde o código estava, para não mudar a ordem dos hooks.
- **Código sem React** (contas, desenho no canvas) → módulo `.js` com funções (ex.: `roomHelpers.js`, `drawFrame.js`).
- Loop de jogo/canvas: o desenho recebe o que precisa a cada quadro (`drawFrame({ ... })`) em vez de ler variáveis soltas.
- Nomes: componentes em `PascalCase.jsx`, hooks em `useAlgo.js`, resto em `camelCase.js`.
- Comentários e textos em português, explicando o porquê.

## CSS
- A ordem dos arquivos em `global.css` e `polish.css` é a ordem em que as regras valem: **não reordene**.
- Estilo de tela nova vai num arquivo novo do assunto (ex.: `styles/global/12-nova-tela.css`), no fim da lista.
- Toda tela nova funciona no celular (até 900px): botões com 44px ou mais, nada cortado, janelas em tela cheia até 700px.

## Antes de enviar
- `npm run build` sem erro e teste da tela mexida no navegador (PC e celular).
- Um commit por pedido, direto na `main`, com título curto em português.
- Segredos nunca no código (ver README). Packs LimeZu: não redistribuir, manter os créditos em Configurações.
