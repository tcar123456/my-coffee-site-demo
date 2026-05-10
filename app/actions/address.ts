"use server";

// Phase 3b — Address CRUD（會員中心、結帳 step 1 共用）
// 離島 zip 在 server side 再驗一次（client form 已有但不可信）。

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressFormSchema, type AddressFormInput } from "@/lib/schemas/address";

const addressInputSchema = addressFormSchema;
export type AddressInput = AddressFormInput;

export type AddressActionResult =
  | { ok: true; addressId: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof AddressInput, string>> };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

function flattenZodErrors(err: z.ZodError<AddressInput>): Partial<Record<keyof AddressInput, string>> {
  const out: Partial<Record<keyof AddressInput, string>> = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof AddressInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function listAddresses() {
  const userId = await requireUserId();
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(input: AddressInput): Promise<AddressActionResult> {
  const userId = await requireUserId();
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "請檢查表單欄位。",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const addressCount = await tx.address.count({ where: { userId } });
    return tx.address.create({
      data: {
        userId,
        recipient: data.recipient,
        phone: data.phone,
        zipCode: data.zipCode,
        city: data.city,
        district: data.district,
        street: data.street,
        isDefault: data.isDefault || addressCount === 0,
      },
    });
  });

  revalidatePath("/account");
  revalidatePath("/checkout/address");
  return { ok: true, addressId: created.id };
}

export async function updateAddress(
  addressId: string,
  input: AddressInput,
): Promise<AddressActionResult> {
  const userId = await requireUserId();
  const parsed = addressInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "請檢查表單欄位。",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return { ok: false, error: "找不到此地址。" };
  }

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }
    await tx.address.update({
      where: { id: addressId },
      data: {
        recipient: data.recipient,
        phone: data.phone,
        zipCode: data.zipCode,
        city: data.city,
        district: data.district,
        street: data.street,
        isDefault: data.isDefault,
      },
    });
  });

  revalidatePath("/account");
  revalidatePath("/checkout/address");
  return { ok: true, addressId };
}

export async function deleteAddress(addressId: string): Promise<AddressActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true, isDefault: true, _count: { select: { orders: true } } },
  });
  if (!existing || existing.userId !== userId) {
    return { ok: false, error: "找不到此地址。" };
  }
  if (existing._count.orders > 0) {
    return { ok: false, error: "此地址有歷史訂單，無法刪除。" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  revalidatePath("/account");
  revalidatePath("/checkout/address");
  return { ok: true, addressId };
}

export async function setDefaultAddress(addressId: string): Promise<AddressActionResult> {
  const userId = await requireUserId();
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return { ok: false, error: "找不到此地址。" };
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId, NOT: { id: addressId } },
      data: { isDefault: false },
    }),
    prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);

  revalidatePath("/account");
  revalidatePath("/checkout/address");
  return { ok: true, addressId };
}
