-- ============================================
-- 크레이음 개체 관리 PWA - Supabase 스키마
-- Supabase 프로젝트 > SQL Editor에 통째로 붙여넣고 Run
-- ============================================

-- 1) 개체(geckos) 테이블
create table if not exists public.geckos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- 기본 정보
  name          text not null,
  management_no text,

  -- 분류 (갤러리 그룹용)
  category      text check (category in ('수컷','암컷','미구분','분양완료')) default '미구분',

  -- 사진
  main_photo_url text,
  gallery_urls   text[] default '{}',

  -- 신체
  hatch_date    date,
  weight_g      numeric(8,2),

  -- 모프/등급
  morphs        text[] default '{}',
  grade         text check (grade in ('★','★★','★★★')),

  -- 분양
  sale_status   text check (sale_status in ('분양가능','예약중','보유(브리딩)','분양완료')) default '보유(브리딩)',
  sale_price    integer,

  -- 혈통
  father_id     uuid references public.geckos(id) on delete set null,
  mother_id     uuid references public.geckos(id) on delete set null,

  -- 메모
  notes         text,

  -- 시스템
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists geckos_user_idx       on public.geckos(user_id);
create index if not exists geckos_category_idx   on public.geckos(category);
create index if not exists geckos_sale_idx       on public.geckos(sale_status);
create index if not exists geckos_father_idx     on public.geckos(father_id);
create index if not exists geckos_mother_idx     on public.geckos(mother_id);

-- 2) updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_geckos_updated_at on public.geckos;
create trigger trg_geckos_updated_at
before update on public.geckos
for each row execute function public.set_updated_at();

-- 3) Row Level Security: 본인 데이터만
alter table public.geckos enable row level security;

drop policy if exists "own geckos select" on public.geckos;
create policy "own geckos select" on public.geckos
  for select using (auth.uid() = user_id);

drop policy if exists "own geckos insert" on public.geckos;
create policy "own geckos insert" on public.geckos
  for insert with check (auth.uid() = user_id);

drop policy if exists "own geckos update" on public.geckos;
create policy "own geckos update" on public.geckos
  for update using (auth.uid() = user_id);

drop policy if exists "own geckos delete" on public.geckos;
create policy "own geckos delete" on public.geckos
  for delete using (auth.uid() = user_id);

-- 4) Storage 버킷 (사진 저장)
-- 콘솔 > Storage > New bucket > 이름: gecko-photos, Public OFF
-- 그 다음 아래 정책 실행:

insert into storage.buckets (id, name, public)
values ('gecko-photos','gecko-photos', true)
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects
  for select using (
    bucket_id = 'gecko-photos'
  );

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects
  for insert with check (
    bucket_id = 'gecko-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects
  for update using (
    bucket_id = 'gecko-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects
  for delete using (
    bucket_id = 'gecko-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
