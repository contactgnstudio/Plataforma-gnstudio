-- ============================================================
-- GN Studio OS — Tabla: time_entries
-- Ejecutar en Supabase SQL Editor
-- ============================================================

create table if not exists public.time_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  tarea_id     uuid not null references public.tareas(id) on delete cascade,
  inicio       timestamptz not null,
  fin          timestamptz not null,
  segundos     integer not null check (segundos > 0),
  descripcion  text default '',
  manual       boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Índices para consultas frecuentes
create index if not exists idx_time_entries_proyecto on public.time_entries(proyecto_id);
create index if not exists idx_time_entries_tarea    on public.time_entries(tarea_id);
create index if not exists idx_time_entries_user     on public.time_entries(user_id);

-- RLS: solo el dueño puede ver/modificar sus entradas
alter table public.time_entries enable row level security;

create policy "Usuarios ven sus propias entradas"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propias entradas"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "Usuarios eliminan sus propias entradas"
  on public.time_entries for delete
  using (auth.uid() = user_id);

create policy "Usuarios actualizan sus propias entradas"
  on public.time_entries for update
  using (auth.uid() = user_id);
