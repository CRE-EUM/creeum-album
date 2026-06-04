import { sb } from './supabase-client.js';

const TABLE = 'geckos';
const BUCKET = 'gecko-photos';

const SELECT = `
  id, name, management_no, category, main_photo_url, gallery_urls,
  hatch_date, weight_g, morphs, grade, sale_status, sale_price,
  father_id, mother_id, notes, created_at, updated_at
`;

export async function listGeckos() {
  const { data, error } = await sb.from(TABLE).select(SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getGecko(id) {
  const { data, error } = await sb.from(TABLE).select(SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createGecko(payload) {
  const user = (await sb.auth.getUser()).data.user;
  const { data, error } = await sb.from(TABLE)
    .insert({ ...payload, user_id: user.id })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateGecko(id, payload) {
  const { data, error } = await sb.from(TABLE)
    .update(payload)
    .eq('id', id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGecko(id) {
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function getOffspring(parentId) {
  const { data, error } = await sb.from(TABLE)
    .select('id, name, management_no, main_photo_url')
    .or(`father_id.eq.${parentId},mother_id.eq.${parentId}`);
  if (error) throw error;
  return data || [];
}

// === 사진 자동 압축 ===
// 폰 원본(3~5MB)을 업로드 직전 1600px / JPEG 82% 로 리사이즈
// → 보통 300~700KB 로 줄어듦 (Storage 1GB 한도가 3000~5000장으로 늘어남)
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) return file; // 이미지 아니면 그대로
  if (file.size < 300 * 1024) return file;          // 이미 작으면 그대로

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], baseName + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch (err) {
    // HEIC 등 브라우저가 못 읽는 포맷은 원본 그대로 (Supabase는 받음)
    console.warn('compress skipped:', err.message);
    return file;
  }
}

// === 사진 업로드 ===
// path 규칙: <user_id>/<timestamp>-<filename>
// RLS 정책이 첫 번째 폴더가 본인 user_id 인지 확인
export async function uploadPhoto(file) {
  const user = (await sb.auth.getUser()).data.user;
  if (!user) throw new Error('로그인 필요');

  const optimized = await compressImage(file);
  const safeName = optimized.name.replace(/[^\w.\-가-힣]/g, '_');
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, optimized, {
    cacheControl: '31536000',
    upsert: false,
    contentType: optimized.type
  });
  if (error) throw error;
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function uploadPhotos(files) {
  const urls = [];
  for (const f of files) {
    urls.push(await uploadPhoto(f));
  }
  return urls;
}

// 폼 데이터 → DB payload 정규화
export function formToPayload(form) {
  const fd = new FormData(form);
  const get = (k) => {
    const v = fd.get(k);
    return v === null || v === '' ? null : v;
  };
  const morphsRaw = (get('morphs') || '').toString();
  return {
    name: get('name'),
    management_no: get('management_no'),
    category: get('category') || '미구분',
    hatch_date: get('hatch_date'),
    weight_g: get('weight_g') ? Number(get('weight_g')) : null,
    morphs: morphsRaw ? morphsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    grade: get('grade'),
    sale_status: get('sale_status') || '보유(브리딩)',
    sale_price: get('sale_price') ? Number(get('sale_price')) : null,
    father_id: get('father_id'),
    mother_id: get('mother_id'),
    notes: get('notes')
  };
}
