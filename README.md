# 🦎 크레이음 - 크레스티드 게코 관리 PWA

폰 홈 화면에 설치해서 앱처럼 쓰는 개체·혈통·분양 관리 시스템.
노션 가이드의 14개 필드 + 4개 뷰를 그대로 구현했습니다.

---

## 📁 파일 구조

```
CREEUM/
├── index.html              ← 메인 화면
├── manifest.webmanifest    ← PWA 설정
├── sw.js                   ← 오프라인 캐시
├── supabase-schema.sql     ← DB 스키마 (한 번만 실행)
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── config.js        ← ⚠️ Supabase 키 입력
│   │   ├── supabase-client.js
│   │   ├── auth.js
│   │   ├── geckos.js
│   │   ├── ui.js
│   │   └── app.js
│   └── icons/icon.svg
└── README.md (이 파일)
```

---

## 🚀 설치 순서 (총 15분)

### STEP 1. Supabase 프로젝트 만들기 (5분)

1. [supabase.com](https://supabase.com) 가입 (구글/깃허브 로그인 가능)
2. 대시보드 → **New project**
   - Name: `creeum`
   - Database password: 아무 문자열 (어딘가 저장 — 평소엔 안 씀)
   - Region: `Northeast Asia (Seoul)` 권장
   - Plan: **Free**
3. 프로젝트 생성까지 ~1분 대기

### STEP 2. DB 스키마 적용 (1분)

1. 좌측 메뉴 **SQL Editor** 클릭
2. **New query** → `supabase-schema.sql` 파일 내용 통째로 복붙
3. **Run** (Ctrl/Cmd + Enter)
4. 에러 없이 "Success" 뜨면 OK

### STEP 3. API 키 복사 → config.js (2분)

1. 좌측 **Project Settings** (톱니바퀴) → **API**
2. 두 값 복사:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public** key (긴 문자열, `eyJ...` 로 시작)
3. `assets/js/config.js` 열어서:

```js
window.CREEUM_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...'
};
```

> ⚠️ anon key는 공개돼도 안전합니다 (RLS로 본인 데이터만 접근 가능).

### STEP 4. 인터넷에 배포 (5분)

PWA는 HTTPS 주소가 있어야 폰에서 앱처럼 설치 가능합니다.
**Vercel** 또는 **Netlify** 중 편한 곳에 폴더 통째로 올리세요.

#### Vercel (드래그앤드롭)
1. [vercel.com](https://vercel.com) 가입
2. 대시보드 → **Add New → Project → Browse all templates**…
   (또는 더 쉬운 방법: [vercel.com/new](https://vercel.com/new))
3. **Import Third-Party Git Repository** 옆 **Deploy** 누르고 CREEUM 폴더 드래그
4. 1분 대기 → `https://creeum-xxx.vercel.app` 주소 생성

#### Netlify (드래그앤드롭, 더 쉬움)
1. [app.netlify.com](https://app.netlify.com) 가입
2. **Sites** 탭 빈 영역에 CREEUM 폴더를 끌어다 놓기
3. 자동 배포 → `https://random-name.netlify.app` 주소 생성

### STEP 5. 폰에 설치 (1분)

1. 폰 브라우저로 위 주소 열기
   - 아이폰: **Safari**
   - 안드로이드: **Chrome**
2. 처음 한 번 **계정 만들기** (이메일 + 비밀번호) → 메일 인증 클릭 → 로그인
3. 홈 화면에 추가:
   - **아이폰**: 공유 버튼(⬆️) → "홈 화면에 추가"
   - **안드로이드**: ⋮ 메뉴 → "앱 설치" 또는 "홈 화면에 추가"
4. 홈 화면에 🦎 아이콘 → 누르면 풀스크린 앱처럼 실행

---

## 🎯 사용법

### 새 개체 등록
1. 우상단 **＋** 버튼
2. 대표사진 1장 + 갤러리 사진 여러 장 업로드
3. 이름·관리번호·분류·모프·등급·해칭일·체중·분양상태·분양가 입력
4. **저장**

### 부모 연결
- 자식 카드 편집 → "부 (아빠)" / "모 (엄마)" select에서 선택
- 부모 카드를 열면 하단에 자손 목록 자동 표시
- 선택지는 분류(수컷/암컷) 기준으로 자동 정렬됨

### 뷰 전환
- **갤러리**: 분류별 그룹화 (수컷/암컷/미구분/분양완료)
- **전체 표**: 모든 속성 한눈에
- **분양가능**: 손님 문의 왔을 때 빠르게 보여주기
- **분양완료**: 아카이브

### 검색
상단 검색창에 이름·관리번호·모프 입력 → 실시간 필터링

---

## 🔧 관리번호 부여 규칙 (제안)

`CRM-YYYY-NNN`
- CRM: 크레이음
- YYYY: 해칭 연도
- NNN: 그해 일련번호

예: 2025년 첫 해칭 → `CRM-2025-001`

---

## 💾 데이터 백업

Supabase 대시보드 → Table Editor → **geckos** 테이블 → 우상단 **Export to CSV**
정기적으로 받아두면 안전합니다.

---

## ❓ 자주 막히는 부분

**Q. 사진이 안 올라가요**
→ Supabase 대시보드 → Storage → `gecko-photos` 버킷이 만들어졌는지 확인. 없으면 STEP 2 SQL을 다시 실행.

**Q. 로그인이 안 돼요 (메일 인증 안 옴)**
→ Supabase → Authentication → Providers → Email → **Confirm email** 옵션을 끄면 메일 인증 없이 바로 로그인 가능 (혼자 쓰면 끄는 게 편함).

**Q. 폰에서 "홈 화면에 추가"가 안 보여요**
→ 반드시 HTTPS 주소여야 합니다. file:// 또는 http:// 로컬은 불가. Vercel/Netlify 배포 후 시도.

**Q. 다른 폰에서도 같은 데이터를 보고 싶어요**
→ 같은 이메일로 로그인하면 자동 동기화됩니다. 데이터는 Supabase 클라우드에 저장.

**Q. 사진 워터마크는?**
→ 노션 가이드와 동일하게 폰의 단축어 앱(아이폰) 또는 Watermark App(안드로이드)으로 사진 찍은 뒤 업로드. 앱은 업로드만 받음.

---

## 🛠 수정하고 싶을 때

- 색상/디자인: `assets/css/styles.css`의 `:root` 변수 수정
- 필드 추가: `supabase-schema.sql` + `index.html` 폼 + `geckos.js` formToPayload + `ui.js` 카드/표 모두 수정
- 모프 옵션 미리 정의: 현재는 자유 입력. 노션처럼 select로 만들고 싶다면 `index.html`의 `<input name="morphs">`를 `<select multiple>`로 교체

---

## ⚖️ 비용 & 무료 유지

- **Supabase Free**: DB 500MB, Storage 1GB, 50000 MAU — 개인 사용 충분
- **Cloudflare Pages / Netlify Free**: 충분 (상업용 OK)
- **사진은 업로드 시 자동 압축됨** (1600px / JPEG 82%, 보통 ~500KB)
  → 1GB 한도가 **약 2000~5000장** = 게코 200~500마리분 여유

### 무료로 영구 사용 팁
1. **사진 자동 압축**: 이미 코드에 포함됨 (`geckos.js` 의 `compressImage`)
2. **7일 일시정지 방지**: [uptimerobot.com](https://uptimerobot.com) 무료 가입 → 새 모니터에 Supabase URL 추가 (5분 간격) → 영원히 활성
3. **월 1회 백업**: Supabase 대시보드 → Table Editor → geckos → CSV Export → 구글 드라이브 보관
4. **옛 분양완료 사진 정리**: 1년 지난 개체는 갤러리 사진 정리, 대표사진만 보관

---

크레이음 시스템 1단계 완성. 좋은 게코 라이프!
