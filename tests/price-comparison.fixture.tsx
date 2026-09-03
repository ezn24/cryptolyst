import React from "react";
import { createRoot } from "react-dom/client";
import { PriceComparisonExplorer } from "../src/components/prices/price-comparison-explorer";
import "../src/app/globals.css";

const assets = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", color: "#e9ae36" },
  { id: "eth", symbol: "ETH", name: "Ethereum", color: "#69c99e" },
  { id: "bnb", symbol: "BNB", name: "BNB", color: "#5ab8f3" },
  { id: "sol", symbol: "SOL", name: "Solana", color: "#61cfe6" },
  { id: "sui", symbol: "SUI", name: "Sui", color: "#dc72b6" },
  { id: "link", symbol: "LINK", name: "Chainlink", color: "#a992ed" },
];

window.fetch = async (input) => {
  const id = new URL(String(input), "http://localhost").searchParams.get("assetId");
  const index = assets.findIndex((asset) => asset.id === id);
  return new Response(JSON.stringify({
    asset: { ...assets[index], currency: "USDT" },
    points: Array.from({ length: 100 }, (_, point) => ({
      timestamp: new Date(Date.UTC(2026, 7, 27, point)).toISOString(),
      price: [60000, 2000, 600, 150, 1.5, 15][index] * (1 + Math.sin(point / 12 + index) * 0.04 + point / 1000 * (index % 2 ? -1 : 1)),
    })),
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-6xl p-4 sm:p-6">
    <h2 className="mb-4 font-semibold">歷史價格與區間走勢</h2>
    <PriceComparisonExplorer assets={assets} range="7D" />
  </main>,
);
