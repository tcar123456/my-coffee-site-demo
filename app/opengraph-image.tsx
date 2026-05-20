// Phase 9b — Open Graph image（動態，1200x630）
// 用 Next.js ImageResponse API 生成；對齊設計 token：bg-bg 底色 + 暖色 accent + serif/mono 字體分層。
// build 時靜態渲染，社群分享時 fetch /opengraph-image.png。
//
// 注意：ImageResponse 不支援讀 globals.css 的 oklch token，所以這裡用對應的 hex/rgba。
// 對應關係（從 globals.css）：
//   bg-bg     ≈ #0e0c0a (oklch 11% 0.012 60)
//   text-fg   ≈ #ecdfd2 (oklch 92% 0.022 70)
//   text-accent ≈ #c79569 (oklch 70% 0.108 60)
//   text-muted ≈ #7a6c5d (oklch 55% 0.022 75)

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "暮焙 MUBEI — 精品單一產地咖啡";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0e0c0a 0%, #1a1410 60%, #2a1d14 100%)",
          color: "#ecdfd2",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            fontFamily: "monospace",
            fontSize: "18px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#c79569",
          }}
        >
          <span style={{ display: "flex" }}>MUBEI · EST 2026</span>
          <span style={{ display: "flex", color: "#7a6c5d" }}>·</span>
          <span style={{ display: "flex", color: "#7a6c5d" }}>Taichung, Taiwan</span>
        </div>

        {/* Main title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "180px",
              fontFamily: "serif",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            暮焙
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "44px",
              fontFamily: "serif",
              fontStyle: "italic",
              color: "#a89488",
              lineHeight: 1.2,
            }}
          >
            精品單一產地咖啡 · 從產地到杯中的編年敘事
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#7a6c5d",
          }}
        >
          <span style={{ display: "flex" }}>每週一新批次 · 隔日出貨</span>
          <span
            style={{
              display: "flex",
              color: "#c79569",
              letterSpacing: "0.18em",
            }}
          >
            mubei.coffee →
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
