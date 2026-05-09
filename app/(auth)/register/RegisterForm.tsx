"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="稱呼（選填）" htmlFor="name" hint={state.fieldErrors?.name}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={40}
          className="w-full border border-border bg-surface px-4 py-3 font-mono text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none"
          placeholder="余先生"
        />
      </Field>

      <Field label="電子信箱" htmlFor="email" hint={state.fieldErrors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-border bg-surface px-4 py-3 font-mono text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none"
          placeholder="you@coffee.local"
        />
      </Field>

      <Field label="密碼" htmlFor="password" hint={state.fieldErrors?.password ?? "至少 8 個字元"}>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full border border-border bg-surface px-4 py-3 font-mono text-[13px] text-fg placeholder:text-dim focus:border-accent focus:outline-none"
          placeholder="••••••••"
        />
      </Field>

      <Field
        label="確認密碼"
        htmlFor="confirmPassword"
        hint={state.fieldErrors?.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {isPending ? "建立中…" : "建立帳戶 →"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const isError = !!hint && !hint.startsWith("至少");
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {label}
      </span>
      {children}
      {hint && (
        <span
          className={`font-mono text-[11px] ${
            isError ? "text-[oklch(75%_0.12_25)]" : "text-muted"
          }`}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
