// Phase 5b DB-level smoke test
// 涵蓋：
//   [A] zod schema + slugifyName pure helpers
//   [B] Product CRUD DB 邏輯（重現 server action，繞 auth gate）
//   [C] ProductImage CRUD DB 邏輯（sortOrder 自動遞增、reorder、delete）
//   [D] urlToStoragePath pure helper
//
// 不涵蓋（需手動 dev server 驗）：
//   - 實際 Supabase Storage upload / delete（要 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 真實 round-trip）
//   - react-hook-form UI 互動

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { productFormSchema, slugifyName } from "../lib/schemas/product";
import { urlToStoragePath } from "../lib/supabase-paths";
import { RoastLevel } from "../generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

// ============ [A] zod schema + slugifyName ============

function testSchema() {
  console.log("\n[A] productFormSchema + slugifyName pure");

  // slugifyName
  assert("slugifyName('Panama Geisha Red') === 'panama-geisha-red'",
    slugifyName("Panama Geisha Red") === "panama-geisha-red");
  assert("slugifyName('  Foo   Bar  ') === 'foo-bar'",
    slugifyName("  Foo   Bar  ") === "foo-bar");
  assert("slugifyName('Foo / Bar / Baz') 標點移除",
    slugifyName("Foo / Bar / Baz") === "foo-bar-baz");
  assert("slugifyName('----xyz----') 去頭尾 ===  'xyz'",
    slugifyName("----xyz----") === "xyz");

  const valid = {
    name: "Test Bean",
    slug: "test-bean",
    origin: "ETHIOPIA · 衣索比亞",
    roastLevel: RoastLevel.LIGHT,
    processingMethod: "水洗",
    flavorNotes: "花香 · 柑橘",
    description: "",
    price: 580,
    weightGram: 200,
    stock: 50,
    badge: "",
    coverVariant: null,
    isActive: true,
  };

  // happy path
  const r1 = productFormSchema.safeParse(valid);
  assert("valid payload safeParse success", r1.success);

  // slug 格式擋
  const r2 = productFormSchema.safeParse({ ...valid, slug: "Test_Bean!" });
  assert("slug 含大寫/底線/驚嘆號擋下", !r2.success);

  // name 太短
  const r3 = productFormSchema.safeParse({ ...valid, name: "A" });
  assert("name 1 字擋下", !r3.success);

  // price 負數
  const r4 = productFormSchema.safeParse({ ...valid, price: -1 });
  assert("price 負數擋下", !r4.success);

  // weightGram 範圍
  const r5 = productFormSchema.safeParse({ ...valid, weightGram: 49 });
  assert("weightGram < 50 擋下", !r5.success);
  const r6 = productFormSchema.safeParse({ ...valid, weightGram: 5001 });
  assert("weightGram > 5000 擋下", !r6.success);

  // roastLevel 非法值
  const r7 = productFormSchema.safeParse({ ...valid, roastLevel: "DARKER" });
  assert("roastLevel 非 enum 值擋下", !r7.success);

  // coverVariant null OK
  const r8 = productFormSchema.safeParse({ ...valid, coverVariant: null });
  assert("coverVariant null 允許", r8.success);

  // coverVariant 越界
  const r9 = productFormSchema.safeParse({ ...valid, coverVariant: 6 });
  assert("coverVariant 6 擋下", !r9.success);
}

// ============ [D] urlToStoragePath pure helper ============

function testUrlHelper() {
  console.log("\n[D] urlToStoragePath pure");

  const supabaseUrl =
    "https://abc.supabase.co/storage/v1/object/public/product-images/prod-1/1234-xyz.jpg";
  assert(
    "公開 URL 解出 productId/filename",
    urlToStoragePath(supabaseUrl) === "prod-1/1234-xyz.jpg",
  );

  const otherUrl = "https://example.com/image.jpg";
  assert("非 supabase URL 回 null", urlToStoragePath(otherUrl) === null);

  const supabaseWrongBucket =
    "https://abc.supabase.co/storage/v1/object/public/other-bucket/foo.jpg";
  assert(
    "其他 bucket 名稱回 null",
    urlToStoragePath(supabaseWrongBucket) === null,
  );
}

// ============ [B] Product CRUD DB ============

const TEST_SLUG_PREFIX = "phase5b-test-";

async function cleanupTestProducts() {
  await prisma.productImage.deleteMany({
    where: { product: { slug: { startsWith: TEST_SLUG_PREFIX } } },
  });
  await prisma.product.deleteMany({
    where: { slug: { startsWith: TEST_SLUG_PREFIX } },
  });
}

