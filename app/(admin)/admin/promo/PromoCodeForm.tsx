"use client";

// Phase 5c — 優惠碼表單（client）
// 同 ProductForm 模式：react-hook-form + zod；create / edit 用 discriminated union 切換。
// 折扣值 label 依 discountType 動態切換（X % off vs NT$ X off）。
// datetime-local 與 nullable：用 string state，submit 前 preprocess 轉 Date 或 null。

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  type UseFormRegister,
  type FieldError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  promoCodeFormSchema,
  type PromoCodeFormInput,
} from "@/lib/schemas/promo-code";
import {
  createPromoCode,
  updatePromoCode,
} from "@/app/actions/admin-promo";

type PromoCodeFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      promoId: string;
      initialValues: PromoCodeFormInput;
    };

const CREATE_DEFAULTS: PromoCodeFormInput = {
  code: "",
  description: "",
  discountType: "PERCENT",
  discountValue: 10,
  minSubtotal: 0,
  maxUses: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function PromoCodeForm(props: PromoCodeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rootError, setRootError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const defaultValues =
    props.mode === "edit" ? props.initialValues : CREATE_DEFAULTS;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromoCodeFormInput>({
    resolver: zodResolver(promoCodeFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const discountType = watch("discountType");

  const onSubmit = (values: PromoCodeFormInput) => {
    setRootError(null);
    startTransition(async () => {
      // zod preprocess 會把 string → Date / null，這裡靠 schema parse 出 final values
      const parsed = promoCodeFormSchema.safeParse(values);
      if (!parsed.success) {
        setRootError(parsed.error.issues[0]?.message ?? "輸入資料有誤");
        return;
      }
      if (props.mode === "create") {
        const result = await createPromoCode(parsed.data);
        if (result.ok) {
          router.push(`/admin/promo/${result.id}/edit`);
        } else {
          setRootError(result.error);
        }
      } else {
        const result = await updatePromoCode(props.promoId, parsed.data);
        if (result.ok) {
          setSavedAt(Date.now());
          router.refresh();
        } else {
          setRootError(result.error);
        }
      }
    });
  };

  const disabled = isPending || isSubmitting;
  const submitLabel = props.mode === "create" ? "建立優惠碼" : "儲存變更";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="border border-border bg-surface"
    >
      <div className="grid gap-8 px-7 py-7">
        <FieldGroup title="基本資訊">
          <Field
            label="優惠碼"
            name="code"
            error={errors.code as FieldError | undefined}
            register={register("code", {
              setValueAs: (v) =>
                typeof v === "string" ? v.toUpperCase().trim() : v,
            })}
            placeholder="SUMMER15"
            wrapperClassName="col-span-2 max-[600px]:col-span-1"
          />
          <Field
            label="說明（選填，賣家備註）"
            name="description"
            error={errors.description as FieldError | undefined}
            register={register("description")}
            placeholder="夏季新客 9 折，限首次下單"
            wrapperClassName="col-span-2 max-[600px]:col-span-1"
          />
        </FieldGroup>

        <FieldGroup title="折扣設定">
          <SelectField
            label="折扣類型"
            name="discountType"
            error={errors.discountType as FieldError | undefined}
            register={register("discountType")}
          >
            <option value="PERCENT">百分比折扣（% off）</option>
            <option value="FIXED">固定金額折抵（NT$ off）</option>
          </SelectField>
          <Field
            label={
              discountType === "PERCENT"
                ? "折扣百分比（1–100）"
                : "折扣金額（NT$）"
            }
            name="discountValue"
            type="number"
            error={errors.discountValue as FieldError | undefined}
            register={register("discountValue", { valueAsNumber: true })}
            placeholder={discountType === "PERCENT" ? "15" : "150"}
          />
          <Field
            label="最低消費門檻（NT$，0 = 無限制）"
            name="minSubtotal"
            type="number"
            error={errors.minSubtotal as FieldError | undefined}
            register={register("minSubtotal", { valueAsNumber: true })}
            placeholder="0"
          />
          <Field
            label="使用次數上限（空白 = 無上限）"
            name="maxUses"
            type="number"
            error={errors.maxUses as FieldError | undefined}
            register={register("maxUses", {
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? "" : Number(v),
            })}
            placeholder="100"
          />
        </FieldGroup>

        <FieldGroup title="有效時間（兩欄空白 = 永久有效）">
          <Field
            label="開始時間"
            name="startsAt"
            type="datetime-local"
            error={errors.startsAt as FieldError | undefined}
            register={register("startsAt")}
          />
          <Field
            label="結束時間"
            name="endsAt"
            type="datetime-local"
            error={errors.endsAt as FieldError | undefined}
            register={register("endsAt")}
          />
        </FieldGroup>

        <FieldGroup title="狀態">
          <label className="col-span-2 flex items-center gap-2.5 font-mono text-[12px] tracking-[0.06em] text-fg-2">
            <input
              type="checkbox"
              {...register("isActive")}
              className="size-4 accent-accent"
            />
            啟用此優惠碼（uncheck = 停用，前台與兌換邏輯都會擋下）
          </label>
        </FieldGroup>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-2 px-7 py-5">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi disabled:opacity-50"
        >
          {disabled ? "處理中…" : submitLabel}
        </button>
        {savedAt && (
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-success">
            ✓ 已儲存
          </span>
        )}
        {rootError && (
          <span className="font-mono text-[11px] tracking-[0.04em] text-danger">
            ✗ {rootError}
          </span>
        )}
      </div>
    </form>
  );
}

/* ============ helpers ============ */

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <h3 className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 max-[600px]:grid-cols-1">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  register,
  placeholder,
  wrapperClassName,
}: {
  label: string;
  name: string;
  type?: "text" | "number" | "datetime-local";
  error?: FieldError;
  register: ReturnType<UseFormRegister<PromoCodeFormInput>>;
  placeholder?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName ?? ""}`}>
      <label
        htmlFor={name}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted"
      >
        {label}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register}
        className={`border bg-bg px-3.5 py-3 font-sans text-[14px] text-fg placeholder:text-dim focus:outline-none ${
          error ? "border-danger focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {error?.message && (
        <span className="font-mono text-[11px] text-danger">{error.message}</span>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  error,
  register,
  children,
}: {
  label: string;
  name: string;
  error?: FieldError;
  register: ReturnType<UseFormRegister<PromoCodeFormInput>>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted"
      >
        {label}
      </label>
      <select
        id={name}
        {...register}
        className={`border bg-bg px-3.5 py-3 font-sans text-[14px] text-fg focus:outline-none ${
          error ? "border-danger focus:border-danger" : "border-border focus:border-accent"
        }`}
      >
        {children}
      </select>
      {error?.message && (
        <span className="font-mono text-[11px] text-danger">{error.message}</span>
      )}
    </div>
  );
}
