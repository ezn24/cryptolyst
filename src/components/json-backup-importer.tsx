"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, DatabaseBackup, LoaderCircle, Upload } from "lucide-react";
import { importJsonBackupAction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/primitives";

function previewJson(text: string) {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const required = ["assets", "buyLots", "sales", "targets", "settings"];
    const missing = required.filter((key) => !Array.isArray(data[key]));
    if (missing.length) return { valid: false, error: `缺少陣列：${missing.join("、")}`, counts: {} };
    return { valid: true, error: "", counts: {
      資產: (data.assets as unknown[]).length,
      買入批次: (data.buyLots as unknown[]).length,
      賣出紀錄: (data.sales as unknown[]).length,
      止盈目標: (data.targets as unknown[]).length,
      價格歷史: Array.isArray(data.priceHistory) ? data.priceHistory.length : 0,
    } };
  } catch {
    return { valid: false, error: "JSON 格式不正確", counts: {} };
  }
}

export function JsonBackupImporter() {
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = useMemo(() => previewJson(jsonText), [jsonText]);

  async function chooseFile(file?: File) {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    setJsonText(await file.text());
  }

  function restore() {
    const formData = new FormData();
    formData.set("jsonText", jsonText);
    startTransition(async () => {
      const next = await importJsonBackupAction(formData);
      setResult(next);
      if (next.ok) { setJsonText(""); setFileName(""); }
    });
  }

  return <div className="grid gap-4">
    <label className="grid min-h-28 cursor-pointer place-items-center rounded-md border border-dashed border-white/15 bg-black/10 p-5 text-center hover:border-cyan-300/40">
      <input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <div>
        <DatabaseBackup className="mx-auto h-6 w-6 text-zinc-500" />
        <div className="mt-2 text-sm font-medium">{fileName || "選擇 Cryptolyst JSON 備份"}</div>
        <div className="mt-1 text-xs text-zinc-500">匯入僅限尚無投資資料的新資料庫</div>
      </div>
    </label>
    {jsonText ? preview.valid ? <>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {Object.entries(preview.counts).map(([label, count]) => <span key={label}>{label}：{count}</span>)}
      </div>
      <Button type="button" onClick={restore} disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {pending ? "匯入中" : "匯入 JSON 備份"}
      </Button>
    </> : <div className="flex items-center gap-2 rounded-md border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"><AlertTriangle className="h-4 w-4" />{preview.error}</div> : null}
    {result ? <div className={result.ok ? "rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200" : "rounded-md border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"}>{result.message}</div> : null}
  </div>;
}
