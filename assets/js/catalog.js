// ─────────────────────────────────────────────────────────────
//  크레이음 카탈로그 — 단일 페이지 갤러리 + 운영자 모드 (Supabase 연동)
//  데이터: Supabase(geckos 테이블)  ·  사진: Base64(자동 압축, data JSON에 저장)
//  읽기: 누구나(공개)   ·   쓰기: 로그인한 운영자만 (RLS로 보호)
// ─────────────────────────────────────────────────────────────

const CATEGORIES   = ['수컷', '암컷', '미구분', '분양완료'];
const OPENCHAT_URL = 'https://open.kakao.com/o/sP0qNYrh';
const TABLE        = 'geckos';

// 분류별 캐릭터 (빈 화면 일러스트)
const CHAR_BY_CAT = {
  all:    './assets/characters/hello.png',
  '수컷':   './assets/characters/basic.png',
  '암컷':   './assets/characters/heart.png',
  '미구분':  './assets/characters/hatch.png',
  '분양완료': './assets/characters/keyring.png',
};

// ───────── Supabase 클라이언트 ─────────
const cfg = window.CREEUM_CONFIG || {};
let sb = null;
const configured =
  cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') &&
  cfg.SUPABASE_ANON_KEY && window.supabase;
if (configured) {
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
}

// ───────── 상태 ─────────
let state = { geckos: [] };
let currentCat = 'all';
let editingId = null;

// ───────── DOM 헬퍼 ─────────
const $  = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toEpoch(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? Date.now() : t; }
  return Date.now();
}

// ───────── 행 ↔ 개체 변환 ─────────
// DB 행 { id, created_at, data:{ name, category, notes, photo } } ↔ 화면용 개체
function rowToGecko(row) {
  const d = row.data || {};
  return {
    id: row.id,
    createdAt: Number(row.created_at) || 0,
    name: d.name || '',
    category: CATEGORIES.includes(d.category) ? d.category : '미구분',
    notes: d.notes || '',
    photo: d.photo || '',
  };
}
function geckoToRow(g) {
  return {
    id: g.id,
    created_at: toEpoch(g.createdAt),
    data: {
      name: g.name || '',
      category: g.category || '미구분',
      notes: g.notes || '',
      photo: g.photo || '',
    },
  };
}

// ───────── 데이터 로드/저장 (Supabase) ─────────
async function loadGeckos() {
  if (!sb) return;
  const { data, error } = await sb.from(TABLE)
    .select('id, created_at, data')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); toast('불러오기 실패: ' + error.message, 4000); return; }
  state.geckos = (data || []).map(rowToGecko);
}

async function saveGecko(g) {
  const { error } = await sb.from(TABLE).upsert(geckoToRow(g));
  if (error) throw error;
}

async function removeGecko(id) {
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// ───────── 이미지 압축 ─────────
async function compressImage(file, maxSize = 1280, quality = 0.85) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width  * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', quality);
}

