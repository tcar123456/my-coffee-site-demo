// Phase 5d — CSV 構造工具（純函式）
// 規則（RFC 4180）：
//   - 欄位含逗號 / 雙引號 / 換行需用 " 包起來
//   - " 在欄位內要 escape 成 ""
//   - 換行用 CRLF
// 中文 Excel 開啟需要 UTF-8 BOM (﻿)，否則亂碼

const NEEDS_QUOTE = /[",\r\n]/;

export function csvEscapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (!NEEDS_QUOTE.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(cells: ReadonlyArray<unknown>): string {
  return cells.map(csvEscapeCell).join(",");
}

export function buildCsv(opts: {
  headers: ReadonlyArray<string>;
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
}): string {
  const lines = [csvRow(opts.headers), ...opts.rows.map(csvRow)];
  // BOM + CRLF — Excel 識別 UTF-8 + 跨 OS 相容
  return `﻿${lines.join("\r\n")}\r\n`;
}
