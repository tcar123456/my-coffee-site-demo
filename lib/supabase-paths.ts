// Phase 5b — Supabase Storage path 純函式（不需要 server-only）
// 抽出來讓 smoke test / 純邏輯模組可 import，不會撞 'server-only' 限制。

const BUCKET = "product-images";

/**
 * 把存在 DB 的 ProductImage.url（完整 URL）轉回 storage path。
 * 公開 URL 格式：https://<project>.supabase.co/storage/v1/object/public/product-images/<path>
 */
export function urlToStoragePath(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
