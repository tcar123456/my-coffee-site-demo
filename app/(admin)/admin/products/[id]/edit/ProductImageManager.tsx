"use client";

// Phase 5b — 商品圖片管理（client）
// 已上傳列表（含上下移 + 刪除）+ 檔案選擇 + preview + 批次上傳。
// 上傳：逐張呼叫 server action（簡單可靠，不需要 chunked upload）。
// reorder：呼叫 reorderProductImagesAction(imageIds order)，optimistic 預先 swap 本地 state，失敗就 revert。

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  uploadProductImageAction,
  deleteProductImageAction,
  reorderProductImagesAction,
} from "@/app/actions/admin-products";

type ManagedImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export function ProductImageManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: ManagedImage[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [failedFiles, setFailedFiles] = useState<Array<{ name: string; error: string }>>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles(files);
    setFailedFiles([]);
  }

  function clearPending() {
    setPendingFiles([]);
    setFailedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setActionError(null);
    const failed: Array<{ name: string; error: string }> = [];
    const uploaded: ManagedImage[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      setUploadProgress({ current: i + 1, total: pendingFiles.length });
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("file", file);

      try {
        const result = await uploadProductImageAction(fd);
        if (!result.ok) {
          failed.push({ name: file.name, error: result.error });
        } else if (result.imageId && result.url) {
          uploaded.push({
            id: result.imageId,
            url: result.url,
            alt: null,
            sortOrder: images.length + uploaded.length,
          });
        }
      } catch (err) {
        failed.push({
          name: file.name,
          error: err instanceof Error ? err.message : "未知錯誤",
        });
      }
    }

    setUploadProgress(null);
    setImages([...images, ...uploaded]);
    setFailedFiles(failed);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  function handleDelete(imageId: string) {
    if (!window.confirm("確定要刪除這張圖片？此操作無法恢復。")) return;
    setActionError(null);
    startTransition(async () => {
      const prev = images;
      setImages(images.filter((i) => i.id !== imageId)); // optimistic
      const result = await deleteProductImageAction(imageId);
      if (!result.ok) {
        setActionError(result.error);
        setImages(prev); // revert
      } else {
        router.refresh();
      }
    });
  }

  function move(imageId: string, direction: -1 | 1) {
    const idx = images.findIndex((i) => i.id === imageId);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= images.length) return;

    const nextImages = [...images];
    const [picked] = nextImages.splice(idx, 1);
    nextImages.splice(target, 0, picked);

    const prev = images;
    setImages(nextImages); // optimistic
    setActionError(null);
    startTransition(async () => {
      const result = await reorderProductImagesAction({
        productId,
        imageIds: nextImages.map((i) => i.id),
      });
      if (!result.ok) {
        setActionError(result.error);
        setImages(prev); // revert
      } else {
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-7 py-[18px]">
        <h2 className="text-[20px] leading-none">商品圖片</h2>
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
          {images.length} 張 · 最多 5 MB / 張 · JPEG / PNG / WebP
        </span>
      </div>

      {/* Existing images */}
      <div className="px-7 py-6">
        {images.length === 0 ? (
          <div className="border border-dashed border-border bg-bg px-6 py-12 text-center font-mono text-[11px] tracking-[0.08em] text-muted">
            尚未上傳任何圖片。新增圖片後，前台會優先顯示真實照片，無圖時 fallback 到漸層封面。
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {images.map((img, i) => (
              <li
                key={img.id}
                className="flex gap-4 border border-border bg-bg p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="size-[120px] flex-shrink-0 border border-border object-cover"
                />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
                    順序 {String(i + 1).padStart(2, "0")}
                    {i === 0 && (
                      <span className="ml-2 text-accent">主圖</span>
                    )}
                  </div>
                  <div className="break-all font-mono text-[10px] leading-[1.4] text-dim">
                    {img.url.split("/").pop()}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => move(img.id, -1)}
                      disabled={isPending || i === 0}
                      className="inline-flex items-center border border-border bg-transparent px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-2 transition-colors duration-150 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑ 上移
                    </button>
                    <button
                      type="button"
                      onClick={() => move(img.id, 1)}
                      disabled={isPending || i === images.length - 1}
                      className="inline-flex items-center border border-border bg-transparent px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-fg-2 transition-colors duration-150 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓ 下移
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(img.id)}
                      disabled={isPending}
                      className="ml-auto inline-flex items-center border border-[oklch(40%_0.10_25)] bg-transparent px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-danger transition-colors duration-150 hover:border-danger hover:bg-[oklch(26%_0.06_25)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-4 border border-[oklch(40%_0.10_25)] bg-[oklch(20%_0.04_25)] px-4 py-2.5 font-mono text-[11px] text-danger"
          >
            ✗ {actionError}
          </p>
        )}
      </div>

      {/* Upload section */}
      <div className="border-t border-border bg-surface-2 px-7 py-6">
        <h3 className="mb-3 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          新增圖片
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleSelect}
            className="block flex-1 min-w-[280px] border border-border bg-bg px-3.5 py-3 font-sans text-[13px] text-fg-2 file:mr-3 file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-mono file:text-[11px] file:tracking-[0.12em] file:uppercase file:text-accent"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={pendingFiles.length === 0 || uploadProgress !== null}
            className="inline-flex items-center gap-2.5 border border-accent bg-accent px-[22px] py-3.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-bg uppercase transition-all duration-200 hover:border-accent-hi hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadProgress
              ? `${uploadProgress.current}/${uploadProgress.total} 上傳中…`
              : `上傳 ${pendingFiles.length} 張`}
          </button>
          {pendingFiles.length > 0 && uploadProgress === null && (
            <button
              type="button"
              onClick={clearPending}
              className="inline-flex items-center px-3 py-3 font-mono text-[11px] tracking-[0.14em] uppercase text-muted hover:text-accent"
            >
              清除
            </button>
          )}
        </div>

        {/* Preview */}
        {pendingFiles.length > 0 && uploadProgress === null && (
          <ul className="mt-4 grid grid-cols-4 gap-3 max-[800px]:grid-cols-3 max-[500px]:grid-cols-2">
            {pendingFiles.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex flex-col gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="aspect-square border border-border object-cover"
                />
                <span className="truncate font-mono text-[10px] leading-[1.3] text-dim">
                  {file.name}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Failed list */}
        {failedFiles.length > 0 && (
          <div className="mt-4 border border-[oklch(40%_0.10_25)] bg-[oklch(20%_0.04_25)] px-4 py-3">
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] uppercase text-danger">
              ✗ {failedFiles.length} 個檔案上傳失敗
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-danger">
              {failedFiles.map((f, i) => (
                <li key={i}>
                  <span className="text-fg-2">{f.name}</span> — {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
