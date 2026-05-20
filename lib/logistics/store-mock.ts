// Phase 8a — Mock 超商門市資料
//
// 決議（2026-05-20）：CVS 選店走 Mock，不串綠界真 StoreMap。
// 5 間 7-11 + 5 間全家，StoreID 用真實格式 6 碼但虛構數字，避免撞到真店。
// 8b 的 StorePickerDialog 會用 getStoresByChain 過濾顯示。

import type { MockStore } from "./types";

export const MOCK_STORES: MockStore[] = [
  {
    chain: "UNIMART",
    storeId: "991001",
    storeName: "7-11 台大門市",
    address: "10617 台北市大安區羅斯福路四段 1 號",
  },
  {
    chain: "UNIMART",
    storeId: "991002",
    storeName: "7-11 信義三店",
    address: "11049 台北市信義區松山路 393 號",
  },
  {
    chain: "UNIMART",
    storeId: "991003",
    storeName: "7-11 中山北門市",
    address: "10448 台北市中山區中山北路二段 27 號",
  },
  {
    chain: "UNIMART",
    storeId: "991004",
    storeName: "7-11 西門紅樓門市",
    address: "10848 台北市萬華區成都路 10 號",
  },
  {
    chain: "UNIMART",
    storeId: "991005",
    storeName: "7-11 永康青田門市",
    address: "10665 台北市大安區永康街 6 巷 9 號",
  },
  {
    chain: "FAMILY",
    storeId: "992001",
    storeName: "全家 忠孝二店",
    address: "10650 台北市大安區忠孝東路四段 25 號",
  },
  {
    chain: "FAMILY",
    storeId: "992002",
    storeName: "全家 仁愛裡店",
    address: "10683 台北市大安區仁愛路四段 122 巷 3 號",
  },
  {
    chain: "FAMILY",
    storeId: "992003",
    storeName: "全家 大稻埕店",
    address: "10341 台北市大同區迪化街一段 156 號",
  },
  {
    chain: "FAMILY",
    storeId: "992004",
    storeName: "全家 公館汀州店",
    address: "10087 台北市中正區汀州路三段 187 號",
  },
  {
    chain: "FAMILY",
    storeId: "992005",
    storeName: "全家 松菸文創店",
    address: "11071 台北市信義區光復南路 133 號",
  },
];

export function getStoresByChain(chain: MockStore["chain"]): MockStore[] {
  return MOCK_STORES.filter((s) => s.chain === chain);
}

export function findStoreById(storeId: string): MockStore | undefined {
  return MOCK_STORES.find((s) => s.storeId === storeId);
}
