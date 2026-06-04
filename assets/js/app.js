import { sb } from './supabase-client.js';
import { getSession, signIn, signUp, signOut, onAuthChange } from './auth.js';
import {
  listGeckos, getGecko, createGecko, updateGecko, deleteGecko,
  getOffspring, uploadPhoto, uploadPhotos, formToPayload
} from './geckos.js';
import {
  renderView, populateParentSelects, fillForm, resetForm,
  showToast, renderOffspring, escapeHtml
} from './ui.js';

// === 전역 상태 ===
const state = {
  items: [],
  view: 'gallery',
  search: '',
  editingId: null,
  pendingMain: null,    // File 객체 (저장 시 업로드)
  pendingGallery: [],   // File[] (저장 시 업로드)
  existingMain: null,   // 기존 URL
  existingGallery: []   // 기존 URL[]
};

// === DOM ===
const $ = (sel) => document.querySelector(sel);
const screenAuth = $('#screen-auth');
const screenMain = $('#screen-main');
const authForm = $('#auth-form');
const authError = $('#auth-error');
const content = $('#content');
const modal = $('#gecko-modal');
const form = $('#gecko-form');
const search = $('#search');

// === 초기화 ===
(async function init() {
  registerSW();
  bindAuth();
  bindMainUI();
  bindModal();

  const session = await getSession();
  applyAuthState(session);
  onAuthChange(applyAuthState);
})();

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function applyAuthState(session) {
  if (session?.user) {
    screenAuth.hidden = true;
    screenMain.hidden = false;
    $('#user-email').textContent = session.user.email;
    refresh();
  } else {
    screenAuth.hidden = false;
    screenMain.hidden = true;
  }
}

// === 인증 ===
function bindAuth() {
  let submittingMode = 'signin';
  authForm.querySelectorAll('button[type="submit"]').forEach(b => {
    b.addEventListener('click', () => { submittingMode = b.dataset.mode; });
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    const fd = new FormData(authForm);
    const email = fd.get('email');
    const password = fd.get('password');
    try {
      if (submittingMode === 'signup') {
        await signUp(email, password);
        authError.textContent = '✓ 가입 메일을 확인하세요.';
        authError.style.color = '#6cba7f';
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      authError.style.color = '';
      authError.textContent = translateAuthError(err.message);
    }
  });

  $('#btn-logout').addEventListener('click', async () => {
    await signOut();
    closeDrawer();
  });
}

function translateAuthError(msg) {
  if (/Invalid login/i.test(msg)) return '이메일 또는 비밀번호가 틀렸습니다.';
  if (/User already registered/i.test(msg)) return '이미 가입된 이메일입니다.';
  if (/Password should/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.';
  return msg;
}

// === 메인 UI ===
function bindMainUI() {
  // 탭 전환
  $('#view-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    state.view = tab.dataset.view;
    render();
  });

  // 검색
  search.addEventListener('input', () => {
    state.search = search.value;
    render();
  });

  // 새 개체
  $('#btn-add').addEventListener('click', () => openModal(null));

  // Drawer
  $('#btn-menu').addEventListener('click', () => $('#drawer').hidden = false);
  $('#btn-drawer-close').addEventListener('click', closeDrawer);
}

function closeDrawer() { $('#drawer').hidden = true; }

async function refresh() {
  try {
    content.innerHTML = '<div class="empty">불러오는 중…</div>';
    state.items = await listGeckos();
    render();
  } catch (err) {
    content.innerHTML = `<div class="empty">불러오기 실패: ${escapeHtml(err.message)}</div>`;
  }
}

function render() {
  renderView(content, state.view, state.items, state.search, openModal);
}

// === 모달 ===
function bindModal() {
  $('#btn-modal-close').addEventListener('click', closeModal);
  $('#btn-cancel').addEventListener('click', closeModal);
  $('#btn-delete').addEventListener('click', onDelete);

  form.addEventListener('submit', onSubmit);

  // 대표사진 미리보기
  form.querySelector('[name="main_photo"]').addEventListener('change', (e) => {
    const file = e.target.files[0];
    state.pendingMain = file || null;
    const prev = $('#main-preview');
    if (file) {
      prev.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
      prev.classList.add('has-img');
      prev.textContent = '';
    }
  });

  // 갤러리 사진들
  form.querySelector('[name="gallery"]').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    state.pendingGallery = state.pendingGallery.concat(files);
    renderGalleryPreview();
  });

  modal.addEventListener('close', () => {
    state.editingId = null;
    state.pendingMain = null;
    state.pendingGallery = [];
    state.existingMain = null;
    state.existingGallery = [];
  });
}

