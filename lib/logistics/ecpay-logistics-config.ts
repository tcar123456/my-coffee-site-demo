// Phase 8a — 綠界物流 sandbox config
//
// 公開測試帳號（多年公開常數，與 AIO 不同的另一組）：
//   MerchantID: 2000132
//   HashKey:    5294y06JbISpM5x9
//   HashIV:     v77hoKGq4kWxNNIS
//   Endpoint:   https://logistics-stage.ecpay.com.tw
//
// 沒設 env 時用 sandbox fallback；production 要顯式 set ECPAY_LOGISTICS_ENV=production。

export type EcpayLogisticsEnv = "sandbox" | "production";

export interface EcpayLogisticsConfig {
  env: EcpayLogisticsEnv;
  merchantId: string;
  hashKey: string;
  hashIV: string;
  endpoint: string;
  appUrl: string;
}

const SANDBOX_DEFAULTS = {
  merchantId: "2000132",
  hashKey: "5294y06JbISpM5x9",
  hashIV: "v77hoKGq4kWxNNIS",
  endpoint: "https://logistics-stage.ecpay.com.tw",
} as const;

const PRODUCTION_ENDPOINT = "https://logistics.ecpay.com.tw";

export function getEcpayLogisticsConfig(): EcpayLogisticsConfig {
  const env = (process.env.ECPAY_LOGISTICS_ENV ?? "sandbox") as EcpayLogisticsEnv;
  const isProduction = env === "production";

  const merchantId =
    process.env.ECPAY_LOGISTICS_MERCHANT_ID ??
    (isProduction ? "" : SANDBOX_DEFAULTS.merchantId);
  const hashKey =
    process.env.ECPAY_LOGISTICS_HASH_KEY ??
    (isProduction ? "" : SANDBOX_DEFAULTS.hashKey);
  const hashIV =
    process.env.ECPAY_LOGISTICS_HASH_IV ??
    (isProduction ? "" : SANDBOX_DEFAULTS.hashIV);
  const endpoint =
    process.env.ECPAY_LOGISTICS_ENDPOINT ??
    (isProduction ? PRODUCTION_ENDPOINT : SANDBOX_DEFAULTS.endpoint);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  if (isProduction && (!merchantId || !hashKey || !hashIV)) {
    throw new Error(
      "ECPay logistics production env missing: 必須設 ECPAY_LOGISTICS_MERCHANT_ID / HASH_KEY / HASH_IV",
    );
  }

  return { env, merchantId, hashKey, hashIV, endpoint, appUrl };
}
