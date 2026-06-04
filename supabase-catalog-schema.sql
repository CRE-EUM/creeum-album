-- ============================================
-- 크레이음 카탈로그(catalog.html) - Supabase 스키마
-- 읽기: 누구나(공개)   ·   쓰기: 운영자 본인 이메일만
-- Supabase 프로젝트 > SQL Editor에 통째로 붙여넣고 Run
-- ============================================

-- 개체 데이터 테이블 (id = 개체 식별자, data = 개체 정보 전체 JSON)
create table if not exists public.geckos (
  id          text primary key,
  created_at  bigint,
  data        jsonb not null default '{}'::jsonb
);

-- 행 수준 보안(RLS) 켜기
alter table public.geckos enable row level security;

-- ===== 기존 정책 정리 (있으면 삭제 후 재생성 — 여러 번 실행해도 안전) =====
drop policy if exists "creeum public read"  on public.geckos;
drop policy if exists "creeum auth insert"  on public.geckos;
drop policy if exists "creeum auth update"  on public.geckos;
drop policy if exists "creeum auth delete"  on public.geckos;
drop policy if exists "creeum owner insert" on public.geckos;
drop policy if exists "creeum owner update" on public.geckos;
drop policy if exists "creeum owner delete" on public.geckos;

-- 공개 읽기: 로그인 안 한 손님도 갤러리/상세를 볼 수 있음
create policy "creeum public read"
  on public.geckos for select
  to anon, authenticated
  using (true);

-- ⬇⬇⬇ 아래 3곳의 이메일을 "운영자님이 로그인할 이메일"로 바꿔주세요 ⬇⬇⬇
-- (현재 값: bosshaha7@gmail.com)

-- 추가: 운영자 본인만
create policy "creeum owner insert"
  on public.geckos for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 수정: 운영자 본인만
create policy "creeum owner update"
  on public.geckos for update
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 삭제: 운영자 본인만
create policy "creeum owner delete"
  on public.geckos for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
