-- ============================================
-- 052 CREST - 성장기록(growth_records) 테이블
-- 읽기: 누구나(공개)   ·   쓰기: 운영자 본인 이메일만
-- Supabase 프로젝트 > SQL Editor에 통째로 붙여넣고 Run
-- (geckos / inquiries 스키마와 별개로 한 번 실행)
-- ============================================

-- 성장기록 (data = { nameKo, nameEn, code, entries:[{photo,date,weight} ...] })
create table if not exists public.growth_records (
  id          text primary key,
  created_at  bigint,
  data        jsonb not null default '{}'::jsonb
);

alter table public.growth_records enable row level security;

-- ===== 기존 정책 정리 (여러 번 실행해도 안전) =====
drop policy if exists "growth public read"  on public.growth_records;
drop policy if exists "growth owner insert" on public.growth_records;
drop policy if exists "growth owner update" on public.growth_records;
drop policy if exists "growth owner delete" on public.growth_records;

-- 공개 읽기
create policy "growth public read"
  on public.growth_records for select
  to anon, authenticated
  using (true);

-- ⬇⬇⬇ 아래 3곳의 이메일을 "운영자 로그인 이메일"로 (geckos 스키마와 동일하게) ⬇⬇⬇
-- (현재 값: bosshaha7@gmail.com)

-- 추가: 운영자 본인만
create policy "growth owner insert"
  on public.growth_records for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 수정: 운영자 본인만
create policy "growth owner update"
  on public.growth_records for update
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 삭제: 운영자 본인만
create policy "growth owner delete"
  on public.growth_records for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
