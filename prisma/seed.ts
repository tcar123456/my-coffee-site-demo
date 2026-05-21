import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  RoastLevel,
  Role,
  SubscriptionPlan,
  SubscriptionCadence,
  SubscriptionStatus,
  DiscountType,
} from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Phase 2 demo accounts — 作品集用，密碼明文寫在 README 是預期行為。
// 真實營運的 production seed 不應這樣做。
const demoUsers = [
  {
    email: "customer@coffee.local",
    name: "示範顧客",
    password: "Coffee123",
    role: Role.CUSTOMER,
  },
  {
    email: "seller@coffee.local",
    name: "示範賣家",
    password: "Seller123",
    role: Role.SELLER,
  },
];

// Phase 10b — seed product cover 改接 Unsplash hotlink（作品集 placeholder）。
// imageUrl + imageAlt 不會寫進 Product table（schema 沒這兩欄），會在 main() 內
// 額外 upsert 成一筆 ProductImage(sortOrder=0)，idempotent 用 url 比對。
const products = [
  {
    slug: "ethiopia-yirgacheffe-g1-kochere",
    name: "耶加雪菲 G1 科契爾 水洗",
    origin: "ETHIOPIA · 衣索比亞",
    roastLevel: RoastLevel.LIGHT,
    processingMethod: "水洗",
    flavorNotes: "「蕁麻草、佛手柑、白桃 — 喉韻如紅茶。」",
    price: 580,
    weightGram: 200,
    stock: 30,
    badge: "主理人推薦",
    coverVariant: null,
    imageUrl:
      "https://images.unsplash.com/photo-1597974909271-513c5d42290c?w=1200&q=80",
    imageAlt: "耶加雪菲 淺焙咖啡豆 — 衣索比亞",
  },
  {
    slug: "colombia-las-flores-anaerobic-72",
    name: "拉斯佛羅雷斯 厭氧 72hr",
    origin: "COLOMBIA · 哥倫比亞",
    roastLevel: RoastLevel.MEDIUM,
    processingMethod: "厭氧發酵",
    flavorNotes: "「蘭姆酒、葡萄乾、黑可可。」",
    price: 720,
    weightGram: 200,
    stock: 30,
    badge: null,
    coverVariant: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1597816792530-f6d57bd2bf9e?w=1200&q=80",
    imageAlt: "成熟的紅色咖啡櫻桃 — 哥倫比亞 Las Flores 厭氧發酵",
  },
  {
    slug: "panama-hacienda-esmeralda-geisha-red",
    name: "翡翠莊園 藝伎 紅標",
    origin: "PANAMA · 巴拿馬",
    roastLevel: RoastLevel.LIGHT,
    processingMethod: "水洗",
    flavorNotes: "「茉莉、蜂蜜、白色花卉。」",
    price: 1680,
    weightGram: 100,
    stock: 12,
    badge: "數量稀少",
    coverVariant: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1442550528053-c431ecb55509?w=1200&q=80",
    imageAlt: "翡翠莊園 藝伎 紅標 — 精品淺焙咖啡豆",
  },
  {
    slug: "kenya-nyeri-karirou-aa",
    name: "涅里 卡里魯 AA 水洗",
    origin: "KENYA · 肯亞",
    roastLevel: RoastLevel.MEDIUM_LIGHT,
    processingMethod: "水洗",
    flavorNotes: "「黑醋栗、番茄汁、葡萄柚 — 酸度明亮。」",
    price: 620,
    weightGram: 200,
    stock: 30,
    badge: null,
    coverVariant: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1772228616071-aa344913b93e?w=1200&q=80",
    imageAlt: "肯亞 Nyeri 莊園採收 — 一籃成熟咖啡櫻桃",
  },
  {
    slug: "guatemala-antigua-santa-catarina",
    name: "安提瓜 聖塔卡塔琳娜",
    origin: "GUATEMALA · 瓜地馬拉",
    roastLevel: RoastLevel.MEDIUM_DARK,
    processingMethod: "水洗",
    flavorNotes: "「巧克力、烤杏仁、橘皮 — 經典中深。」",
    price: 540,
    weightGram: 200,
    stock: 30,
    badge: null,
    coverVariant: null,
    imageUrl:
      "https://images.unsplash.com/photo-1554202572-58b92efb2be1?w=1200&q=80",
    imageAlt: "瓜地馬拉 Antigua 中深焙咖啡豆",
  },
  {
    slug: "yemen-mocha-haraz",
    name: "摩卡 哈拉茲 日曬",
    origin: "YEMEN · 葉門",
    roastLevel: RoastLevel.MEDIUM_DARK,
    processingMethod: "日曬",
    flavorNotes: "「紅酒、黑巧克力、煙燻木質。」",
    price: 980,
    weightGram: 200,
    stock: 18,
    badge: "職人選",
    coverVariant: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1743697566744-3b21076cc4cc?w=1200&q=80",
    imageAlt: "葉門 摩卡 哈拉茲 — 麻布袋日曬咖啡豆",
  },
  {
    slug: "indonesia-sulawesi-toraja",
    name: "蘇拉維西 托拉雅",
    origin: "INDONESIA · 印尼",
    roastLevel: RoastLevel.DARK,
    processingMethod: "濕剝法",
    flavorNotes: "「雪松、黑糖、菸草 — 厚實圓潤。」",
    price: 480,
    weightGram: 200,
    stock: 30,
    badge: null,
    coverVariant: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1672570050756-4f1953bde478?w=1200&q=80",
    imageAlt: "印尼 蘇拉維西 托拉雅 深焙咖啡豆",
  },
  {
    slug: "costa-rica-tarrazu-la-minita",
    name: "塔拉珠 拉米妮塔",
    origin: "COSTA RICA · 哥斯大黎加",
    roastLevel: RoastLevel.MEDIUM,
    processingMethod: "蜜處理",
    flavorNotes: "「焦糖、太妃糖、青蘋果尾韻。」",
    price: 560,
    weightGram: 200,
    stock: 0,
    badge: null,
    coverVariant: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1649780563985-ff945be65785?w=1200&q=80",
    imageAlt: "哥斯大黎加 塔拉珠 蜜處理咖啡豆",
  },
];

