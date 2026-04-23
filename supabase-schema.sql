-- Aura Design Supabase schema
-- Run the full file in Supabase SQL Editor once.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  category text not null default 'branding',
  client_name text,
  description text not null default 'Shared via Aura Design.',
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  storage_path text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_changes')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.projects
alter column description set default 'Shared via Aura Design.';

update public.projects
set description = 'Shared via Aura Design.'
where description is null or char_length(trim(description)) = 0;

alter table public.projects
alter column description set not null;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('annotation', 'decision')),
  x_percent numeric(5,2),
  y_percent numeric(5,2),
  comment text,
  value text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint feedback_annotation_position check (
    type <> 'annotation'
    or (
      x_percent is not null
      and y_percent is not null
      and x_percent between 0 and 100
      and y_percent between 0 and 100
    )
  ),
  constraint feedback_annotation_comment check (
    type <> 'annotation'
    or coalesce(char_length(trim(comment)), 0) > 0
  ),
  constraint feedback_decision_value check (
    type <> 'decision'
    or value in ('approved', 'needs_changes')
  )
);

create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists feedback_project_created_at_idx on public.feedback (project_id, created_at desc);
create unique index if not exists feedback_one_decision_per_project_idx
on public.feedback (project_id)
where type = 'decision';

alter table public.projects enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "public read projects" on public.projects;
drop policy if exists "public insert projects" on public.projects;
drop policy if exists "public update projects" on public.projects;
drop policy if exists "public delete projects" on public.projects;
drop policy if exists "public read feedback" on public.feedback;
drop policy if exists "public insert feedback" on public.feedback;
drop policy if exists "public delete feedback" on public.feedback;

create policy "public read projects"
on public.projects
for select
using (true);

create policy "public insert projects"
on public.projects
for insert
with check (true);

create policy "public update projects"
on public.projects
for update
using (true)
with check (true);

create policy "public delete projects"
on public.projects
for delete
using (true);

create policy "public read feedback"
on public.feedback
for select
using (true);

create policy "public insert feedback"
on public.feedback
for insert
with check (true);

create policy "public delete feedback"
on public.feedback
for delete
using (true);

insert into storage.buckets (id, name, public)
values ('aura-design-assets', 'aura-design-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "public read storage" on storage.objects;
drop policy if exists "public upload storage" on storage.objects;
drop policy if exists "public update storage" on storage.objects;
drop policy if exists "public delete storage" on storage.objects;

create policy "public read storage"
on storage.objects
for select
using (bucket_id = 'aura-design-assets');

create policy "public upload storage"
on storage.objects
for insert
with check (bucket_id = 'aura-design-assets');

create policy "public update storage"
on storage.objects
for update
using (bucket_id = 'aura-design-assets')
with check (bucket_id = 'aura-design-assets');

create policy "public delete storage"
on storage.objects
for delete
using (bucket_id = 'aura-design-assets');
