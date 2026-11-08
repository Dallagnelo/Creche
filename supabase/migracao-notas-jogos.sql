-- =====================================================================
-- Notas nos jogos (de 0 a 5, de meia em meia estrela)
--
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- Pode rodar mais de uma vez sem quebrar.
--
-- Igual às notas dos filmes: cada pessoa dá UMA nota por jogo (pode
-- editar depois) e só mexe na própria nota.
-- =====================================================================

create table if not exists public.game_ratings (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  score      numeric(2,1) not null
             check (score >= 0 and score <= 5 and (score * 2) = floor(score * 2)),
  comment    text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists game_ratings_game_idx on public.game_ratings (game_id);

alter table public.game_ratings enable row level security;

drop policy if exists "game_ratings_select" on public.game_ratings;
create policy "game_ratings_select" on public.game_ratings
  for select to authenticated using (true);

drop policy if exists "game_ratings_insert_own" on public.game_ratings;
create policy "game_ratings_insert_own" on public.game_ratings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "game_ratings_update_own" on public.game_ratings;
create policy "game_ratings_update_own" on public.game_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "game_ratings_delete_own" on public.game_ratings;
create policy "game_ratings_delete_own" on public.game_ratings
  for delete to authenticated using (user_id = (select auth.uid()));
