import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PriceHistoryExplorer } from "@/components/prices/price-history-explorer";

vi.mock("recharts", () => {
  const Empty = () => null;
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const Line = ({ name }: { name: string }) => <span data-testid={`line-${name}`} />;
  return { Area: Empty, CartesianGrid: Empty, ComposedChart: Empty, Line, LineChart: Container, ReferenceLine: Empty, ResponsiveContainer: Container, Tooltip: Empty, XAxis: Empty, YAxis: Empty };
});

describe("overview multi-coin comparison", () => {
  const mockFetch = () => vi.fn(async (url: string) => {
    const params = new URL(url, "http://localhost").searchParams;
    const asset = assets.find((item) => item.id === params.get("assetId"))!;
    return { ok: true, json: async () => ({ asset: { ...asset, currency: "USDT" }, points: [{ timestamp: "2026-09-01T00:00:00Z", price: 100 }, { timestamp: "2026-09-02T00:00:00Z", price: 110 }] }) };
  });

  it("renders all coins on one chart and preserves hidden coins across range changes", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<PriceHistoryExplorer compare assets={assets} fixedRange="7D" />);
    await waitFor(() => expect(screen.queryByTestId("line-ETH")).not.toBeNull());
    expect(screen.queryByTestId("line-BTC")).not.toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: "漲跌幅 %" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("checkbox", { name: "ETH" }));
    expect(screen.queryByTestId("line-ETH")).toBeNull();
    expect(screen.queryByTestId("line-BTC")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "原始價格" }));
    expect(screen.getByRole("button", { name: "原始價格" }).getAttribute("aria-pressed")).toBe("true");
    rerender(<PriceHistoryExplorer compare assets={assets} fixedRange="1Y" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/prices/history?assetId=btc&range=1Y", expect.anything()));
    await waitFor(() => expect(screen.queryByTestId("line-BTC")).not.toBeNull());
    expect((screen.getByRole("checkbox", { name: "ETH" }) as HTMLInputElement).checked).toBe(false);
  });

  it("keeps successful coins visible when one request fails", async () => {
    const success = mockFetch();
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("assetId=eth") ? Promise.reject(new Error("offline")) : success(url)));
    render(<PriceHistoryExplorer compare assets={assets} fixedRange="7D" />);
    await waitFor(() => expect(screen.queryByTestId("line-BTC")).not.toBeNull());
    expect(screen.getByText("載入失敗")).toBeTruthy();
  });

  it("shows an empty selection state when every coin is hidden", async () => {
    vi.stubGlobal("fetch", mockFetch());
    render(<PriceHistoryExplorer compare assets={assets} fixedRange="7D" />);
    await waitFor(() => expect(screen.queryByTestId("line-BTC")).not.toBeNull());
    fireEvent.click(screen.getByRole("checkbox", { name: "ETH" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "BTC" }));
    expect(screen.getByText("尚未選擇幣種")).toBeTruthy();
  });
});

const assets = [
  { id: "eth", name: "Ethereum", symbol: "ETH", color: "#123456" },
  { id: "btc", name: "Bitcoin", symbol: "BTC", color: "#abcdef" },
];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("shared dashboard range", () => {
  it("loads the shared range and preserves the selected coin when the range changes", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const params = new URL(url, "http://localhost").searchParams;
      const asset = assets.find((item) => item.id === params.get("assetId"))!;
      return { ok: true, json: async () => ({ asset: { ...asset, currency: "USDT" }, range: params.get("range"), pointCount: 0, coverage: null, summary: null, points: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<PriceHistoryExplorer assets={assets} fixedRange="7D" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/prices/history?assetId=eth&range=7D", expect.anything()));
    expect(screen.queryByRole("button", { name: "30D" })).toBeNull();
    fireEvent.change(screen.getByLabelText("幣種"), { target: { value: "btc" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/prices/history?assetId=btc&range=7D", expect.anything()));
    rerender(<PriceHistoryExplorer assets={assets} fixedRange="1Y" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/prices/history?assetId=btc&range=1Y", expect.anything()));
    expect((screen.getByLabelText("幣種") as HTMLSelectElement).value).toBe("btc");
  });
});
