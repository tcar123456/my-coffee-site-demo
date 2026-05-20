// Phase 8a — 綠界物流 sandbox 型別

// 物流類別：CVS 超商取貨 / Home 宅配到府
export type LogisticsType = "CVS" | "Home";

// 子類別：
//   CVS：UNIMARTC2C（7-11 C2C）/ FAMIC2C（全家 C2C）/ HILIFEC2C（萊爾富）/ OKMARTC2C（OK）
//   Home：TCAT（黑貓宅急便）/ ECAN（宅配通）/ POST（中華郵政）
// 本專案 Phase 8 範圍只用 UNIMARTC2C + FAMIC2C + TCAT 三種。
export type LogisticsSubType =
  | "UNIMARTC2C"
  | "FAMIC2C"
  | "HILIFEC2C"
  | "OKMARTC2C"
  | "TCAT"
  | "ECAN"
  | "POST";

// 對應 shippingMethod → logistics subType（純函式查表，動工時邏輯）
export const SHIPPING_METHOD_TO_SUBTYPE: Record<
  "CVS_711" | "CVS_FAMILY" | "HOME_DELIVERY",
  { type: LogisticsType; subType: LogisticsSubType }
> = {
  CVS_711: { type: "CVS", subType: "UNIMARTC2C" },
  CVS_FAMILY: { type: "CVS", subType: "FAMIC2C" },
  HOME_DELIVERY: { type: "Home", subType: "TCAT" },
};

// /Express/Create 共用必填欄位
export interface CreateShipmentRequestCommon {
  MerchantID: string;
  MerchantTradeNo: string;
  MerchantTradeDate: string;
  LogisticsType: LogisticsType;
  LogisticsSubType: LogisticsSubType;
  GoodsAmount: string;
  GoodsName: string;
  SenderName: string;
  SenderPhone?: string;
  SenderCellPhone?: string;
  ReceiverName: string;
  ReceiverPhone?: string;
  ReceiverCellPhone: string;
  ReceiverEmail?: string;
  ServerReplyURL: string;
  ClientReplyURL?: string;
  IsCollection: "Y" | "N";
  CollectionAmount?: string;
  CheckMacValue?: string;
}

// CVS 額外欄位
export interface CreateShipmentRequestCvs extends CreateShipmentRequestCommon {
  LogisticsType: "CVS";
  ReceiverStoreID: string;
  ReturnStoreID?: string;
}

// 宅配額外欄位
export interface CreateShipmentRequestHome extends CreateShipmentRequestCommon {
  LogisticsType: "Home";
  SenderZipCode: string;
  SenderAddress: string;
  ReceiverZipCode: string;
  ReceiverAddress: string;
  Temperature?: "0001" | "0002" | "0003";
  Distance?: "00" | "01" | "02";
  Specification?: "0001" | "0002" | "0003" | "0004";
}

export type CreateShipmentRequest =
  | CreateShipmentRequestCvs
  | CreateShipmentRequestHome;

// /Express/Create 回傳：URL-encoded form body
// 成功時 RtnCode === "1" 並含 AllPayLogisticsID
export interface CreateShipmentResponseRaw {
  RtnCode?: string;
  RtnMsg?: string;
  AllPayLogisticsID?: string;
  LogisticsType?: string;
  GoodsAmount?: string;
  UpdateStatusDate?: string;
  ReceiverName?: string;
  ReceiverPhone?: string;
  ReceiverCellPhone?: string;
  ReceiverEmail?: string;
  ReceiverAddress?: string;
  ReceiverStoreID?: string;
  ReturnStoreID?: string;
  CVSPaymentNo?: string;
  CVSValidationNo?: string;
  BookingNote?: string;
  CheckMacValue?: string;
}

export type CreateShipmentResult =
  | {
      ok: true;
      logisticsId: string;
      logisticsType: string;
      goodsAmount: number;
      raw: CreateShipmentResponseRaw;
    }
  | { ok: false; rtnCode: string; rtnMsg: string };

// Mock store（8a 寫，8b UI 用）
export interface MockStore {
  chain: "UNIMART" | "FAMILY";
  storeId: string;
  storeName: string;
  address: string;
}