// ───────── 렌더링 ─────────
function render() {
  const grid = $('#grid');
  const items = currentCat === 'all'
    ? state.geckos
    : state.geckos.filter(g => g.category === currentCat);

  // 최근에 추가한 게 위로 오게
  const sorted = [...items].sort((a, b) =>
    (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

  grid.innerHTML = sorted.map(g => `
    <button class="card" data-id="${g.id}" aria-label="${escapeHtml(g.name)} 상세 보기">
      <div class="card-photo${g.photo ? '' : ' placeholder'}">
        ${g.photo ? `<img src="${g.photo}" alt="${escapeHtml(g.name)}" loading="lazy" />` : ''}
      </div>
      <div class="card-body">
        <p class="card-name">${escapeHtml(g.name)}</p>
        <span class="card-badge" data-cat="${g.category}">${g.category}</span>
      </div>
      <span class="card-edit" data-edit="${g.id}" role="button" aria-label="편집">✎</span>
    </button>
  `).join('');

  $('#empty-state').hidden = sorted.length > 0;
  if (sorted.length === 0) {
    if (!configured) {
      $('#empty-msg').textContent = 'Supabase 설정이 필요합니다. config.js를 확인하세요.';
    } else if (state.geckos.length === 0) {
      $('#empty-msg').textContent = document.body.classList.contains('is-admin')
        ? '＋ 새 개체 버튼으로 첫 개체를 등록해보세요.'
        : '아직 공개된 개체가 없습니다.';
    } else {
      $('#empty-msg').textContent = `${currentCat} 분류에 해당하는 개체가 없습니다.`;
    }
    $('#empty-char').src = CHAR_BY_CAT[currentCat] || CHAR_BY_CAT.all;
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// ───────── 라우팅 (해시) ─────────
function navigate() {
  const m = location.hash.match(/^#\/g\/(.+)$/);
  if (m) showDetail(m[1]);
  else showHome();
}

function showHome() {
  $('#view-detail').hidden = true;
  $('#view-home').hidden = false;
  document.title = '크레이음 · 크레스티드 게코 카탈로그';
  window.scrollTo(0, 0);
}

function showDetail(id) {
  const g = state.geckos.find(x => x.id === id);
  if (!g) {
    toast('해당 개체를 찾을 수 없습니다.');
    location.hash = '';
    return;
  }
  $('#view-home').hidden = true;
  $('#view-detail').hidden = false;

  $('#detail-title').textContent = g.name;
  $('#detail-name').textContent  = g.name;
  $('#detail-cat').textContent   = g.category;
  $('#detail-cat').dataset.cat   = g.category;
  $('#detail-notes').textContent = g.notes || '';

  const photoBox = $('.detail-photo');
  const img = $('#detail-img');
  if (g.photo) {
    img.src = g.photo;
    img.alt = g.name;
    img.hidden = false;
    photoBox.classList.remove('placeholder');
    photoBox.innerHTML = '';
    photoBox.appendChild(img);
  } else {
    photoBox.classList.add('placeholder');
    photoBox.innerHTML = '<img class="placeholder-char" src="./assets/characters/note.png" alt="" />';
  }

  // 편집/삭제는 운영자만
  $('#detail-actions').hidden = !document.body.classList.contains('is-admin');

  document.title = `${g.name} · 크레이음`;
  window.scrollTo(0, 0);
}

// ───────── 분류 탭 ─────────
function bindTabs() {
  $('#tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    $$('.tab').forEach(t => t.classList.toggle('is-active', t === btn));
    currentCat = btn.dataset.cat;
    render();
  });
}

// ───────── 카드 클릭 ─────────
function bindGrid() {
  $('#grid').addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      openModal(editBtn.dataset.edit);
      return;
    }
    const card = e.target.closest('.card');
    if (card) location.hash = `#/g/${card.dataset.id}`;
  });
}

// ───────── 상세: 뒤로/공유/문의/편집/삭제 ─────────
function bindDetail() {
  $('#btn-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.hash = '';
  });

  $('#btn-share').addEventListener('click', async () => {
    const url = location.href;
    const title = $('#detail-title').textContent;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast('링크를 복사했습니다.');
      } catch { toast(url); }
    }
  });

  // 분양문의: 현재 개체 정보를 클립보드에 복사 → 오픈채팅방 열기
  $('#btn-inquiry').addEventListener('click', () => {
    const id = location.hash.match(/^#\/g\/(.+)$/)?.[1];
    const g = state.geckos.find(x => x.id === id);

    // 사용자 제스처 컨텍스트를 잃지 않도록 채팅방을 먼저 연다
    window.open(OPENCHAT_URL, '_blank', 'noopener');
    if (!g) return;

    const msg =
      `[크레이음 분양문의]\n` +
      `· 개체: ${g.name}\n` +
      `· 분류: ${g.category}\n` +
      `· 링크: ${location.href}\n\n` +
      `안녕하세요! 위 개체 분양 문의드립니다.`;

    navigator.clipboard?.writeText(msg).then(
      () => toast('개체 정보를 복사했어요! 채팅방에 붙여넣기 해주세요 🙂', 3200),
      () => toast('채팅방에서 문의 개체를 알려주세요: ' + g.name, 3200),
    );
  });

  $('#btn-edit').addEventListener('click', () => {
    const id = location.hash.match(/^#\/g\/(.+)$/)?.[1];
    if (id) openModal(id);
  });

  $('#btn-delete').addEventListener('click', async () => {
    const id = location.hash.match(/^#\/g\/(.+)$/)?.[1];
    if (!id) return;
    const g = state.geckos.find(x => x.id === id);
    if (!g) return;
    if (!confirm(`"${g.name}" 개체를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await removeGecko(id);
      state.geckos = state.geckos.filter(x => x.id !== id);
      toast('삭제했습니다.');
      location.hash = '';
      render();
    } catch (err) {
      console.error(err);
      toast('삭제 실패: ' + err.message, 4000);
    }
  });
}

// ───────── 모달 (추가/편집) ─────────
function openModal(id = null) {
  editingId = id;
  const modal = $('#modal');
  const form = $('#form');
  form.reset();
  $('#photo-preview').innerHTML = '<span class="photo-hint">탭해서 사진 선택</span>';
  form.dataset.photo = '';

  if (id) {
    const g = state.geckos.find(x => x.id === id);
    if (!g) return;
    $('#modal-title').textContent = '개체 편집';
    form.name.value = g.name;
    form.category.value = g.category;
    form.notes.value = g.notes || '';
    if (g.photo) {
      $('#photo-preview').innerHTML = `<img src="${g.photo}" alt="" />`;
      form.dataset.photo = g.photo;
    }
  } else {
    $('#modal-title').textContent = '새 개체';
  }
  modal.showModal();
}

function bindModal() {
  const modal = $('#modal');
  const form  = $('#form');
  const submitBtn = form.querySelector('button[type="submit"]');

  $('#btn-close').addEventListener('click', () => modal.close());
  $('#btn-cancel').addEventListener('click', () => modal.close());

  // 사진 선택 → 압축 → 미리보기
  form.photo.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      $('#photo-preview').innerHTML = '<span class="photo-hint">처리 중…</span>';
      const dataUrl = await compressImage(file);
      form.dataset.photo = dataUrl;
      $('#photo-preview').innerHTML = `<img src="${dataUrl}" alt="" />`;
    } catch (err) {
      console.error(err);
      toast('사진을 불러오지 못했습니다.');
      $('#photo-preview').innerHTML = '<span class="photo-hint">탭해서 사진 선택</span>';
    }
  });

  // 미리보기 영역 클릭 → 파일 선택 다이얼로그
  $('#photo-preview').addEventListener('click', () => form.photo.click());

  // 저장
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.name.value.trim();
    const category = form.category.value;
    const notes = form.notes.value.trim();
    const photo = form.dataset.photo || '';

    if (!name) { toast('이름을 입력해주세요.'); return; }
    if (!CATEGORIES.includes(category)) { toast('분류를 선택해주세요.'); return; }
    if (!sb) { toast('Supabase 설정이 필요합니다.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '저장 중…';
    try {
      if (editingId) {
        const g = state.geckos.find(x => x.id === editingId);
        const updated = { ...g, name, category, notes, photo };
        await saveGecko(updated);
        if (g) Object.assign(g, updated);
      } else {
        const g = { id: uid(), createdAt: Date.now(), name, category, notes, photo };
        await saveGecko(g);
        state.geckos.unshift(g);
      }
      modal.close();
      toast(editingId ? '수정했습니다.' : '추가했습니다.');
      if (editingId && location.hash.startsWith('#/g/')) showDetail(editingId);
      render();
      editingId = null;
    } catch (err) {
      console.error(err);
      toast('저장 실패: ' + err.message, 4000);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '저장';
    }
  });
}

// ───────── 운영자 모드 (Supabase Auth) ─────────
function isAdmin() { return document.body.classList.contains('is-admin'); }

function applyAdmin(on) {
  document.body.classList.toggle('is-admin', on);
  $('#admin-bar').hidden = !on;
  if (location.hash.startsWith('#/g/')) $('#detail-actions').hidden = !on;
  render();
}

function translateAuthError(msg = '') {
  if (/Invalid login/i.test(msg))           return '이메일 또는 비밀번호가 틀렸습니다.';
  if (/Email not confirmed/i.test(msg))      return '이메일 인증이 필요합니다. 받은 메일을 확인하세요.';
  if (/Email logins are disabled/i.test(msg))return '이메일 로그인이 비활성화되어 있습니다.';
  return msg || '로그인에 실패했습니다.';
}

function bindAdmin() {
  // 자물쇠 → 로그인 모달 (이미 로그인 상태면 무시)
  $('#btn-admin').addEventListener('click', () => {
    if (isAdmin()) { toast('이미 운영자 모드입니다.'); return; }
    if (!sb) { toast('Supabase 설정이 필요합니다.'); return; }
    $('#login-error').hidden = true;
    $('#login-modal').showModal();
  });

  // 로그인 모달
  $('#btn-login-close').addEventListener('click', () => $('#login-modal').close());
  $('#btn-login-cancel').addEventListener('click', () => $('#login-modal').close());
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    const password = f.password.value;
    const errEl = $('#login-error');
    errEl.hidden = true;
    if (!sb) { errEl.textContent = 'Supabase 설정이 필요합니다.'; errEl.hidden = false; return; }
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '로그인 중…';
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      $('#login-modal').close();
      f.reset();
      toast('운영자 모드 ON');
    } catch (err) {
      errEl.textContent = translateAuthError(err.message);
      errEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = '로그인';
    }
  });

  $('#btn-logout').addEventListener('click', async () => {
    try { await sb?.auth.signOut(); } catch {}
    toast('운영자 모드 OFF');
  });

  $('#btn-new').addEventListener('click', () => openModal(null));

  // 내보내기 (백업용 JSON)
  $('#btn-export').addEventListener('click', () => {
    const dump = { version: 1, geckos: state.geckos };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creeum-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('JSON으로 내보냈습니다.');
  });

  // 가져오기 (병합 upsert — 같은 id는 덮어쓰고 새 id는 추가)
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!sb) throw new Error('Supabase 설정이 필요합니다.');
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.geckos)) throw new Error('형식이 올바르지 않습니다.');
      if (!confirm(`${parsed.geckos.length}개 개체를 불러옵니다.\n같은 id는 덮어쓰고, 새 id는 추가됩니다. 진행할까요?`)) {
        e.target.value = '';
        return;
      }
      const rows = parsed.geckos.map(g => geckoToRow({
        id: g.id || uid(),
        createdAt: g.createdAt ?? g.created_at ?? Date.now(),
        name: g.name, category: g.category, notes: g.notes, photo: g.photo,
      }));
      const { error } = await sb.from(TABLE).upsert(rows);
      if (error) throw error;
      await loadGeckos();
      render();
      toast('가져오기 완료');
    } catch (err) {
      console.error(err);
      toast('가져오기 실패: ' + err.message, 4000);
    } finally {
      e.target.value = '';
    }
  });
}

// ───────── 초기화 ─────────
async function init() {
  bindTabs();
  bindGrid();
  bindDetail();
  bindModal();
  bindAdmin();

  if (!configured) {
    toast('Supabase 설정이 필요합니다. config.js를 확인하세요.', 5000);
    render();
    return;
  }

  // 로그인 상태 반영 + 변경 구독
  const { data: { session } } = await sb.auth.getSession();
  applyAdmin(!!session);
  sb.auth.onAuthStateChange((_e, s) => applyAdmin(!!s));

  // 데이터 로드
  $('#empty-msg').textContent = '불러오는 중…';
  $('#empty-state').hidden = false;
  await loadGeckos();

  window.addEventListener('hashchange', navigate);
  navigate();
  render();
}

init();
