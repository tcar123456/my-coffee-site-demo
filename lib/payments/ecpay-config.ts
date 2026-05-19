// Phase 6b — ECPay env loader
// dev 預設 fallback 到 ECPay 公開 sandbox 測試帳號（多年公開常數，所有 SDK 共用）。
// production 一定要在 .env.local 顯式設定，沒設會用 sandbox 帳號（不會誤導向真實扣款，但會發到 sandbox endpoint）。
// 切換 production 用 ECPAY_ENV=production，並覆寫 ECPAY_MERCHANT_ID/HASH_KEY/HASH_IV。

export interface EcpayConfig {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  endpoint: string;
  appUrl: string;
  isSandbox: boolean;
}

const SANDBOX_DEFAULTS = {
  merchantId: "3002607",
  hashKey: "pwFHCqoQZGmho4w6",
  hashIV: "EkRm7iFT261dpevs",
  endpoint: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
};

export function getEcpayConfig(): EcpayConfig {
  const isSandbox = process.env.ECPAY_ENV !== "production";
  return {
    merchantId: process.env.ECPAY_MERCHANT_ID || SANDBOX_DEFAULTS.merchantId,
    hashKey: process.env.ECPAY_HASH_KEY || SANDBOX_DEFAULTS.hashKey,
    hashIV: process.env.ECPAY_HASH_IV || SANDBOX_DEFAULTS.hashIV,
    endpoint:
      process.env.ECPAY_AIO_ENDPOINT ||
      (isSandbox
        ? SANDBOX_DEFAULTS.endpoint
        : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"),
    appUrl: process.env.APP_URL || "http://localhost:3000",
    isSandbox,
  };
}
