-- scroll-scroll · esquema
-- Pegar entero en Supabase > SQL Editor > New query > Run

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  author      text not null check (author in ('natalia', 'daniel')),
  kind        text not null check (kind in ('text', 'link', 'image', 'video', 'audio')),
  body        text,
  url         text,
  meta        jsonb not null default '{}'::jsonb
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Seguridad: la tabla queda cerrada al público. Solo la API del servidor (con la clave service_role) lee y escribe.
alter table public.posts enable row level security;

-- Bucket público para gifs, imágenes, vídeos y audios subidos (lectura pública, escritura solo desde la API).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/png','image/jpeg','image/gif','image/webp','image/avif','image/svg+xml','image/heic',
        'video/mp4','video/webm','video/quicktime','video/x-m4v',
        'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-m4a','audio/aac']
)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cualquiera puede ver los archivos del bucket (es lo que hace que las imágenes se vean en la web).
drop policy if exists "media lectura publica" on storage.objects;
create policy "media lectura publica"
  on storage.objects for select
  using (bucket_id = 'media');
