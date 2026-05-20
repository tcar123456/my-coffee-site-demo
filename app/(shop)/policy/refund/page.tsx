// Phase 9a — 退換貨政策（作品集 template 文案）

import type { Metadata } from "next";
import { Heading, Section, Para, List } from "../_components";

export const metadata: Metadata = {
  title: "退換貨政策 — 暮焙 MUBEI",
  description:
    "暮焙 MUBEI 退換貨政策：說明可退貨、不可退貨之品項、退款流程、運費負擔規則。",
};

const UPDATED_AT = "2026 年 5 月 20 日";

export default function RefundPolicyPage() {
  return (
    <>
      <Heading title="退換貨政策" updatedAt={UPDATED_AT} />

      <Section num="01" title="可退貨之情形">
        <Para>於下列情形，您得申請退貨：</Para>
        <List
          items={[
            "商品於送達時包裝明顯破損、髒污或外洩",
            "收到之商品與下訂品項不符（品名、容量、烘焙日期等）",
            "經本站確認之品質瑕疵（受潮、發霉、異味）",
            "依消保法第 19 條，自收貨翌日起 7 日內無條件退貨（請參照〈7 日鑑賞期〉）",
          ]}
        />
      </Section>

      <Section num="02" title="不可退貨之品項">
        <Para>
          依《消費者保護法施行細則》第 17 條及《通訊交易解除權合理例外情事適用準則》，
          下列商品不適用 7 日鑑賞期：
        </Para>
        <List
          items={[
            "已開封之咖啡豆、研磨粉、即溶包（食品衛生安全考量）",
            "已客製化研磨之豆款（依您指定研磨度處理，無法再販售）",
            "個人衛生用品、易於腐敗之產品",
          ]}
        />
        <Para>
          未開封之原包裝商品、器具周邊、禮盒不在此限。
        </Para>
      </Section>

      <Section num="03" title="退款流程">
        <List
          items={[
            "聯繫客服：透過頁尾 LINE 官方帳號或客服信箱提出退貨申請，附訂單編號與退貨原因",
            "客服回覆：1–2 個工作日內回覆並提供退貨運單資訊",
            "寄回商品：依指示寄回（鑑賞期退貨者須維持原狀及包裝完整）",
            "驗收：本站收到商品後 3 個工作日內完成驗收",
            "退款：驗收通過後 7 個工作日內，依原付款方式退還款項",
          ]}
        />
      </Section>

      <Section num="04" title="運費負擔規則">
        <List
          items={[
            "商品瑕疵 / 寄錯 / 破損：退貨運費由本站全額負擔",
            "鑑賞期內無條件退貨：往返運費由消費者負擔（依消保法）",
            "原訂單已享免運（滿 NT$ 1,200）：若退貨後實付金額未達免運門檻，將自退款金額扣除原運費",
          ]}
        />
      </Section>

      <Section num="05" title="退款方式對應">
        <List
          items={[
            "信用卡（綠界 ECPay）：原卡退款，依發卡行作業時程入帳（5–14 個工作日）",
            "LINE Pay：原帳戶退款，1–3 個工作日內入帳",
            "ATM 轉帳 / 貨到付款：請於申請時提供匯款帳戶資訊",
          ]}
        />
      </Section>

      <Section num="06" title="部分退貨">
        <Para>
          若您僅就單一訂單中部分品項退貨，免運門檻將以「保留品項小計」重新計算。
          如保留品項未達免運門檻，將補收運費。
        </Para>
      </Section>

      <Section num="07" title="爭議處理">
        <Para>
          若您對退換貨流程有任何爭議，得依消保法向消費者保護官提出申訴。
          本站將依法配合處理。
        </Para>
      </Section>
    </>
  );
}
