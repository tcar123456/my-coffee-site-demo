// Phase 9a — 7 日鑑賞期條款（作品集 template 文案）

import type { Metadata } from "next";
import { Heading, Section, Para, List } from "../_components";

export const metadata: Metadata = {
  title: "7 日鑑賞期 — 暮焙 MUBEI",
  description:
    "依消費者保護法第 19 條，消費者於通訊交易得自收受商品後 7 日內，無條件解除契約。",
};

const UPDATED_AT = "2026 年 5 月 20 日";

export default function SevenDayRightPage() {
  return (
    <>
      <Heading title="7 日鑑賞期條款" updatedAt={UPDATED_AT} />

      <Section num="01" title="法令依據">
        <Para>
          依《消費者保護法》第 19 條第 1 項：
          「通訊交易或訪問交易之消費者，得於收受商品或接受服務後七日內，
          以退回商品或書面通知方式解除契約，無須說明理由及負擔任何費用或對價。」
        </Para>
        <Para>
          本期間為「鑑賞期」，並非試用期；商品應維持原狀及完整包裝。
        </Para>
      </Section>

      <Section num="02" title="鑑賞期起算">
        <List
          items={[
            "自您（或代收人）簽收商品翌日起算 7 天",
            "若送達當天即簽收，當天不計入，自次日 0 時起算",
            "第 7 日當天 23:59 前送達退貨意思表示者，視為合於期限",
          ]}
        />
      </Section>

      <Section num="03" title="例外品項">
        <Para>
          依《通訊交易解除權合理例外情事適用準則》第 2 條，下列商品不適用 7 日鑑賞期：
        </Para>
        <List
          items={[
            "易於腐敗、保存期限較短或解約時即將逾期之商品（如已開封咖啡豆）",
            "依消費者要求所為之客製化商品（如指定研磨度之咖啡粉）",
            "報紙、期刊、雜誌",
            "經消費者拆封之影音商品或電腦軟體",
            "非以有形媒介提供之數位內容",
            "已組裝、依消費者要求加工之商品",
          ]}
        />
        <Para>
          本站所售未開封之原包裝咖啡豆、禮盒、器具等仍適用 7 日鑑賞期；
          已開封品項或已客製化研磨之豆款屬於前述例外，無法行使解約權。
        </Para>
      </Section>

      <Section num="04" title="行使方式">
        <List
          items={[
            "於 7 日內以書面、Email 或本站線上客服提出解除契約之意思表示",
            "提供訂單編號 + 解除契約之品項",
            "依本站客服指引將商品寄回（建議使用 711/全家便利商店寄送以便追蹤）",
            "商品須維持原狀、原包裝、配件齊全",
          ]}
        />
      </Section>

      <Section num="05" title="費用負擔">
        <List
          items={[
            "鑑賞期內解約之退回運費由消費者負擔（消保法第 19-1 條）",
            "若原訂單享有免運，扣除運費差額後退還剩餘款項",
            "本站於收到退貨商品並驗收完成後 7 個工作日內，依原付款方式退還款項",
          ]}
        />
      </Section>

      <Section num="06" title="退款金額計算">
        <Para>
          退款金額 = 原訂單實付金額 −（鑑賞期退貨運費）−（部分退貨後低於免運門檻所補收之原運費）。
        </Para>
        <Para>
          若您使用優惠碼或會員等級折抵，該折抵額度將依退貨比例調整；
          已用之優惠碼不予恢復（依本站〈優惠碼使用條款〉）。
        </Para>
      </Section>

      <Section num="07" title="法律救濟">
        <Para>
          若您認為本站未依法履行解約義務，得向消費者保護官、消費者保護團體或消費爭議調解委員會申訴。
          本站將依法配合處理。
        </Para>
      </Section>
    </>
  );
}
