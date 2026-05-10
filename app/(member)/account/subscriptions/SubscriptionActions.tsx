"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "@/app/actions/subscription";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

export function SubscriptionActions({
  subscriptionId,
  status,
}: {
  subscriptionId: string;
  status: SubscriptionStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (
    fn: (id: string) => Promise<{ ok: boolean; error?: string }>,
    confirmMsg?: string,
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await fn(subscriptionId);
      if (!result.ok) setError(result.error ?? "操作失敗");
      router.refresh();
    });
  };

  if (status === "CANCELLED") {
    return (
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted">
        此方案已取消
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 max-[720px]:items-start">
      <div className="flex flex-wrap items-center gap-3">
        {status === "ACTIVE" && (
          <button
            type="button"
            onClick={() => run(pauseSubscription)}
            disabled={isPending}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-mono text-[11px] tracking-[0.16em] uppercase text-fg transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            暫停一期
          </button>
        )}
        {status === "PAUSED" && (
          <button
            type="button"
            onClick={() => run(resumeSubscription)}
            disabled={isPending}
            className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase text-bg transition-colors hover:border-accent-hi hover:bg-accent-hi disabled:opacity-50"
          >
            恢復配送
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            run(
              cancelSubscription,
              "取消後無法恢復，確定要取消這個訂閱方案嗎？",
            )
          }
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-mono text-[11px] tracking-[0.16em] uppercase text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
        >
          取消方案
        </button>
      </div>
      {error && (
        <span className="font-mono text-[11px] text-danger">{error}</span>
      )}
    </div>
  );
}
