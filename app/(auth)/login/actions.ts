"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/account";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "電子信箱或密碼錯誤。" };
      }
      return { error: "登入失敗，請稍後再試。" };
    }
    // NEXT_REDIRECT 等 Next.js 內部錯誤必須 rethrow
    throw error;
  }
}
