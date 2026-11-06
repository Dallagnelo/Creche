# Memórias da Turma

Espaço privado do grupo de amigos para guardar fotos, filmes assistidos (com notas) e jogos. Feito para estudar: o código é comentado em português e organizado em camadas.

**Stack:** React 18 + Vite · React Router · Supabase (Auth, PostgreSQL, Storage) · API do TMDB

## Funcionalidades

- **Login** por email e senha. Só entra quem você cadastrar.
- **Mural**: posts com foto e legenda. Fotos ficam em bucket privado.
- **Filmes**: busca no TMDB, nota de 1 a 5 por pessoa, comentário e data em que assistiram. Mostra a média do grupo e o link para o IMDb.
- **Jogos**: lista do que vocês jogam, com plataforma, anotações e capa.

## Como rodar (passo a passo)

### 1. Instalar

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie uma conta e um projeto em <https://supabase.com>.
2. Abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**. Isso cria tabelas, regras de segurança (RLS) e o bucket `photos`.
3. Em **Authentication > Providers > Email**, desative **Allow new users to sign up**. Assim ninguém de fora cria conta.
4. Em **Authentication > Users > Add user**, crie a conta de cada amigo (email + senha). Para definir o nome exibido, use o campo de metadata `{"display_name": "Vitor"}`. Sem isso, o nome vira a parte do email antes do `@`.

### 3. Pegar a chave do TMDB

Crie uma conta em <https://www.themoviedb.org>, vá em **Settings > API** e copie a **API Key (v3 auth)**.

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Supabase: **Project Settings > API**) e `VITE_TMDB_API_KEY`.

### 5. Rodar

```bash
npm run dev
```

Abra o endereço que aparecer (normalmente <http://localhost:5173>).

## Estrutura de pastas

```
supabase/schema.sql      Banco inteiro: tabelas, RLS, trigger, bucket
src/
  main.jsx               Ponto de entrada: monta o React
  App.jsx                Mapa de rotas (qual URL abre qual página)
  lib/                   Configuração de clientes externos (Supabase, TMDB) e utilitários
  contexts/              Estado global (AuthContext: quem está logado)
  services/              Funções que conversam com o Supabase (posts, filmes, jogos, imagens)
  hooks/                 Hooks reutilizáveis (useAsyncData: carregar dados com loading/erro)
  components/            Peças de interface reutilizáveis
  pages/                 Uma página por rota (Feed, Filmes, Jogos, Login)
  styles/global.css      Estilos
```

### A ideia central: camadas

```
Página  ->  Service  ->  Supabase / TMDB
```

As páginas e componentes nunca chamam o Supabase diretamente; eles chamam funções dos `services/`. Se amanhã você trocar de banco, só mexe nos services.

## Roteiro de estudo (ordem sugerida de leitura)

1. `src/main.jsx` e `src/App.jsx`: como o app inicia e como as rotas funcionam.
2. `src/contexts/AuthContext.jsx` e `src/components/ProtectedRoute.jsx`: login e proteção de páginas (Context, `useEffect`).
3. `supabase/schema.sql`: relacionamentos entre tabelas, RLS e trigger.
4. `src/services/storage.js` e `src/services/posts.js`: upload e URLs assinadas.
5. `src/pages/FeedPage.jsx`, `PostForm.jsx`, `PostCard.jsx`: um fluxo completo (formulário, salvar, listar).
6. `src/lib/tmdb.js`, `MovieSearch.jsx`, `RatingModal.jsx`, `services/movies.js`: consumir uma API externa e salvar dados relacionados (`upsert`).
7. `src/hooks/useAsyncData.js`: criar seu próprio hook.

## Exercícios para evoluir

- Permitir **editar e apagar** posts e jogos pela interface.
- Adicionar **comentários e reações** nos posts (nova tabela + RLS).
- Criar uma página de **perfil** com troca de avatar.
- Mostrar **elenco e trailer** do filme (endpoint `/movie/{id}/credits` e `/videos` do TMDB).
- Migrar o projeto para **TypeScript**.
- Adicionar **paginação** ou rolagem infinita no mural.
- Um **chat em tempo real** com Supabase Realtime.

## Segurança: o que saber

- A `anon key` do Supabase pode ficar no navegador. Quem protege os dados é o **RLS** do banco (veja `schema.sql`). Nunca use a `service_role key` no frontend.
- A chave do TMDB (v3) vai para o navegador por ser um app 100% frontend. Para um grupo pequeno e uso pessoal é aceitável. Em um app maior, você criaria um backend (ou uma Edge Function do Supabase) para esconder a chave.
- Nunca suba o arquivo `.env` para o GitHub. Ele já está no `.gitignore`.

## Publicar (deploy)

1. Suba o código para um repositório no GitHub.
2. Na Vercel (<https://vercel.com>), importe o repositório.
3. Em **Settings > Environment Variables**, cadastre as três variáveis do `.env`.
4. Faça o deploy. O `vercel.json` já cuida das rotas do React Router.
5. No Supabase, em **Authentication > URL Configuration**, coloque a URL da Vercel em **Site URL**.

## Scripts

| Comando           | O que faz                          |
|-------------------|------------------------------------|
| `npm run dev`     | Servidor de desenvolvimento        |
| `npm run build`   | Gera a versão final em `dist/`     |
| `npm run preview` | Testa localmente a versão de build |

Os filmes usam dados do [TMDB](https://www.themoviedb.org). Este produto usa a API do TMDB mas não é endossado nem certificado por eles.


Resolver bug do click na imagem na home page
