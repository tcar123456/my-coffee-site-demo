// Phase 9a — /policy 預設導向第一項
// PolicyLayout 含側欄 nav；直接訪問 /policy 時導去 /policy/privacy

import { redirect } from "next/navigation";

export default function PolicyIndex() {
  redirect("/policy/privacy");
}
