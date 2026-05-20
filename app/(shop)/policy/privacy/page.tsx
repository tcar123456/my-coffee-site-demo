// Phase 9a — 隱私權政策（作品集 template 文案）
//
// 內容對齊台灣個資法（PIPA）標準框架：蒐集目的 / 種類 / 利用方式 / 期間 / 對象 / 當事人權利。
// 實際營運要由法律顧問審閱。

import type { Metadata } from "next";
import { Heading, Section, Para, List } from "../_components";

export const metadata: Metadata = {
  title: "隱私權政策 — 暮焙 MUBEI",
  description:
    "暮焙 MUBEI 隱私權政策：說明我們如何蒐集、利用、保護您的個人資料；以及您對自身資料擁有的權利。",
};

const UPDATED_AT = "2026 年 5 月 20 日";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Heading title="隱私權政策" updatedAt={UPDATED_AT} />

      <Section num="01" title="政策範圍">
        <Para>
          本政策說明暮焙 MUBEI（以下簡稱「本站」）於提供購物、會員與配送服務時，
          如何蒐集、處理、利用以及保護您的個人資料。本政策遵循中華民國《個人資料保護法》之規範。
        </Para>
        <Para>
          當您使用本站任何功能，即視為您已詳閱、理解並同意本政策內容。
          若您不同意，請停止使用本站之服務。
        </Para>
      </Section>

      <Section num="02" title="蒐集之資料種類">
        <Para>本站於下列情境蒐集您的個人資料：</Para>
        <List
          items={[
            "註冊會員時：電子郵件、密碼（加密儲存）、姓名",
            "下單與配送時：收件人姓名、聯絡電話、收件地址、超商門市資訊",
            "金流交易時：交易編號、付款方式、付款狀態（卡號等敏感資訊由支付服務商保管，本站不留存）",
            "瀏覽行為：IP 位址、瀏覽器資訊、Cookie 識別碼，僅作匿名統計用途",
          ]}
        />
      </Section>

      <Section num="03" title="蒐集目的與利用方式">
        <List
          items={[
            "提供商品銷售、配送、客服與會員服務",
            "處理金流交易與帳務管理",
            "通知出貨進度、訂單異動與會員權益訊息",
            "於匿名彙整後改善網站服務品質",
            "履行法令所要求之保存與通報義務",
          ]}
        />
        <Para>
          本站不會將您的個人資料提供予非業務必要之第三方，亦不會用於非上述目的之行銷。
        </Para>
      </Section>

      <Section num="04" title="資料保留期限">
        <Para>
          除法令另有規定外，本站於下列情形終止保留您的個人資料：
        </Para>
        <List
          items={[
            "會員資料：自您申請刪除帳號之日起 30 個工作日內完成清除",
            "訂單與交易紀錄：依《商業會計法》保留 5 年後銷毀",
            "Cookie 與瀏覽紀錄：自您最後一次造訪起 12 個月",
          ]}
        />
      </Section>

      <Section num="05" title="Cookie 政策">
        <Para>
          本站使用 Cookie 與相似技術（如 localStorage）以維持您的登入狀態、購物車內容及偏好設定。
          您可於瀏覽器設定中關閉 Cookie，但部分功能（如購物車、結帳）將無法正常運作。
        </Para>
      </Section>

      <Section num="06" title="當事人權利">
        <Para>依個資法第 3 條，您對本站持有之您的個人資料，得行使下列權利：</Para>
        <List
          items={[
            "查詢或請求閱覽",
            "請求製給複製本",
            "請求補充或更正",
            "請求停止蒐集、處理或利用",
            "請求刪除",
          ]}
        />
        <Para>
          請透過頁尾 LINE 官方帳號或本站客服信箱聯繫，我們將於 15 個工作日內回覆。
        </Para>
      </Section>

      <Section num="07" title="政策修訂">
        <Para>
          本站保留隨時修訂本政策之權利。重大變更時將以 Email 或站內公告通知。
          最新版本之最後更新日期載於頁首。
        </Para>
      </Section>
    </>
  );
}
