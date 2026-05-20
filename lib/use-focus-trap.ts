// Phase 9d — modal focus trap hook
//
// 用法：
//   const ref = useRef<HTMLDivElement>(null);
//   useFocusTrap(ref, open);
//   <div ref={ref}>{...modal content}</div>
//
// 行為：
//   1) open 變 true 時：自動 focus 容器內第一個可聚焦元素
//   2) Tab / Shift+Tab：focus 循環在容器內，不會跳出去
//   3) open 變 false 時：把 focus 還給觸發 modal 開啟的元素（previous activeElement）

"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null || el.tagName === "DIALOG");
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    // mount 後 focus 第一個可聚焦元素（如果 modal 內沒有，focus 容器本身）
    const focusables = getFocusable(container);
    const first = focusables[0];
    if (first) {
      first.focus();
    } else if (container.tabIndex >= 0) {
      container.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getFocusable(container);
      if (els.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift+Tab on first → wrap to last
        if (activeEl === firstEl || !container.contains(activeEl)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab on last → wrap to first
        if (activeEl === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // 還焦點給開啟前的元素（如果還在 DOM 內）
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [ref, active]);
}
