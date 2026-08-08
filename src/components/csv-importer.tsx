"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { AlertTriangle, Check, FileUp, LoaderCircle, Upload } from "lucide-react";
import { importTransactionsCsvAction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/primitives";

type CsvRow = {
  type?: string;
  asset?: string;
  date?: string;
  price?: string;
  quantity?: string;
  fee?: string;
  feeCurrency?: string;
  exchange?: string;
  account?: string;
  note?: string;
  buyLotReference?: string;
};

type PreviewRow = CsvRow & { rowNumber: number; errors: string[] };
const requiredHeaders = ["type", "asset", "date", "price", "quantity"];

function validateRows(csvText: string) {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const headers = parsed.meta.fields ?? [];
  const headerErrors = requiredHeaders.filter((header) => !headers.includes(header)).map((header) => `缺少欄位 ${header}`);
  const rows: PreviewRow[] = parsed.data.map((row, index) => {
    const errors: string[] = [];
    const type = row.type?.trim().toUpperCase();
    if (!["BUY", "SELL"].includes(type ?? "")) errors.push("type 必須是 BUY 或 SELL");
    if (!row.asset?.trim()) errors.push("缺少 asset");
    if (!row.date?.trim() || Number.isNaN(new Date(row.date).getTime())) errors.push("日期格式錯誤");
    if (!row.price?.trim() || !(Number(row.price) > 0)) errors.push("price 必須大於 0");
    if (!row.quantity?.trim() || !(Number(row.quantity) > 0)) errors.push("quantity 必須大於 0");
    if (row.fee?.trim() && Number(row.fee) < 0) errors.push("fee 不可小於 0");
    if (type === "SELL" && !row.buyLotReference?.trim()) errors.push("SELL 缺少 buyLotReference");
    return { ...row, rowNumber: index + 2, errors };
  });
  return { rows, errors: [...parsed.errors.map((error) => error.message), ...headerErrors] };
}

export function CsvImporter() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = useMemo(() => validateRows(csvText), [csvText]);
  const rowErrors = preview.rows.reduce((count, row) => count + row.errors.length, 0);
  const canImport = Boolean(csvText && preview.rows.length && !preview.errors.length && !rowErrors);

  async function chooseFile(file?: File) {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function commit() {
    const formData = new FormData();
    formData.set("csvText", csvText);
    startTransition(async () => {
      const next = await importTransactionsCsvAction(formData);
      setResult(next);
      if (next.ok) {
        setCsvText("");
        setFileName("");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <label className="grid min-h-36 cursor-pointer place-items-center rounded-md border border-dashed border-white/15 bg-black/10 p-5 text-center hover:border-emerald-300/40 hover:bg-emerald-300/[0.03]">
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
        <div>
          <FileUp className="mx-auto h-6 w-6 text-zinc-500" />
          <div className="mt-2 text-sm font-medium">{fileName || "選擇 CSV 檔案"}</div>
          <div className="mt-1 text-xs text-zinc-500">先預覽與驗證，確認後才會寫入</div>
        </div>
      </label>

      {csvText ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-medium">{preview.rows.length} 筆交易</span>
              <span className={preview.errors.length || rowErrors ? "ml-2 text-rose-300" : "ml-2 text-emerald-300"}>
                {preview.errors.length || rowErrors ? `${preview.errors.length + rowErrors} 個問題` : "格式檢查通過"}
              </span>
            </div>
            <Button type="button" onClick={commit} disabled={!canImport || pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {pending ? "匯入中" : "確認匯入"}
            </Button>
          </div>
          {preview.errors.length ? (
            <div className="rounded-md border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{preview.errors.join("、")}</div>
          ) : null}
          <div className="table-scroll max-h-80 rounded-md border border-white/10">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="sticky top-0 bg-[#171a1d] text-zinc-500">
                <tr><th className="p-2">列</th><th>類型</th><th>資產</th><th>日期</th><th>價格</th><th>數量</th><th>手續費</th><th>批次參照</th><th>檢查結果</th></tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-white/10">
                    <td className="p-2">{row.rowNumber}</td>
                    <td>{row.type}</td><td>{row.asset}</td><td>{row.date}</td><td>{row.price}</td><td>{row.quantity}</td><td>{row.fee || "0"}</td>
                    <td className="font-mono">{row.buyLotReference || "-"}</td>
                    <td>
                      {row.errors.length ? (
                        <span className="inline-flex items-center gap-1 text-rose-300"><AlertTriangle className="h-3.5 w-3.5" />{row.errors.join("、")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-300"><Check className="h-3.5 w-3.5" />通過</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {result ? (
        <div className={result.ok ? "rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200" : "rounded-md border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"}>{result.message}</div>
      ) : null}
    </div>
  );
}
