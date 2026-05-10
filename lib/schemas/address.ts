// 共用 zod schema：client form validation + server action 雙端用同一份。

import { z } from "zod";
import { isOffshoreZip, isValidTaiwanZip } from "@/lib/address-validation";

export const addressFormSchema = z.object({
  recipient: z.string().trim().min(2, "請輸入收件人姓名").max(40),
  phone: z
    .string()
    .trim()
    .regex(/^09\d{8}$/, "請輸入有效的台灣手機號碼（09 開頭共 10 碼）"),
  zipCode: z
    .string()
    .trim()
    .refine(isValidTaiwanZip, "請輸入有效的郵遞區號")
    .refine((v) => !isOffshoreZip(v), "目前不支援離島出貨（金門 / 澎湖 / 連江）"),
  city: z.string().trim().min(2, "請選擇縣市").max(20),
  district: z.string().trim().min(2, "請輸入鄉鎮市區").max(20),
  street: z.string().trim().min(4, "請輸入詳細地址").max(120),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;
export type AddressFormInput = z.input<typeof addressFormSchema>;
