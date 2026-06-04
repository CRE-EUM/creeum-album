// Supabase 클라이언트 싱글톤
// window.supabase 는 CDN 스크립트가 주입한 라이브러리
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CREEUM_CONFIG || {};

if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT')) {
  document.body.innerHTML = `
    <div style="padding:40px;font-family:system-ui;color:#e8e6df;background:#0f1115;min-height:100vh">
      <h2 style="color:#e0c46b">⚠️ 설정 필요</h2>
      <p><code>assets/js/config.js</code> 파일을 열어서 Supabase URL과 anon key를 채워주세요.</p>
      <p>1) supabase.com 에서 프로젝트 생성<br>
         2) Project Settings → API 에서 URL과 anon public key 복사<br>
         3) config.js 에 붙여넣고 저장<br>
         4) 새로고침</p>
    </div>`;
  throw new Error('Supabase config missing');
}

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
