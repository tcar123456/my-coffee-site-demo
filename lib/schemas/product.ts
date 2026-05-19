// Phase 5b — 商品 CRUD 共用 zod schema（client form + server action 雙端）
// slug 規範：小寫英數 + 連字號；DB unique 由 schema 守住，這裡只做格式驗證。

import { z } from "zod";
import { RoastLevel } from "@/generated/prisma/enums";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "商品名稱至少 2 字").max(60, "商品名稱最多 60 字"),
  slug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 字")
    .max(80)
    .regex(SLUG_PATTERN, "slug 只允許小寫英數 + 連字號（例：panama-geisha-red）"),
  origin: z.string().trim().min(2, "請輸入產地").max(60),
  roastLevel: z.enum(
    Object.values(RoastLevel) as [string, ...string[]],
    { error: "請選擇烘焙度" },
  ),
  processingMethod: z.string().trim().min(2, "請輸入處理法").max(40),
  flavorNotes: z.string().trim().min(2, "請輸入風味描述").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.number().int("價格須為整數").min(0, "價格不可為負").max(99_999),
  weightGram: z.number().int("克重須為整數").min(50).max(5000),
  stock: z.number().int("庫存須為整數").min(0).max(99_999),
  badge: z.string().trim().max(20).optional().or(z.literal("")),
  coverVariant: z.number().int().min(1).max(5).nullable().optional(),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;

// slugify：把商品名稱粗略轉成 slug（賣家可手動覆蓋）
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 移除標點
    .replace(/\s+/g, "-")       // 空白變連字號
    .replace(/-+/g, "-")        // 連續連字號收斂
    .replace(/^-|-$/g, "");     // 去頭尾連字號
}
