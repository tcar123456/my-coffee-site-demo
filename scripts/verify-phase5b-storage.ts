// Phase 5b Storage 端對端 smoke test
// 真實打 Supabase Storage：上傳 1×1 PNG → 拿 publicUrl → fetch 確認 200 → delete → fetch 確認 404
// 這條測試 ONLY 跑得起來代表：
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 正確
//   - product-images bucket 存在且 public
//   - service_role key 有 storage.write 權限
//   - 我們寫的 uploadProductImage / deleteProductImage / urlToStoragePath 邏輯都對

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  uploadProductImage,
  deleteProductImage,
  urlToStoragePath,
} from "../lib/supabase-storage";

let pass = 0;
let fail = 0;
function assert(label: string, cond: unknown, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

// 1×1 transparent PNG（base64 → Buffer）— 67 bytes，最小有效 PNG
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const TEST_PRODUCT_ID = "phase5b-storage-test";

async function main() {
  // 環境檢查
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\n[FATAL] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 未設定。");
    process.exit(1);
  }
  console.log(`\n[Phase 5b Storage e2e] target: ${process.env.SUPABASE_URL}`);

  // 把 base64 轉成 File 物件（Node 18+ 內建 File / Blob）
  const buf = Buffer.from(TINY_PNG_B64, "base64");
  const file = new File([buf], "tiny.png", { type: "image/png" });
  assert(`test fixture: 1×1 PNG file ${buf.length} bytes`, buf.length > 0 && buf.length < 200);

  // [1] upload
  console.log("\n[1] uploadProductImage");
  const upload = await uploadProductImage({ productId: TEST_PRODUCT_ID, file });
  assert("upload ok", upload.ok);
  if (!upload.ok) {
    console.error(`      reason: ${upload.error}`);
    process.exit(1);
  }
  assert("publicUrl 是 supabase.co 公開 URL", upload.publicUrl.includes("/storage/v1/object/public/product-images/"));
  assert("path 以 productId 開頭", upload.path.startsWith(`${TEST_PRODUCT_ID}/`));

  // [2] fetch publicUrl 應 200，body 是 PNG
  console.log("\n[2] fetch publicUrl");
  const res = await fetch(upload.publicUrl);
  assert("fetch 200", res.status === 200, `status=${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  assert(
    "下載 body bytes 與上傳一致",
    arrayBuf.byteLength === buf.length,
    `down=${arrayBuf.byteLength} up=${buf.length}`,
  );
  assert(
    "content-type 包含 image/png",
    res.headers.get("content-type")?.includes("image/png") ?? false,
  );

  // [3] urlToStoragePath round-trip
  console.log("\n[3] urlToStoragePath round-trip");
  const recoveredPath = urlToStoragePath(upload.publicUrl);
  assert("URL → path 對得回去", recoveredPath === upload.path);

  // [4] MIME 擋下：JSON 不該允許上傳
  console.log("\n[4] MIME 防呆");
  const jsonBlob = new File([Buffer.from('{"x":1}')], "fake.json", { type: "application/json" });
  const bad = await uploadProductImage({ productId: TEST_PRODUCT_ID, file: jsonBlob });
  assert("application/json 被擋下", !bad.ok && bad.error.includes("不支援的格式"));

  // [5] delete
  console.log("\n[5] deleteProductImage");
  const del = await deleteProductImage(upload.path);
  assert("delete ok", del.ok);
  if (!del.ok) console.error(`      reason: ${del.error}`);

  // [6] fetch deleted URL 應該不 200
  // 必須加 cache-busting query string —— Supabase public endpoint 走 CDN，
  // 同一 URL 剛 fetch 過會 hit edge cache，即使底層 storage 已刪仍回舊內容。
  // 加 ?ts=<now> 視為新 URL → 繞 CDN → 打 origin → 找不到檔案 → 400/404
  console.log("\n[6] 刪除後 fetch 應失敗（cache-busting）");
  const resGone = await fetch(`${upload.publicUrl}?ts=${Date.now()}`);
  assert("刪除後 fetch 非 200", resGone.status !== 200, `status=${resGone.status}`);

  console.log(`\n─────────────────────────────────────`);
  console.log(`Phase 5b Storage e2e：${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error("\n[FATAL]", e);
  process.exit(1);
});
