// Phase 3b — 離島地址驗證
// CLAUDE.md 業務限制：僅限台灣本島出貨；金門 / 澎湖 / 連江需擋下。
// 郵遞區號參考中華郵政「3+3 郵遞區號一覽表」前 3 碼：
//   - 連江縣（馬祖）：209 / 210 / 211 / 212
//   - 金門縣：890 / 891 / 892 / 893 / 894 / 896
//   - 澎湖縣：880 / 881 / 882 / 883 / 884 / 885
// 取得來源：https://www.post.gov.tw/post/internet/Postal/index.jsp?ID=207
// 驗證策略：先 normalize 成前 3 碼整數比對，避免使用者輸入 5/6 碼版。

const OFFSHORE_ZIP_PREFIXES = new Set([
  "209", "210", "211", "212", // 連江
  "890", "891", "892", "893", "894", "896", // 金門
  "880", "881", "882", "883", "884", "885", // 澎湖
]);

export function normalizeZip(zipCode: string): string {
  return zipCode.replace(/\D/g, "").slice(0, 3);
}

export function isOffshoreZip(zipCode: string): boolean {
  const prefix = normalizeZip(zipCode);
  if (prefix.length !== 3) return false;
  return OFFSHORE_ZIP_PREFIXES.has(prefix);
}

export function isValidTaiwanZip(zipCode: string): boolean {
  const digits = zipCode.replace(/\D/g, "");
  return digits.length === 3 || digits.length === 5 || digits.length === 6;
}