async function testProductCrud() {
  console.log("\n[B] Product CRUD DB");
  await cleanupTestProducts();

  // create
  const created = await prisma.product.create({
    data: {
      name: "Phase 5b Test Bean",
      slug: `${TEST_SLUG_PREFIX}alpha`,
      origin: "TEST",
      roastLevel: RoastLevel.LIGHT,
      processingMethod: "水洗",
      flavorNotes: "test",
      price: 500,
      weightGram: 200,
      stock: 10,
      isActive: true,
    },
  });
  assert("[B1] create 回傳 id", !!created.id);
  assert("[B1] create slug 寫入", created.slug === `${TEST_SLUG_PREFIX}alpha`);

  // unique slug 衝突
  let dupErrored = false;
  try {
    await prisma.product.create({
      data: {
        name: "Dup",
        slug: `${TEST_SLUG_PREFIX}alpha`,
        origin: "TEST",
        roastLevel: RoastLevel.LIGHT,
        processingMethod: "水洗",
        flavorNotes: "test",
        price: 500,
        weightGram: 200,
        stock: 10,
        isActive: true,
      },
    });
  } catch {
    dupErrored = true;
  }
  assert("[B2] 重複 slug 觸發 P2002", dupErrored);

  // update
  await prisma.product.update({
    where: { id: created.id },
    data: { name: "Updated Name", price: 620 },
  });
  const updated = await prisma.product.findUnique({ where: { id: created.id } });
  assert("[B3] update name 生效", updated?.name === "Updated Name");
  assert("[B3] update price 生效", updated?.price === 620);

  // toggle active
  await prisma.product.update({
    where: { id: created.id },
    data: { isActive: !created.isActive },
  });
  const toggled = await prisma.product.findUnique({ where: { id: created.id } });
  assert("[B4] toggleActive 反轉", toggled?.isActive === false);

  // delete with no order/cart references — should succeed
  await prisma.product.delete({ where: { id: created.id } });
  const afterDelete = await prisma.product.findUnique({ where: { id: created.id } });
  assert("[B5] 無 order ref 可硬刪", afterDelete === null);

  // delete blocked by OrderItem（用 seed 商品 + 既有訂單）
  const seedProduct = await prisma.product.findFirst({
    where: { orderItems: { some: {} } },
    select: { id: true, _count: { select: { orderItems: true } } },
  });
  if (seedProduct) {
    let blocked = false;
    try {
      await prisma.product.delete({ where: { id: seedProduct.id } });
    } catch {
      blocked = true; // onDelete: Restrict 應 throw
    }
    assert("[B6] 有 OrderItem ref 的商品 delete 被擋下", blocked);
  } else {
    assert("[B6] skip — 沒有商品有 OrderItem ref（環境差異）", true);
  }
}

// ============ [C] ProductImage CRUD DB ============

async function testProductImageCrud() {
  console.log("\n[C] ProductImage CRUD DB");

  // 建一個測試 product 給 image 用
  const product = await prisma.product.create({
    data: {
      name: "Phase 5b Image Test",
      slug: `${TEST_SLUG_PREFIX}image`,
      origin: "TEST",
      roastLevel: RoastLevel.LIGHT,
      processingMethod: "水洗",
      flavorNotes: "test",
      price: 500,
      weightGram: 200,
      stock: 10,
      isActive: true,
    },
  });

  // 新增 image 1 + 2 + 3，每個 sortOrder 自動 +1（仿 server action 邏輯）
  async function addImage(label: string) {
    const maxRow = await prisma.productImage.findFirst({
      where: { productId: product.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const next = (maxRow?.sortOrder ?? -1) + 1;
    return prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://test.local/${label}.jpg`,
        alt: label,
        sortOrder: next,
      },
    });
  }

  const img1 = await addImage("one");
  const img2 = await addImage("two");
  const img3 = await addImage("three");
  assert("[C1] image1 sortOrder=0", img1.sortOrder === 0);
  assert("[C1] image2 sortOrder=1", img2.sortOrder === 1);
  assert("[C1] image3 sortOrder=2", img3.sortOrder === 2);

  // reorder：[1,2,3] → [3,1,2]
  const reorderedIds = [img3.id, img1.id, img2.id];
  await prisma.$transaction(
    reorderedIds.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  const after = await prisma.productImage.findMany({
    where: { productId: product.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, alt: true },
  });
  assert("[C2] reorder 後第 0 個是 three", after[0]?.alt === "three");
  assert("[C2] reorder 後第 1 個是 one", after[1]?.alt === "one");
  assert("[C2] reorder 後第 2 個是 two", after[2]?.alt === "two");

  // delete 中間一張，剩兩張
  await prisma.productImage.delete({ where: { id: img1.id } });
  const afterDelete = await prisma.productImage.findMany({
    where: { productId: product.id },
  });
  assert("[C3] 刪 image1 後剩 2 張", afterDelete.length === 2);

  // delete product 應 cascade delete 剩餘 images
  await prisma.product.delete({ where: { id: product.id } });
  const afterCascade = await prisma.productImage.findMany({
    where: { productId: product.id },
  });
  assert("[C4] 刪 product cascade 刪 image", afterCascade.length === 0);
}

async function main() {
  testSchema();
  testUrlHelper();
  await testProductCrud();
  await testProductImageCrud();
  await cleanupTestProducts();

  console.log(`\n─────────────────────────────────────`);
  console.log(`Phase 5b 驗收（DB-level）：${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("\n[FATAL]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
