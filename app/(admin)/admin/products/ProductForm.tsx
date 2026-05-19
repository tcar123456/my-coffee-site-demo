"use client";

// Phase 5b — 商品新增/編輯共用表單（client）
// react-hook-form + zod，mode 用 discriminated union 區分 create / edit。
// create 成功跳轉到 edit 頁讓賣家接著傳圖；edit 成功 router.refresh() + inline saved 提示 3 秒。

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productFormSchema,
  type ProductFormValues,
  slugifyName,
} from "@/lib/schemas/product";
import {
  createProduct,
  updateProduct,
} from "@/app/actions/admin-products";
import { RoastLevel } from "@/generated/prisma/enums";

const ROAST_OPTIONS: Array<{ value: RoastLevel; label: string }> = [
  { value: RoastLevel.LIGHT, label: "淺焙" },
  { value: RoastLevel.MEDIUM_LIGHT, label: "中淺" },
  { value: RoastLevel.MEDIUM, label: "中焙" },
  { value: RoastLevel.MEDIUM_DARK, label: "中深" },
  { value: RoastLevel.DARK, label: "深焙" },
];

const COVER_VARIANTS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "無 — 用真實圖片" },
  { value: 1, label: "Variant 1 · 暖橘" },
  { value: 2, label: "Variant 2 · 綠" },
  { value: 3, label: "Variant 3 · 紫" },
  { value: 4, label: "Variant 4 · 紅" },
  { value: 5, label: "Variant 5 · 藍" },
];

type ProductFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      initialValues: ProductFormValues;
      productId: string;
    };

