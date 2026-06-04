-- ============================================================
-- 크레이음 카탈로그 — Supabase 초기 설정 (한 번에 실행)
-- Supabase 대시보드 > SQL Editor > New query > 통째로 붙여넣고 Run
-- 여러 번 실행해도 안전합니다.
--
-- ※ 아래 이메일(bosshaha7@gmail.com)은 "운영자 로그인 이메일"입니다.
--   다른 이메일로 로그인하실 거면, 이 파일의 이메일을 전부 바꿔주세요.
-- ============================================================

-- ───────── 1) 개체(geckos) 테이블 ─────────
create table if not exists public.geckos (
  id          text primary key,
  created_at  bigint,
  data        jsonb not null default '{}'::jsonb
);
alter table public.geckos enable row level security;

-- ⚠️ 테스트 데이터 전부 삭제 (지금은 테스트 개체뿐이라 깨끗이 비웁니다)
delete from public.geckos;

drop policy if exists "creeum public read"  on public.geckos;
drop policy if exists "creeum auth insert"  on public.geckos;
drop policy if exists "creeum auth update"  on public.geckos;
drop policy if exists "creeum auth delete"  on public.geckos;
drop policy if exists "creeum owner insert" on public.geckos;
drop policy if exists "creeum owner update" on public.geckos;
drop policy if exists "creeum owner delete" on public.geckos;

create policy "creeum public read" on public.geckos
  for select to anon, authenticated using (true);
create policy "creeum owner insert" on public.geckos
  for insert to authenticated
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
create policy "creeum owner update" on public.geckos
  for update to authenticated
  using      ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
create policy "creeum owner delete" on public.geckos
  for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- ───────── 2) 분양 문의(inquiries) 테이블 ─────────
create table if not exists public.inquiries (
  id          text primary key,
  created_at  bigint,
  gecko_id    text,
  gecko_name  text,
  name        text not null,
  contact     text not null,
  message     text,
  handled     boolean default false
);
alter table public.inquiries enable row level security;

drop policy if exists "inq public insert" on public.inquiries;
drop policy if exists "inq owner select" on public.inquiries;
drop policy if exists "inq owner update" on public.inquiries;
drop policy if exists "inq owner delete" on public.inquiries;

-- 손님: 누구나 신청서 제출(insert)만 가능
create policy "inq public insert" on public.inquiries
  for insert to anon, authenticated with check (true);
-- 운영자 본인만 조회/수정/삭제
create policy "inq owner select" on public.inquiries
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
create policy "inq owner update" on public.inquiries
  for update to authenticated
  using      ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
create policy "inq owner delete" on public.inquiries
  for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 완료! 이제 앱에서 운영자 로그인 후 개체를 등록하면 됩니다.
