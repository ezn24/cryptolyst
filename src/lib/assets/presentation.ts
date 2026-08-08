export const DEFAULT_ASSET_COLOR = "#64748B";

export const SPREADSHEET_ASSET_COLORS: Readonly<Record<string, string>> = {
  ETH: "#7030A0",
  BTC: "#FFFF00",
  SOL: "#92D050",
  SUI: "#00B0F0",
  BNB: "#FFC000",
  OP: "#FF0000",
  TRUMP: "#FFE699",
  LINK: "#2A5ADA",
};

export function defaultAssetColor(symbol: string) {
  return SPREADSHEET_ASSET_COLORS[symbol.toUpperCase()] ?? DEFAULT_ASSET_COLOR;
}

export function normalizeAssetColor(color: string) {
  return color.toUpperCase();
}
