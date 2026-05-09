"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

      <Field label="電子信箱" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="w-full border border-border bg-surface px-4 py-3 font-mono text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none"
          placeholder="you@coffee.local"
        />
      </Field>

      <Field label="密碼" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-border bg-surface px-4 py-3 font-mono text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none"
          placeholder="••••••••"
        />
      </Field>

      {state.error && (
        <div
          role="alert"
          className="border border-[oklch(45%_0.12_25)] bg-[oklch(20%_0.04_25)] px-4 py-3 font-mono text-[12px] text-[oklch(75%_0.12_25)]"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 border border-accent bg-accent px-5 py-3.5 font-mono text-[12px] tracking-[0.16em] uppercase text-bg transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "驗證中…" : "登入 →"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