function renderGalleryPreview() {
  const row = $('#gallery-preview');
  const existing = state.existingGallery.map((url, i) => ({ url, key: 'e'+i, existing: true }));
  const pending = state.pendingGallery.map((f, i) => ({ url: URL.createObjectURL(f), key: 'p'+i, existing: false }));
  const all = [...existing, ...pending];
  row.innerHTML = all.map(item => `
    <div class="thumb" data-key="${item.key}" style="background-image:url('${item.url}')">
      <button type="button" class="x" data-key="${item.key}" aria-label="삭제">✕</button>
    </div>
  `).join('');
  row.querySelectorAll('.x').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (key.startsWith('e')) {
        const idx = Number(key.slice(1));
        state.existingGallery.splice(idx, 1);
      } else {
        const idx = Number(key.slice(1));
        state.pendingGallery.splice(idx, 1);
      }
      renderGalleryPreview();
    });
  });
}

async function openModal(id) {
  state.editingId = id;
  resetForm(form);
  $('#main-preview').style.backgroundImage = '';
  $('#main-preview').classList.remove('has-img');
  $('#main-preview').textContent = '사진 없음';
  $('#gallery-preview').innerHTML = '';
  $('#offspring-section').hidden = true;
  $('#btn-delete').hidden = !id;
  $('#modal-title').textContent = id ? '개체 편집' : '새 개체';

  // 부모 select 채우기
  populateParentSelects(form, state.items, id);

  if (id) {
    try {
      const g = await getGecko(id);
      fillForm(form, g);
      if (g.main_photo_url) {
        state.existingMain = g.main_photo_url;
        const prev = $('#main-preview');
        prev.style.backgroundImage = `url('${g.main_photo_url}')`;
        prev.classList.add('has-img');
        prev.textContent = '';
      }
      state.existingGallery = g.gallery_urls || [];
      renderGalleryPreview();

      // 자손 표시
      const off = await getOffspring(id);
      renderOffspring($('#offspring-section'), off, (cid) => {
        modal.close();
        setTimeout(() => openModal(cid), 100);
      });
    } catch (err) {
      showToast('불러오기 실패: ' + err.message, { error: true });
    }
  }
  if (typeof modal.showModal === 'function') modal.showModal();
  else modal.setAttribute('open', '');
}

function closeModal() {
  if (modal.open) modal.close();
  else modal.removeAttribute('open');
}

async function onSubmit(e) {
  e.preventDefault();
  const saveBtn = $('#btn-save');
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중…';
  try {
    const payload = formToPayload(form);

    // 사진 업로드
    if (state.pendingMain) {
      payload.main_photo_url = await uploadPhoto(state.pendingMain);
    } else if (state.existingMain) {
      payload.main_photo_url = state.existingMain;
    } else {
      payload.main_photo_url = null;
    }

    let galleryUrls = [...state.existingGallery];
    if (state.pendingGallery.length) {
      const newOnes = await uploadPhotos(state.pendingGallery);
      galleryUrls = galleryUrls.concat(newOnes);
    }
    payload.gallery_urls = galleryUrls;

    if (state.editingId) {
      const updated = await updateGecko(state.editingId, payload);
      const i = state.items.findIndex(x => x.id === updated.id);
      if (i >= 0) state.items[i] = updated;
      showToast('저장 완료');
    } else {
      const created = await createGecko(payload);
      state.items.unshift(created);
      showToast('등록 완료');
    }
    closeModal();
    render();
  } catch (err) {
    showToast('저장 실패: ' + err.message, { error: true });
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
}

async function onDelete() {
  if (!state.editingId) return;
  if (!confirm('이 개체를 삭제할까요? 되돌릴 수 없습니다.')) return;
  try {
    await deleteGecko(state.editingId);
    state.items = state.items.filter(g => g.id !== state.editingId);
    closeModal();
    render();
    showToast('삭제됨');
  } catch (err) {
    showToast('삭제 실패: ' + err.message, { error: true });
  }
}
