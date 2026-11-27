-- Turma 2.0 · mini RPG: grupos, convites, mural e expedições contra monstros (lutas idle).
-- Tudo que muda passa pelas funções abaixo (security definer); as tabelas só deixam ler.
-- A luta é decidida no banco quando a expedição começa; o resultado só aparece quando o tempo acaba.
-- A cada minuto o pg_cron chama t2_rpg_tick(), que encerra as lutas prontas e avisa o grupo
-- (aviso no sininho + notificação no celular, pelo webhook "push" da tabela notifications).

create table if not exists public.turma2_rpg_grupos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#5eead4',
  dono uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.turma2_rpg_jogadores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  classe text,
  nivel int not null default 1,
  poder int not null default 0,
  grupo_id uuid references public.turma2_rpg_grupos (id) on delete set null,
  mural boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists turma2_rpg_jogadores_grupo on public.turma2_rpg_jogadores (grupo_id);

create table if not exists public.turma2_rpg_convites (
  grupo_id uuid not null references public.turma2_rpg_grupos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  de uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create table if not exists public.turma2_rpg_expedicoes (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.turma2_rpg_grupos (id) on delete cascade,
  monstro_id text not null,
  monstro jsonb not null, -- { nome, nivel, min, poder, minutos, precisa: [tanque|cura], fraco, classes }
  criada_por uuid references public.profiles (id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta', 'lutando', 'fim', 'cancelada')),
  created_at timestamptz not null default now(),
  inicio timestamptz,
  fim timestamptz,
  resultado jsonb, -- { res: vitoria | parcial | derrota, razao, seed }
  avisado boolean not null default false
);
create index if not exists turma2_rpg_exp_grupo on public.turma2_rpg_expedicoes (grupo_id, created_at desc);
create index if not exists turma2_rpg_exp_lutando on public.turma2_rpg_expedicoes (fim) where status = 'lutando';

create table if not exists public.turma2_rpg_exp_membros (
  exp_id uuid not null references public.turma2_rpg_expedicoes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  classe text not null,
  papel text not null default '',
  nivel int not null default 1,
  poder int not null default 0,
  comida text,
  pegou boolean not null default false,
  aceitou timestamptz not null default now(),
  primary key (exp_id, user_id)
);
create index if not exists turma2_rpg_exp_membros_user on public.turma2_rpg_exp_membros (user_id);

alter table public.turma2_rpg_grupos enable row level security;
alter table public.turma2_rpg_jogadores enable row level security;
alter table public.turma2_rpg_convites enable row level security;
alter table public.turma2_rpg_expedicoes enable row level security;
alter table public.turma2_rpg_exp_membros enable row level security;

drop policy if exists "turma lê" on public.turma2_rpg_grupos;
create policy "turma lê" on public.turma2_rpg_grupos for select to authenticated using (true);
drop policy if exists "turma lê" on public.turma2_rpg_jogadores;
create policy "turma lê" on public.turma2_rpg_jogadores for select to authenticated using (true);
drop policy if exists "turma lê" on public.turma2_rpg_convites;
create policy "turma lê" on public.turma2_rpg_convites for select to authenticated using (true);
drop policy if exists "turma lê" on public.turma2_rpg_expedicoes;
create policy "turma lê" on public.turma2_rpg_expedicoes for select to authenticated using (true);
drop policy if exists "turma lê" on public.turma2_rpg_exp_membros;
create policy "turma lê" on public.turma2_rpg_exp_membros for select to authenticated using (true);

-- ------------------------------------------------------------------ ajudantes
create or replace function public._t2_meu_grupo() returns uuid
language sql stable security definer set search_path to 'public' as $$
  select grupo_id from public.turma2_rpg_jogadores where user_id = auth.uid();
$$;

create or replace function public._t2_avisar(p_user uuid, p_title text, p_body text, p_ref text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.notifications (user_id, kind, title, body, link, actor_id, ref_key)
  values (p_user, 'turma2', p_title, p_body, '/turma-2', auth.uid(), p_ref)
  on conflict (user_id, ref_key) do nothing;
end;
$$;

-- ------------------------------------------------------------------ jogador (classe e nível que os outros veem)
create or replace function public.t2_rpg_eu(p_classe text, p_nivel int, p_poder int) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  insert into public.turma2_rpg_jogadores (user_id, classe, nivel, poder, updated_at)
  values (auth.uid(), left(p_classe, 30), greatest(1, least(50, p_nivel)), greatest(0, least(9999, p_poder)), now())
  on conflict (user_id) do update set classe = excluded.classe, nivel = excluded.nivel, poder = excluded.poder, updated_at = now();
end;
$$;

create or replace function public.t2_rpg_mural(p_on boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  update public.turma2_rpg_jogadores set mural = p_on and grupo_id is null where user_id = auth.uid();
end;
$$;

-- ------------------------------------------------------------------ grupos
create or replace function public.t2_rpg_criar_grupo(p_nome text, p_cor text) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare g uuid; v_nome text := nullif(trim(left(coalesce(p_nome, ''), 24)), '');
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if v_nome is null then raise exception 'Dê um nome para o grupo.'; end if;
  if public._t2_meu_grupo() is not null then raise exception 'Você já está num grupo. Saia dele antes.'; end if;
  insert into public.turma2_rpg_grupos (nome, cor, dono) values (v_nome, coalesce(nullif(left(p_cor, 9), ''), '#5eead4'), auth.uid()) returning id into g;
  insert into public.turma2_rpg_jogadores (user_id, grupo_id) values (auth.uid(), g)
  on conflict (user_id) do update set grupo_id = g, mural = false;
  delete from public.turma2_rpg_convites where user_id = auth.uid();
  return g;
end;
$$;

create or replace function public.t2_rpg_convidar(p_user uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare g uuid := public._t2_meu_grupo(); gnome text; meu_nome text;
begin
  if g is null then raise exception 'Você não está num grupo.'; end if;
  if p_user = auth.uid() then return; end if;
  if (select count(*) from public.turma2_rpg_jogadores where grupo_id = g) >= 5 then raise exception 'O grupo já tem 5 pessoas.'; end if;
  if exists (select 1 from public.turma2_rpg_jogadores where user_id = p_user and grupo_id is not null) then raise exception 'Essa pessoa já está num grupo.'; end if;
  insert into public.turma2_rpg_convites (grupo_id, user_id, de) values (g, p_user, auth.uid())
  on conflict (grupo_id, user_id) do update set de = excluded.de, created_at = now();
  select nome into gnome from public.turma2_rpg_grupos where id = g;
  select display_name into meu_nome from public.profiles where id = auth.uid();
  perform public._t2_avisar(p_user, '⚔️ Convite para o grupo ' || gnome,
    coalesce(meu_nome, 'Alguém') || ' te chamou para lutar contra monstros na Turma 2.0.',
    'turma2_convite:' || g || ':' || extract(epoch from now())::bigint);
end;
$$;

create or replace function public.t2_rpg_responder_convite(p_grupo uuid, p_aceita boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from public.turma2_rpg_convites where grupo_id = p_grupo and user_id = auth.uid()) then raise exception 'Esse convite não existe mais.'; end if;
  if not p_aceita then
    delete from public.turma2_rpg_convites where grupo_id = p_grupo and user_id = auth.uid();
    return;
  end if;
  if public._t2_meu_grupo() is not null then raise exception 'Você já está num grupo. Saia dele antes.'; end if;
  if (select count(*) from public.turma2_rpg_jogadores where grupo_id = p_grupo) >= 5 then raise exception 'O grupo já está cheio.'; end if;
  insert into public.turma2_rpg_jogadores (user_id, grupo_id) values (auth.uid(), p_grupo)
  on conflict (user_id) do update set grupo_id = p_grupo, mural = false;
  delete from public.turma2_rpg_convites where user_id = auth.uid();
end;
$$;

create or replace function public.t2_rpg_sair() returns void
language plpgsql security definer set search_path to 'public' as $$
declare g uuid := public._t2_meu_grupo(); outro uuid;
begin
  if g is null then return; end if;
  update public.turma2_rpg_jogadores set grupo_id = null where user_id = auth.uid();
  -- sai das expedições que ainda não começaram
  delete from public.turma2_rpg_exp_membros m using public.turma2_rpg_expedicoes e
   where m.exp_id = e.id and e.grupo_id = g and e.status = 'aberta' and m.user_id = auth.uid();
  select user_id into outro from public.turma2_rpg_jogadores where grupo_id = g order by updated_at limit 1;
  if outro is null then
    -- ninguém sobrou: o grupo some (no t2_rpg_tick, depois que todo mundo pegar as recompensas)
    update public.turma2_rpg_expedicoes set status = 'cancelada' where grupo_id = g and status = 'aberta';
  else
    update public.turma2_rpg_grupos set dono = outro where id = g and dono = auth.uid();
  end if;
end;
$$;

create or replace function public.t2_rpg_editar_grupo(p_nome text, p_cor text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare g uuid := public._t2_meu_grupo(); v_nome text := nullif(trim(left(coalesce(p_nome, ''), 24)), '');
begin
  if g is null then raise exception 'Você não está num grupo.'; end if;
  update public.turma2_rpg_grupos set nome = coalesce(v_nome, turma2_rpg_grupos.nome), cor = coalesce(nullif(left(p_cor, 9), ''), turma2_rpg_grupos.cor) where id = g;
end;
$$;

-- ------------------------------------------------------------------ expedições
create or replace function public.t2_rpg_propor(p_monstro_id text, p_monstro jsonb) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare g uuid := public._t2_meu_grupo(); e uuid;
begin
  if g is null then raise exception 'Entre num grupo primeiro.'; end if;
  if exists (select 1 from public.turma2_rpg_expedicoes where grupo_id = g and status in ('aberta', 'lutando')) then
    raise exception 'O grupo já tem uma expedição aberta ou lutando.';
  end if;
  if p_monstro->>'nivel' = 'chefe' and exists (
    select 1 from public.turma2_rpg_expedicoes where grupo_id = g and monstro->>'nivel' = 'chefe' and status in ('lutando', 'fim') and inicio > now() - interval '7 days'
  ) then raise exception 'O chefe só pode ser enfrentado uma vez por semana.'; end if;
  insert into public.turma2_rpg_expedicoes (grupo_id, monstro_id, monstro, criada_por) values (g, left(p_monstro_id, 30), p_monstro, auth.uid()) returning id into e;
  return e;
end;
$$;

-- decide a luta (chamada quando começa): o poder do grupo contra o do monstro
create or replace function public._t2_resolver(p_exp uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  m jsonb; total numeric; mult numeric := 1; n int; classes int; razao numeric; seed numeric := random();
  tem_tanque boolean; tem_cura boolean; res text; faltou text[] := '{}';
begin
  select monstro into m from public.turma2_rpg_expedicoes where id = p_exp;
  select coalesce(sum(poder), 0), count(*), count(distinct classe),
         bool_or(papel = 'tanque'), bool_or(papel = 'cura')
    into total, n, classes, tem_tanque, tem_cura
    from public.turma2_rpg_exp_membros where exp_id = p_exp;
  -- quem ajuda o grupo todo
  if exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = 'streamer') then mult := mult * 1.12; end if;
  if exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = 'policial') then mult := mult * 1.1; end if;
  if exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = 'programador') then mult := mult * 1.08; end if;
  if exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = 'chef') then mult := mult * 1.08; end if;
  if m->>'fraco' is not null and exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = m->>'fraco') then mult := mult * 1.3; end if;
  -- o que o monstro exige
  if (m->'precisa') ? 'tanque' and not coalesce(tem_tanque, false) then mult := mult * 0.6; faltou := faltou || 'tanque'; end if;
  if (m->'precisa') ? 'cura' and not coalesce(tem_cura, false) then mult := mult * 0.6; faltou := faltou || 'cura'; end if;
  if (m->'precisa') ? 'tanque_ou_cura' and not (coalesce(tem_tanque, false) or coalesce(tem_cura, false)) then mult := mult * 0.6; faltou := faltou || 'tanque_ou_cura'; end if;
  if coalesce((m->>'classes')::int, 0) > classes then mult := mult * 0.6; faltou := faltou || 'classes'; end if;
  razao := total * mult * (0.9 + seed * 0.2) / greatest(1, coalesce((m->>'poder')::numeric, 100));
  res := case when razao >= 1 then 'vitoria' when razao >= 0.6 then 'parcial' else 'derrota' end;
  return jsonb_build_object('res', res, 'razao', round(razao, 3), 'seed', round(seed, 4), 'faltou', to_jsonb(faltou), 'pessoas', n);
end;
$$;

create or replace function public._t2_comecar(p_exp uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
declare m jsonb; minutos numeric;
begin
  select monstro into m from public.turma2_rpg_expedicoes where id = p_exp;
  minutos := greatest(1, coalesce((m->>'minutos')::numeric, 120));
  if exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and classe = 'programador') then minutos := minutos * 0.9; end if;
  update public.turma2_rpg_expedicoes
     set status = 'lutando', inicio = now(), fim = now() + make_interval(secs => round(minutos * 60)), resultado = public._t2_resolver(p_exp)
   where id = p_exp and status = 'aberta';
end;
$$;

create or replace function public.t2_rpg_aceitar(p_exp uuid, p_classe text, p_papel text, p_nivel int, p_poder int, p_comida text) returns text
language plpgsql security definer set search_path to 'public' as $$
declare e record; g uuid := public._t2_meu_grupo(); aceitos int; tamanho int;
begin
  select * into e from public.turma2_rpg_expedicoes where id = p_exp for update;
  if not found or e.status <> 'aberta' then raise exception 'Essa expedição não está mais aberta.'; end if;
  if g is distinct from e.grupo_id then raise exception 'Essa expedição é de outro grupo.'; end if;
  insert into public.turma2_rpg_exp_membros (exp_id, user_id, classe, papel, nivel, poder, comida)
  values (p_exp, auth.uid(), left(p_classe, 30), left(coalesce(p_papel, ''), 20), greatest(1, least(50, p_nivel)), greatest(0, least(9999, p_poder)), left(p_comida, 30))
  on conflict (exp_id, user_id) do nothing;
  select count(*) into aceitos from public.turma2_rpg_exp_membros where exp_id = p_exp;
  select count(*) into tamanho from public.turma2_rpg_jogadores where grupo_id = g;
  -- todo mundo do grupo aceitou (e tem gente suficiente): começa sozinha
  if aceitos >= tamanho and aceitos >= coalesce((e.monstro->>'min')::int, 3) then
    perform public._t2_comecar(p_exp);
    return 'lutando';
  end if;
  return 'aberta';
end;
$$;

-- começar antes de todos aceitarem (precisa do mínimo; o admin pode testar sozinho)
create or replace function public.t2_rpg_comecar(p_exp uuid, p_teste boolean default false) returns void
language plpgsql security definer set search_path to 'public' as $$
declare e record;
begin
  select * into e from public.turma2_rpg_expedicoes where id = p_exp for update;
  if not found or e.status <> 'aberta' then raise exception 'Essa expedição não está mais aberta.'; end if;
  if not exists (select 1 from public.turma2_rpg_exp_membros where exp_id = p_exp and user_id = auth.uid()) then raise exception 'Aceite a expedição antes.'; end if;
  if (select count(*) from public.turma2_rpg_exp_membros where exp_id = p_exp) < coalesce((e.monstro->>'min')::int, 3)
     and not (p_teste and public.is_admin()) then
    raise exception 'Ainda falta gente: precisa de % pessoas.', coalesce((e.monstro->>'min')::int, 3);
  end if;
  perform public._t2_comecar(p_exp);
end;
$$;

create or replace function public.t2_rpg_cancelar(p_exp uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  update public.turma2_rpg_expedicoes set status = 'cancelada'
   where id = p_exp and status = 'aberta' and grupo_id = public._t2_meu_grupo();
end;
$$;

-- teste do admin: termina a luta agora
create or replace function public.t2_rpg_terminar_ja(p_exp uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Só o admin.'; end if;
  update public.turma2_rpg_expedicoes set fim = now() where id = p_exp and status = 'lutando';
  perform public.t2_rpg_tick();
end;
$$;

-- pegar a recompensa (uma vez por pessoa): devolve o resultado para o jogo somar moedas, XP e materiais
create or replace function public.t2_rpg_pegar(p_exp uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare e record; ok int;
begin
  perform public.t2_rpg_tick();
  select * into e from public.turma2_rpg_expedicoes where id = p_exp;
  if not found or e.status <> 'fim' then raise exception 'A luta ainda não terminou.'; end if;
  update public.turma2_rpg_exp_membros set pegou = true where exp_id = p_exp and user_id = auth.uid() and not pegou;
  get diagnostics ok = row_count;
  if ok = 0 then return null; end if;
  return jsonb_build_object('monstro_id', e.monstro_id, 'monstro', e.monstro, 'resultado', e.resultado);
end;
$$;

-- a cada minuto: encerra as lutas que acabaram e avisa quem foi
create or replace function public.t2_rpg_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare e record; mem record; total int := 0; titulo text;
begin
  for e in select * from public.turma2_rpg_expedicoes where status = 'lutando' and fim <= now() for update skip locked loop
    update public.turma2_rpg_expedicoes set status = 'fim', avisado = true where id = e.id;
    titulo := case e.resultado->>'res' when 'vitoria' then '🏆 Vitória contra ' when 'parcial' then '⚔️ Quase! Luta contra ' else '💀 Derrota contra ' end || (e.monstro->>'nome');
    for mem in select user_id from public.turma2_rpg_exp_membros where exp_id = e.id loop
      insert into public.notifications (user_id, kind, title, body, link, ref_key)
      values (mem.user_id, 'turma2', titulo, 'A expedição terminou. Abra o Portal dos Monstros para pegar a recompensa.', '/turma-2', 'turma2_exp:' || e.id)
      on conflict (user_id, ref_key) do nothing;
      total := total + 1;
    end loop;
  end loop;
  -- grupo vazio: some quando não tem mais luta nem recompensa esperando
  delete from public.turma2_rpg_grupos g where not exists (select 1 from public.turma2_rpg_jogadores j where j.grupo_id = g.id)
    and not exists (select 1 from public.turma2_rpg_expedicoes x where x.grupo_id = g.id and (x.status = 'lutando'
      or (x.status = 'fim' and exists (select 1 from public.turma2_rpg_exp_membros m where m.exp_id = x.id and not m.pegou))));
  -- propostas esquecidas (mais de 2 dias abertas) somem
  update public.turma2_rpg_expedicoes set status = 'cancelada' where status = 'aberta' and created_at < now() - interval '2 days';
  return total;
end;
$$;

revoke execute on function public._t2_meu_grupo, public._t2_avisar, public._t2_resolver, public._t2_comecar from public, anon, authenticated;
revoke execute on function public.t2_rpg_tick from public, anon;
grant execute on function public.t2_rpg_eu, public.t2_rpg_mural, public.t2_rpg_criar_grupo, public.t2_rpg_convidar, public.t2_rpg_responder_convite,
  public.t2_rpg_sair, public.t2_rpg_editar_grupo, public.t2_rpg_propor, public.t2_rpg_aceitar, public.t2_rpg_comecar, public.t2_rpg_cancelar,
  public.t2_rpg_terminar_ja, public.t2_rpg_pegar, public.t2_rpg_tick to authenticated;

-- realtime: o Portal atualiza sozinho quando alguém aceita, convida ou a luta acaba
do $$ begin
  begin alter publication supabase_realtime add table public.turma2_rpg_expedicoes; exception when others then null; end;
  begin alter publication supabase_realtime add table public.turma2_rpg_exp_membros; exception when others then null; end;
  begin alter publication supabase_realtime add table public.turma2_rpg_jogadores; exception when others then null; end;
  begin alter publication supabase_realtime add table public.turma2_rpg_convites; exception when others then null; end;
end $$;

select cron.unschedule('turma2-rpg-tick') where exists (select 1 from cron.job where jobname = 'turma2-rpg-tick');
select cron.schedule('turma2-rpg-tick', '* * * * *', 'select public.t2_rpg_tick()');
