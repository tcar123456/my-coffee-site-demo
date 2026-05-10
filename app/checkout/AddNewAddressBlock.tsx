"use client";

// Phase 3b — 結帳 step 1 「新增地址」inline 區塊
// 包裝 AddressForm，呼叫 createAddress server action，成功後跳到 step 2。
// cancelHref 由父層 (server component) 傳入；這個 island 自己用 router 跳轉。

import { useRouter } from "next/navigation";
import { AddressForm } from "@/components/AddressForm";
import { createAddress } from "@/app/actions/address";
import type { AddressFormValues } from "@/lib/schemas/address";

export function AddNewAddressBlock({
  cancelHref,
}: {
  cancelHref?: string;
}) {
  const router = useRouter();

  async function handleSubmit(values: AddressFormValues) {
    const result = await createAddress(values);
    if (result.ok) {
      router.push(`/checkout/shipping?addressId=${result.addressId}`);
      router.refresh();
      return { ok: true as const };
    }
    return {
      ok: false as const,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  const handleCancel = cancelHref
    ? () => {
        router.push(cancelHref);
      }
    : undefined;

  return (
    <div className="border border-border bg-surface p-[clamp(20px,3vw,32px)]">
      <div className="mb-6 border-b border-border pb-4">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
          新增收件地址
        </div>
        <h3 className="mt-2 font-serif text-[22px] leading-[1.2]">
          填寫收件資訊
        </h3>
      </div>
      <AddressForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="儲存並繼續"
        showDefaultToggle
      />
    </div>
  );
}
