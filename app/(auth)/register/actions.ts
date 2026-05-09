"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const schema = z
  .object({
    email: z.string().email("請輸入有效的電子信箱。"),
    password: z.string().min(8, "密碼至少需要 8 個字元。"),
    confirmPassword: z.string(),
    name: z.string().trim().max(40).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "兩次輸入的密碼不一致。",
    path: ["confirmPassword"],
  });

export type RegisterState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword" | "name", string>>;
};

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    name: formData.get("name") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: RegisterState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<RegisterState["fieldErrors"]>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "此電子信箱已被使用。" } };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: name ?? null,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/account",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "註冊成功，但自動登入失敗，請手動登入。" };
    }
    throw error;
  }
}
