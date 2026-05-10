"use client";

// Phase 3b — 共用 Address 表單（會員中心、結帳 step 1）
// 使用 react-hook-form + zod；用 design tokens 自刻 input / label / error 樣式。
// onSubmit 由父層注入（接 server action）。

import { useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressFormSchema, type AddressFormValues } from "@/lib/schemas/address";

type AddressFormProps = {
  defaultValues?: Partial<AddressFormValues>;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (values: AddressFormValues) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Partial<Record<keyof AddressFormValues, string>>;
  }>;
  showDefaultToggle?: boolean;
};

const TAIWAN_CITIES = [
  "台北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣",
  "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市",
  "嘉義縣", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "台東縣",
];

export function AddressForm({
  defaultValues,
  submitLabel = "儲存地址",
  onCancel,
  onSubmit,
  showDefaultToggle = true,
}: AddressFormProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      recipient: defaultValues?.recipient ?? "",
      phone: defaultValues?.phone ?? "",
      zipCode: defaultValues?.zipCode ?? "",
      city: defaultValues?.city ?? "",
      district: defaultValues?.district ?? "",
      street: defaultValues?.street ?? "",
      isDefault: defaultValues?.isDefault ?? false,
    },
  });

  const submit: SubmitHandler<AddressFormValues> = (values) => {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [k, msg] of Object.entries(result.fieldErrors)) {
            if (msg) setError(k as keyof AddressFormValues, { message: msg });
          }
        } else if (result.error) {
          setError("root", { message: result.error });
        }
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-2 gap-x-5 gap-y-5 max-[600px]:grid-cols-1"
      noValidate
    >
      <Field
        label="收件人姓名"
        name="recipient"
        error={errors.recipient?.message}
        register={register("recipient")}
        autoComplete="name"
      />
      <Field
        label="手機號碼"
        name="phone"
        placeholder="0912345678"
        inputMode="numeric"
        error={errors.phone?.message}
        register={register("phone")}
        autoComplete="tel"
      />
      <Field
        label="郵遞區號"
        name="zipCode"
        placeholder="100"
        inputMode="numeric"
        error={errors.zipCode?.message}
        register={register("zipCode")}
        autoComplete="postal-code"
      />
      <SelectField
        label="縣市"
        name="city"
        error={errors.city?.message}
        register={register("city")}
      >
        <option value="">請選擇</option>
        {TAIWAN_CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <Field
        label="鄉鎮市區"
        name="district"
        placeholder="中山區"
        error={errors.district?.message}
        register={register("district")}
        autoComplete="address-level2"
      />
      <Field
        label="詳細地址"
        name="street"
        placeholder="南京東路二段 132 號 8 樓"
        error={errors.street?.message}
        register={register("street")}
        autoComplete="street-address"
        wrapperClassName="col-span-2 max-[600px]:col-span-1"
      />

      {showDefaultToggle && (
        <label className="col-span-2 flex items-center gap-2.5 font-mono text-[12px] tracking-[0.06em] text-fg-2 max-[600px]:col-span-1">
          <input
            type="checkbox"
            {...register("isDefault")}
            className="size-4 accent-accent"
          />
          設為預設地址
        </label>
      )}

      {errors.root?.message && (
        <p className="col-span-2 border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-[12px] text-danger max-[600px]:col-span-1">
          {errors.root.message}
        </p>
      )}

      <div className="col-span-2 mt-2 flex flex-wrap items-center gap-3 max-[600px]:col-span-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi disabled:opacity-50"
        >
          {isPending ? "儲存中…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-2.5 border border-border px-[22px] py-3.5 font-mono text-[12px] tracking-[0.16em] text-fg uppercase transition-all duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}

/* ----- inline form primitives ----- */

type RegisterReturn = ReturnType<ReturnType<typeof useForm<AddressFormValues>>["register"]>;

function Field({
  label,
  name,
  error,
  register,
  placeholder,
  inputMode,
  autoComplete,
  wrapperClassName,
}: {
  label: string;
  name: string;
  error?: string;
  register: RegisterReturn;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  autoComplete?: string;
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
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        {...register}
        className={`border bg-bg px-3.5 py-3 font-sans text-[14px] text-fg placeholder:text-dim focus:outline-none ${
          error ? "border-danger focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {error && (
        <span className="font-mono text-[11px] text-danger">{error}</span>
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
  error?: string;
  register: RegisterReturn;
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
      {error && (
        <span className="font-mono text-[11px] text-danger">{error}</span>
      )}
    </div>
  );
}
