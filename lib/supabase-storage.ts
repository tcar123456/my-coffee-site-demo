// Phase 5b — Supabase Storage server-only helper
// 用 service_role key 上傳 / 刪除（繞 RLS）。Public bucket 所以前台直接用 URL 載圖。
//
// 環境變數：
//   SUPABASE_URL                  — Project URL（不公開亦可）
//   SUPABASE_SERVICE_ROLE_KEY     — service_role secret，server-only，絕不暴露到 client
//
// bucket 設定（在 Supabase Dashboard 手動建立）：
//   name: product-images
//   public: true
//   file size limit: 5 MB
//   allowed MIME: image/jpeg, image/png, image/webp

// 註：原本有 `import "server-only"`，但它在 raw node（smoke test）會 throw。
// 改靠 service_role key 沒有 NEXT_PUBLIC_ 前綴的事實——若 client 端誤 import，
// process.env.SUPABASE_SERVICE_ROLE_KEY 會是 undefined，getClient() 就 throw。
// 雖然不如 server-only 早炸，仍能擋住 service_role key 流出 client bundle。
import { createClient } from "@supabase/supabase-js";

export { urlToStoragePath } from "./supabase-paths";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

type AllowedMime = (typeof ALLOWED_MIME)[number];

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定。請在 .env.local 加上這兩個值。",
    );
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export type UploadResult =
  | { ok: true; path: string; publicUrl: string }
  | { ok: false; error: string };

/**
 * 把 File 物件上傳到 product-images bucket。
 * path 格式：`<productId>/<timestamp>-<rand>.<ext>` — 用 productId 分資料夾，方便日後 batch delete。
 */
export async function uploadProductImage(opts: {
  productId: string;
  file: File;
}): Promise<UploadResult> {
  const { productId, file } = opts;
  if (!isAllowedMime(file.type)) {
    return { ok: false, error: `不支援的格式 ${file.type}，僅接受 JPEG / PNG / WebP。` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `檔案太大（${(file.size / 1024 / 1024).toFixed(1)} MB），上限 5 MB。` };
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${productId}/${Date.now()}-${rand}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      cacheControl: "31536000", // 1 yr — 檔名含 timestamp + rand，更新時換新 path 即可
      upsert: false,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}

/**
 * 從 Storage 刪除單張圖（path 是上傳時 ProductImage.url 反推出的 path，或者直接存 path 也行）。
 * 這裡接 path 而非完整 URL，因為 supabase-js 的 remove API 只認 path。
 */
export async function deleteProductImage(path: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * 批次刪除某個 product 底下所有圖（用於 deleteProduct）。
 */
export async function deleteAllProductImages(productId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getClient();
  // 列出該 productId 資料夾下所有檔案
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(productId);
  if (listError) return { ok: false, error: listError.message };
  if (!files || files.length === 0) return { ok: true };

  const paths = files.map((f) => `${productId}/${f.name}`);
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
  if (removeError) return { ok: false, error: removeError.message };
  return { ok: true };
}
