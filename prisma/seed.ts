import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoastLevel } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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
  },
];

async function main() {
  console.log("Seeding products...");
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
    console.log(`  ✓ ${p.slug}`);
  }
  console.log(`Done. ${products.length} products seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