const CREATE_DEFAULTS: ProductFormValues = {
  name: "",
  slug: "",
  origin: "",
  roastLevel: RoastLevel.MEDIUM,
  processingMethod: "",
  flavorNotes: "",
  description: "",
  price: 0,
  weightGram: 200,
  stock: 0,
  badge: "",
  coverVariant: null,
  isActive: true,
};

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rootError, setRootError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [slugifyHint, setSlugifyHint] = useState<string | null>(null);

  const defaultValues =
    props.mode === "edit" ? props.initialValues : CREATE_DEFAULTS;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  // saved indicator 3 秒淡出
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const onSubmit = (values: ProductFormValues) => {
    setRootError(null);
    startTransition(async () => {
      if (props.mode === "create") {
        const result = await createProduct(values);
        if (result.ok) {
          router.push(`/admin/products/${result.id}/edit`);
        } else {
          setRootError(result.error);
        }
      } else {
        const result = await updateProduct(props.productId, values);
        if (result.ok) {
          setSavedAt(Date.now());
          router.refresh();
        } else {
          setRootError(result.error);
        }
      }
    });
  };

  // 從名稱產生 slug。中文字會被 slugifyName 過濾掉，結果可能太短，
  // 此時不寫入欄位（避免觸發 zod「至少 2 字」error），改用 hint 提示賣家手動輸入。
  const generateSlug = () => {
    setSlugifyHint(null);
    const name = watch("name");
    if (!name?.trim()) {
      setSlugifyHint("請先輸入商品名稱");
      return;
    }
    const candidate = slugifyName(name);
    if (candidate.length < 2) {
      setSlugifyHint(
        "名稱不含可用的英數字（純中文 / 符號無法轉換）。請手動輸入 slug，例：ethiopia-yirgacheffe-g1",
      );
      return;
    }
    setValue("slug", candidate, { shouldValidate: true });
  };

  const disabled = isPending || isSubmitting;
  const submitLabel = props.mode === "create" ? "建立商品" : "儲存變更";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="border border-border bg-surface"
    >
      <div className="grid gap-8 px-7 py-7">
        <FieldGroup title="基本資訊">
          <Field
            label="商品名稱"
            name="name"
            error={errors.name}
            register={register("name")}
            placeholder="耶加雪菲 G1 科契爾"
          />
          <SlugField
            error={errors.slug}
            register={register("slug")}
            onGenerate={generateSlug}
            slugifyHint={slugifyHint}
          />
          <Field
            label="產地"
            name="origin"
            error={errors.origin}
            register={register("origin")}
            placeholder="ETHIOPIA · 衣索比亞"
          />
          <Field
            label="角標（選填）"
            name="badge"
            error={errors.badge}
            register={register("badge")}
            placeholder="NEW / LIMITED / 季節限定"
          />
        </FieldGroup>

        <FieldGroup title="規格">
          <SelectField
            label="烘焙度"
            name="roastLevel"
            error={errors.roastLevel}
            register={register("roastLevel")}
          >
            {ROAST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <Field
            label="處理法"
            name="processingMethod"
            error={errors.processingMethod}
            register={register("processingMethod")}
            placeholder="水洗 / 日曬 / 蜜處理 / 厭氧發酵"
          />
          <Field
            label="風味描述"
            name="flavorNotes"
            error={errors.flavorNotes}
            register={register("flavorNotes")}
            placeholder="花香 · 柑橘 · 茉莉"
            wrapperClassName="col-span-2 max-[600px]:col-span-1"
          />
          <Field
            label="克重（g）"
            name="weightGram"
            type="number"
            error={errors.weightGram}
            register={register("weightGram", { valueAsNumber: true })}
            placeholder="200"
          />
        </FieldGroup>

        <FieldGroup title="價格與庫存">
          <Field
            label="售價（NT$）"
            name="price"
            type="number"
            error={errors.price}
            register={register("price", { valueAsNumber: true })}
            placeholder="580"
          />
          <Field
            label="庫存"
            name="stock"
            type="number"
            error={errors.stock}
            register={register("stock", { valueAsNumber: true })}
            placeholder="50"
          />
        </FieldGroup>

        <FieldGroup title="描述（選填）" cols={1}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="description"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted"
            >
              詳細介紹
            </label>
            <textarea
              id="description"
              rows={7}
              {...register("description")}
              className={`border bg-bg px-3.5 py-3 font-sans text-[14px] leading-[1.6] text-fg placeholder:text-dim focus:outline-none ${
                errors.description
                  ? "border-danger focus:border-danger"
                  : "border-border focus:border-accent"
              }`}
              placeholder="這支豆來自..."
            />
            {errors.description?.message && (
              <span className="font-mono text-[11px] text-danger">
                {errors.description.message}
              </span>
            )}
          </div>
        </FieldGroup>

        <FieldGroup title="設定">
          <SelectField
            label="封面樣式（無真實圖片時用）"
            name="coverVariant"
            error={errors.coverVariant as FieldError | undefined}
            register={register("coverVariant", {
              setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
            })}
          >
            {COVER_VARIANTS.map((v) => (
              <option key={String(v.value)} value={v.value ?? ""}>
                {v.label}
              </option>
            ))}
          </SelectField>
          <label className="flex items-center gap-2.5 self-end pb-3 font-mono text-[12px] tracking-[0.06em] text-fg-2">
            <input
              type="checkbox"
              {...register("isActive")}
              className="size-4 accent-accent"
            />
            上架販售（uncheck = 下架）
          </label>
        </FieldGroup>
      </div>

      {/* Footer actions */}
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

/* ============ inline form primitives ============ */

function FieldGroup({
  title,
  cols = 2,
  children,
}: {
  title: string;
  cols?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <h3 className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
        {title}
      </h3>
      <div
        className={
          cols === 2
            ? "grid grid-cols-2 gap-x-5 gap-y-5 max-[600px]:grid-cols-1"
            : "grid grid-cols-1 gap-5"
        }
      >
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
  type?: "text" | "number";
  error?: FieldError;
  register: ReturnType<UseFormRegister<ProductFormValues>>;
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

function SlugField({
  error,
  register,
  onGenerate,
  slugifyHint,
}: {
  error?: FieldError;
  register: ReturnType<UseFormRegister<ProductFormValues>>;
  onGenerate: () => void;
  slugifyHint: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="slug"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted"
        >
          Slug（網址路徑）
        </label>
        <button
          type="button"
          onClick={onGenerate}
          className="font-mono text-[10px] tracking-[0.14em] uppercase text-accent hover:underline"
        >
          從名稱產生 ↓
        </button>
      </div>
      <input
        id="slug"
        placeholder="ethiopia-yirgacheffe-g1-kochere"
        {...register}
        className={`border bg-bg px-3.5 py-3 font-sans text-[14px] text-fg placeholder:text-dim focus:outline-none ${
          error ? "border-danger focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {error?.message && (
        <span className="font-mono text-[11px] text-danger">{error.message}</span>
      )}
      {slugifyHint && !error?.message && (
        <span className="font-mono text-[11px] text-warn">{slugifyHint}</span>
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
  register: ReturnType<UseFormRegister<ProductFormValues>>;
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