async function main() {
  console.log("Seeding products...");
  for (const p of products) {
    const { imageUrl, imageAlt, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: productData,
      create: productData,
      select: { id: true, slug: true },
    });

    // ProductImage idempotent — 用 url 比對，避免覆蓋 admin 後台真實上傳的圖。
    const existingCover = await prisma.productImage.findFirst({
      where: { productId: product.id, url: imageUrl },
      select: { id: true },
    });
    if (!existingCover) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imageUrl,
          alt: imageAlt,
          sortOrder: 0,
        },
      });
    }

    console.log(`  ✓ ${p.slug}${existingCover ? "" : " (+cover)"}`);
  }
  console.log(`Done. ${products.length} products seeded.`);

  console.log("Seeding demo users...");
  for (const u of demoUsers) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hashed },
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
      },
    });
    console.log(`  ✓ ${u.email} (${u.role})`);
  }
  console.log(`Done. ${demoUsers.length} demo users seeded.`);

  // Phase 4 — customer demo subscription + wishlist（冪等）
  console.log("Seeding demo subscription + wishlist for customer...");
  const customer = await prisma.user.findUnique({
    where: { email: "customer@coffee.local" },
    select: { id: true },
  });
  if (customer) {
    const subData = {
      plan: SubscriptionPlan.DUAL_BEANS_BIWEEKLY,
      cadence: SubscriptionCadence.BIWEEKLY,
      status: SubscriptionStatus.ACTIVE,
      nextShipAt: new Date("2026-05-15T00:00:00Z"),
      pricePerShipment: 1180,
      shipmentsDelivered: 9,
      totalShipments: 12,
    };
    const existing = await prisma.subscription.findFirst({
      where: {
        userId: customer.id,
        plan: SubscriptionPlan.DUAL_BEANS_BIWEEKLY,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: subData,
      });
      console.log(`  ✓ subscription updated (${existing.id})`);
    } else {
      const created = await prisma.subscription.create({
        data: { userId: customer.id, ...subData },
      });
      console.log(`  ✓ subscription created (${created.id})`);
    }

    const wishlistSlugs = [
      "panama-hacienda-esmeralda-geisha-red",
      "yemen-mocha-haraz",
    ];
    for (const slug of wishlistSlugs) {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!product) continue;
      await prisma.wishlistItem.upsert({
        where: {
          userId_productId: { userId: customer.id, productId: product.id },
        },
        update: {},
        create: { userId: customer.id, productId: product.id },
      });
      console.log(`  ✓ wishlist: ${slug}`);
    }
  }

  console.log("Seeding demo promo codes...");
  const demoPromos = [
    {
      code: "SUMMER15",
      description: "夏季新客 9 折，限首次下單",
      discountType: DiscountType.PERCENT,
      discountValue: 15,
      minSubtotal: 0,
      maxUses: 100,
      startsAt: null,
      endsAt: null,
      isActive: true,
    },
    {
      code: "FREESHIP200",
      description: "滿 NT$ 1,000 折運費 100，月配訂閱限定",
      discountType: DiscountType.FIXED,
      discountValue: 100,
      minSubtotal: 1_000,
      maxUses: null,
      startsAt: null,
      endsAt: null,
      isActive: true,
    },
  ];
  for (const p of demoPromos) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: {
        description: p.description,
        discountType: p.discountType,
        discountValue: p.discountValue,
        minSubtotal: p.minSubtotal,
        maxUses: p.maxUses,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        isActive: p.isActive,
      },
      create: p,
    });
    console.log(`  ✓ promo: ${p.code}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
