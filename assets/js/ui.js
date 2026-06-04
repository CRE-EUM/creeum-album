// 렌더링 유틸 + 뷰별 출력

const CATEGORY_ORDER = ['수컷', '암컷', '미구분', '분양완료'];

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function fmtPrice(n) {
  if (!n) return '';
  return Number(n).toLocaleString('ko-KR') + '원';
}

function saleClass(s) {
  if (s === '분양가능') return 'sale';
  if (s === '예약중') return 'reserved';
  if (s === '분양완료') return 'sold';
  return '';
}

function applySearch(items, q) {
  if (!q) return items;
  const k = q.toLowerCase().trim();
  return items.filter(g =>
    (g.name || '').toLowerCase().includes(k) ||
    (g.management_no || '').toLowerCase().includes(k) ||
    (g.morphs || []).some(m => m.toLowerCase().includes(k))
  );
}

export function renderView(container, view, items, searchQ, onOpen) {
  const filtered = applySearch(items, searchQ);
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty">개체가 없습니다.${searchQ ? ' 검색어를 바꿔보세요.' : ' 우측 상단 + 버튼으로 추가해보세요.'}</div>`;
    return;
  }

  if (view === 'gallery') return renderGallery(container, filtered, onOpen);
  if (view === 'table')   return renderTable(container, filtered, onOpen);
  if (view === 'available') {
    return renderGallery(container, filtered.filter(g => g.sale_status === '분양가능'), onOpen);
  }
  if (view === 'sold') {
    return renderTable(container, filtered.filter(g => g.sale_status === '분양완료' || g.category === '분양완료'), onOpen);
  }
}

function renderGallery(container, items, onOpen) {
  const groups = {};
  for (const g of items) {
    const cat = g.category || '미구분';
    (groups[cat] ||= []).push(g);
  }

  const html = CATEGORY_ORDER
    .filter(cat => groups[cat]?.length)
    .map(cat => `
      <section class="group" data-cat="${escapeHtml(cat)}">
        <div class="group-head">
          <span class="dot"></span>
          <strong>${escapeHtml(cat)}</strong>
          <span class="count">${groups[cat].length}</span>
        </div>
        <div class="cards">
          ${groups[cat].map(cardHtml).join('')}
        </div>
      </section>
    `).join('');

  container.innerHTML = html || '<div class="empty">표시할 개체가 없습니다.</div>';
  container.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => onOpen(el.dataset.id));
  });
}

function cardHtml(g) {
  const morphs = (g.morphs || []).slice(0, 2).join(', ');
  const morphsMore = (g.morphs || []).length > 2 ? ` +${g.morphs.length - 2}` : '';
  const sale = g.sale_status;
  return `
    <article class="card" data-id="${g.id}">
      <div class="card-photo" style="${g.main_photo_url ? `background-image:url('${escapeHtml(g.main_photo_url)}')` : ''}">
        ${g.main_photo_url ? '' : '🦎'}
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(g.name)}</div>
        <div class="card-meta">
          ${g.management_no ? `<span class="pill">${escapeHtml(g.management_no)}</span>` : ''}
          ${morphs ? `<span class="pill">${escapeHtml(morphs)}${morphsMore}</span>` : ''}
          ${sale ? `<span class="pill ${saleClass(sale)}">${escapeHtml(sale)}</span>` : ''}
          ${g.grade ? `<span class="pill">${escapeHtml(g.grade)}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

function renderTable(container, items, onOpen) {
  if (items.length === 0) {
    container.innerHTML = '<div class="empty">표시할 개체가 없습니다.</div>';
    return;
  }
  const rows = items.map(g => `
    <tr data-id="${g.id}">
      <td><div class="thumb" style="${g.main_photo_url ? `background-image:url('${escapeHtml(g.main_photo_url)}')` : ''}"></div></td>
      <td><strong>${escapeHtml(g.name)}</strong></td>
      <td>${escapeHtml(g.management_no || '')}</td>
      <td>${escapeHtml(g.category || '')}</td>
      <td>${escapeHtml((g.morphs || []).join(', '))}</td>
      <td>${escapeHtml(g.grade || '')}</td>
      <td>${escapeHtml(g.sale_status || '')}</td>
      <td>${fmtPrice(g.sale_price)}</td>
      <td>${escapeHtml(g.hatch_date || '')}</td>
      <td>${g.weight_g ?? ''}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-wrap">
      <table class="geckos">
        <thead>
          <tr>
            <th></th><th>이름</th><th>관리번호</th><th>분류</th>
            <th>모프</th><th>등급</th><th>분양상태</th><th>분양가</th>
            <th>해칭일</th><th>체중(g)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  container.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => onOpen(tr.dataset.id));
  });
}

// 부모 select 옵션 채우기
export function populateParentSelects(form, items, currentId) {
  ['father_id','mother_id'].forEach(name => {
    const sel = form.querySelector(`[name="${name}"]`);
    if (!sel) return;
    const candidates = items.filter(g => g.id !== currentId);
    const wantedCat = name === 'father_id' ? '수컷' : '암컷';
    candidates.sort((a, b) => {
      const ac = (a.category === wantedCat) ? 0 : 1;
      const bc = (b.category === wantedCat) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return (a.name || '').localeCompare(b.name || '');
    });
    sel.innerHTML = `<option value="">(없음)</option>` +
      candidates.map(g =>
        `<option value="${g.id}">${escapeHtml(g.name)}${g.management_no ? ' · '+escapeHtml(g.management_no) : ''}</option>`
      ).join('');
  });
}

// 모달에 개체 데이터 채우기
export function fillForm(form, g) {
  const set = (n, v) => {
    const el = form.querySelector(`[name="${n}"]`);
    if (el) el.value = v ?? '';
  };
  set('name', g.name);
  set('management_no', g.management_no);
  set('category', g.category || '미구분');
  set('grade', g.grade || '');
  set('hatch_date', g.hatch_date || '');
  set('weight_g', g.weight_g ?? '');
  set('morphs', (g.morphs || []).join(', '));
  set('sale_status', g.sale_status || '보유(브리딩)');
  set('sale_price', g.sale_price ?? '');
  set('father_id', g.father_id || '');
  set('mother_id', g.mother_id || '');
  set('notes', g.notes || '');
}

export function resetForm(form) {
  form.reset();
  form.querySelector('[name="category"]').value = '미구분';
  form.querySelector('[name="sale_status"]').value = '보유(브리딩)';
}

export function showToast(msg, opts = {}) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (opts.error ? ' error' : '');
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, opts.duration || 2200);
}

export function renderOffspring(container, list, onOpen) {
  if (!list?.length) { container.hidden = true; return; }
  const ul = container.querySelector('#offspring-list');
  ul.innerHTML = list.map(c =>
    `<li data-id="${c.id}">${escapeHtml(c.name)}${c.management_no ? ' · '+escapeHtml(c.management_no) : ''}</li>`
  ).join('');
  ul.querySelectorAll('li').forEach(li =>
    li.addEventListener('click', () => onOpen(li.dataset.id))
  );
  container.hidden = false;
}
