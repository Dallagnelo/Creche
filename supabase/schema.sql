-- =====================================================================
-- Memórias da Turma - esquema do banco (PostgreSQL / Supabase)
--
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- O script pode ser executado mais de uma vez sem quebrar.
--
-- Conceitos que você vai ver aqui:
--   * Tabelas e chaves estrangeiras (relacionamentos)
--   * RLS (Row Level Security): regras de quem pode ler/escrever cada linha
--   * Trigger: código que roda sozinho quando algo acontece no banco
--   * Storage: bucket privado para as fotos
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PERFIS
-- O Supabase guarda email/senha em auth.users (tabela interna, protegida).
-- Para mostrar nome e avatar no app, criamos a nossa tabela "profiles",
-- ligada 1 para 1 com o usuário.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Trigger: sempre que um usuário é criado, cria o perfil dele automaticamente.
-- O nome vem do metadado "display_name" (se você informar ao criar o usuário)
-- ou, na falta dele, da parte do email antes do "@".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- roda com permissão do dono da função, ignorando RLS
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cria perfis para usuários que já existiam antes de rodar este script.
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2. POSTS (mural de fotos)
-- Guardamos só o CAMINHO da imagem no Storage, não a imagem em si.
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  image_path text not null,
  caption    text,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);


-- ---------------------------------------------------------------------
-- 3. FILMES e AVALIAÇÕES
-- "movies" guarda cada filme uma única vez (tmdb_id é único).
-- "ratings" guarda a nota de CADA pessoa para cada filme.
-- ---------------------------------------------------------------------
create table if not exists public.movies (
  id           uuid primary key default gen_random_uuid(),
  tmdb_id      integer not null unique,
  imdb_id      text,
  title        text not null,
  poster_path  text,
  release_year integer,
  overview     text,
  added_by     uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  movie_id   uuid not null references public.movies (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  score      smallint not null check (score between 1 and 5),
  comment    text,
  watched_at date,
  created_at timestamptz not null default now(),
  unique (movie_id, user_id)   -- cada pessoa avalia um filme apenas uma vez
);

create index if not exists ratings_movie_id_idx on public.ratings (movie_id);


-- ---------------------------------------------------------------------
-- 4. JOGOS
-- ---------------------------------------------------------------------
create table if not exists public.games (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  platform   text,
  notes      text,
  cover_path text,
  added_by   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. RLS - SEGURANÇA POR LINHA
-- Sem RLS, qualquer pessoa com a chave pública (anon key) leria e alteraria
-- tudo. Com RLS ligado, NADA é permitido até existir uma policy liberando.
--
-- Regra geral deste app:
--   * Quem está logado (authenticated) pode LER tudo.
--   * Só o dono pode criar/editar/apagar o que é dele.
-- "(select auth.uid())" é o id do usuário logado.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.movies   enable row level security;
alter table public.ratings  enable row level security;
alter table public.games    enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- posts
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select to authenticated using (true);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

-- movies (ninguém edita um filme depois de criado; só inserir e ler)
drop policy if exists "movies_select" on public.movies;
create policy "movies_select" on public.movies
  for select to authenticated using (true);

drop policy if exists "movies_insert_own" on public.movies;
create policy "movies_insert_own" on public.movies
  for insert to authenticated with check (added_by = (select auth.uid()));

-- ratings
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings
  for select to authenticated using (true);

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own" on public.ratings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own" on public.ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own" on public.ratings
  for delete to authenticated using (user_id = (select auth.uid()));

-- games
drop policy if exists "games_select" on public.games;
create policy "games_select" on public.games
  for select to authenticated using (true);

drop policy if exists "games_insert_own" on public.games;
create policy "games_insert_own" on public.games
  for insert to authenticated with check (added_by = (select auth.uid()));

drop policy if exists "games_update_own" on public.games;
create policy "games_update_own" on public.games
  for update to authenticated
  using (added_by = (select auth.uid()))
  with check (added_by = (select auth.uid()));

drop policy if exists "games_delete_own" on public.games;
create policy "games_delete_own" on public.games
  for delete to authenticated using (added_by = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 6. STORAGE - bucket privado "photos"
-- Privado = as imagens só abrem com uma URL assinada (temporária), que o app
-- pede ao Supabase para quem está logado. Ninguém de fora acessa.
-- Organização dos arquivos: <id-do-usuario>/<pasta>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "photos_select" on storage.objects;
create policy "photos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

-- Só pode enviar para a própria pasta (primeiro nível = seu user id).
drop policy if exists "photos_insert_own_folder" on storage.objects;
create policy "photos_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "photos_delete_own_folder" on storage.objects;
create policy "photos_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
