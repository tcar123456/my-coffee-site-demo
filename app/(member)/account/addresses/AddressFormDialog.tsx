"use client";

import { useEffect, useRef } from "react";
import { AddressForm } from "@/components/AddressForm";
import { createAddress, updateAddress, listAddresses } from "@/app/actions/address";
import { useFocusTrap } from "@/lib/use-focus-trap";

type AddressRow = Awaited<ReturnType<typeof listAddresses>>[number];

type Props =
  | {
      mode: "create";
      address?: undefined;
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      mode: "edit";
      address: AddressRow;
      onClose: () => void;
      onSuccess: () => void;
    };

export function AddressFormDialog(props: Props) {
  const { mode, onClose, onSuccess } = props;
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const title = mode === "create" ? "新增地址" : "編輯地址";

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(8%_0.005_250_/_0.78)] backdrop-blur-[2px] px-[var(--gutter)] py-[clamp(40px,8vh,96px)]"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[640px] border border-border bg-surface"
      >
        <div className="flex items-center justify-between border-b border-border px-7 py-[18px]">
          <h3 className="text-[22px]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="font-mono text-[14px] text-muted transition-colors hover:text-accent"
          >
            ✕
          </button>
        </div>
        <div className="px-7 py-7">
          <AddressForm
            defaultValues={
              mode === "edit"
                ? {
                    recipient: props.address.recipient,
                    phone: props.address.phone,
                    zipCode: props.address.zipCode,
                    city: props.address.city,
                    district: props.address.district,
                    street: props.address.street,
                    isDefault: props.address.isDefault,
                  }
                : undefined
            }
            submitLabel={mode === "create" ? "新增地址" : "儲存變更"}
            onCancel={onClose}
            onSubmit={async (values) => {
              const result =
                mode === "create"
                  ? await createAddress(values)
                  : await updateAddress(props.address.id, values);
              if (result.ok) {
                onSuccess();
                return { ok: true as const };
              }
              return {
                ok: false as const,
                error: result.error,
                fieldErrors: result.fieldErrors,
              };
            }}
          />
        </div>
      </div>
    </div>
  );
}
