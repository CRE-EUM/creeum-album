-- ============================================
-- 크레이음 카탈로그 - 분양 문의/신청 테이블
-- 손님: 누구나 신청(insert) 가능   ·   조회/수정/삭제: 운영자 본인만
-- Supabase 프로젝트 > SQL Editor에 붙여넣고 Run
-- (geckos 스키마와 별개로 한 번 실행)
-- ============================================

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

-- ===== 기존 정책 정리 =====
drop policy if exists "inq public insert" on public.inquiries;
drop policy if exists "inq owner select" on public.inquiries;
drop policy if exists "inq owner update" on public.inquiries;
drop policy if exists "inq owner delete" on public.inquiries;

-- 손님: 분양 신청서 제출(insert)만 허용
create policy "inq public insert"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

-- ⬇⬇⬇ 아래 3곳의 이메일을 "운영자 로그인 이메일"로 바꿔주세요 (geckos 스키마와 동일하게) ⬇⬇⬇
-- (현재 값: bosshaha7@gmail.com)

-- 조회: 운영자 본인만
create policy "inq owner select"
  on public.inquiries for select
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 수정(처리완료 표시): 운영자 본인만
create policy "inq owner update"
  on public.inquiries for update
  to authenticated
  using      ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );

-- 삭제: 운영자 본인만
create policy "inq owner delete"
  on public.inquiries for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') = 'bosshaha7@gmail.com' );
