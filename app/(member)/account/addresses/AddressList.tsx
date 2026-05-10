"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  listAddresses,
} from "@/app/actions/address";
import { AddressForm } from "@/components/AddressForm";
import { AddressFormDialog } from "./AddressFormDialog";

type AddressRow = Awaited<ReturnType<typeof listAddresses>>[number];

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; address: AddressRow };

export function AddressList({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const closeDialog = () => setDialog({ mode: "closed" });

  const handleSuccess = () => {
    closeDialog();
    router.refresh();
  };

  const handleDelete = (a: AddressRow) => {
    if (a.isDefault) return;
    if (!confirm(`確定刪除「${a.recipient}」的地址？`)) return;
    setActionError(null);
    setPendingId(a.id);
    startTransition(async () => {
      const result = await deleteAddress(a.id);
      setPendingId(null);
      if (!result.ok) setActionError(result.error);
      router.refresh();
    });
  };

  const handleSetDefault = (a: AddressRow) => {
    setActionError(null);
    setPendingId(a.id);
    startTransition(async () => {
      const result = await setDefaultAddress(a.id);
      setPendingId(null);
      if (!result.ok) setActionError(result.error);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <h2 className="font-serif text-[22px]">已儲存的地址</h2>
        {addresses.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setDialog({ mode: "create" });
            }}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] uppercase text-fg transition-colors duration-150 hover:border-accent hover:text-accent"
          >
            + 新增地址
          </button>
        )}
      </div>

      {actionError && (
        <div className="mb-6 border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-[12px] text-danger">
          {actionError}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="border border-border bg-surface p-[clamp(20px,3vw,32px)]">
          <div className="mb-6 border-b border-border pb-4">
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent">
              尚未新增收件地址
            </div>
            <h3 className="mt-2 font-serif text-[22px] leading-[1.2]">
              新增第一筆地址
            </h3>
            <p className="mt-2 font-mono text-[12px] text-muted">
              僅支援台灣本島出貨，離島（金門 / 澎湖 / 連江）暫不支援。
            </p>
          </div>
          <AddressForm
            submitLabel="新增地址"
            onSubmit={async (values) => {
              const result = await createAddress(values);
              if (result.ok) {
                router.refresh();
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
      ) : (
        <div className="grid grid-cols-2 gap-5 max-[600px]:grid-cols-1">
          {addresses.map((a) => {
            const busy = isPending && pendingId === a.id;
            return (
              <div
                key={a.id}
                className={`flex flex-col gap-1.5 border p-[22px] ${
                  a.isDefault
                    ? "border-accent-tint bg-surface-2"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-1.5">
                  <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-accent">
                    {a.isDefault ? "預設地址" : "其他地址"}
                  </span>
                </div>
                <div className="font-serif text-[18px]">{a.recipient}</div>
                <div className="text-[13px] text-fg-2">
                  <span className="block">
                    {a.zipCode} {a.city} {a.district}
                  </span>
                  <span className="block">{a.street}</span>
                </div>
                <div className="mt-2 font-mono text-[12px] text-muted">
                  {a.phone}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActionError(null);
                      setDialog({ mode: "edit", address: a });
                    }}
                    disabled={busy}
                    className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent disabled:opacity-50"
                  >
                    編輯 →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    disabled={busy || a.isDefault}
                    title={a.isDefault ? "請先把另一筆設為預設" : undefined}
                    className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
                  >
                    刪除
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(a)}
                      disabled={busy}
                      className="ml-auto font-mono text-[11px] tracking-[0.14em] uppercase text-muted transition-colors hover:text-accent disabled:opacity-50"
                    >
                      {busy ? "處理中…" : "設為預設"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialog.mode === "create" && (
        <AddressFormDialog
          mode="create"
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      )}
      {dialog.mode === "edit" && (
        <AddressFormDialog
          mode="edit"
          address={dialog.address}
          onClose={closeDialog}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
