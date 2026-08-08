import { DatabaseBackup, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CsvImporter } from "@/components/csv-importer";
import { LinkButton, Panel } from "@/components/ui/primitives";

export default function ImportExportPage() {
  return (
    <AppShell title="匯入與匯出" description="日常 CSV 交換與完整資料備份">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel>
          <h2 className="font-semibold">匯入交易 CSV</h2>
          <p className="mt-1 text-sm text-zinc-500">支援 BUY 與 SELL。賣出列必須以 buyLotReference 指定所屬買入批次。</p>
          <div className="mt-4"><CsvImporter /></div>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel>
            <h2 className="font-semibold">CSV 匯出</h2>
            <p className="mt-1 text-sm text-zinc-500">依用途下載目前資料，不包含登入 Secret。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href="/api/export/assets"><Download className="h-4 w-4" />資產</LinkButton>
              <LinkButton href="/api/export/buy-lots"><Download className="h-4 w-4" />買入批次</LinkButton>
              <LinkButton href="/api/export/sales"><Download className="h-4 w-4" />賣出紀錄</LinkButton>
              <LinkButton href="/api/export/transactions"><Download className="h-4 w-4" />全部交易</LinkButton>
              <LinkButton href="/api/export/portfolio"><Download className="h-4 w-4" />投資組合摘要</LinkButton>
            </div>
          </Panel>
          <Panel>
            <h2 className="font-semibold">完整備份</h2>
            <p className="mt-1 text-sm text-zinc-500">下載可稽核的 JSON 備份，包含資產、批次、賣出、目標與價格歷史。</p>
            <div className="mt-4"><LinkButton href="/api/backup/json"><DatabaseBackup className="h-4 w-4" />下載 JSON 備份</LinkButton></div>
          </Panel>
          <Panel>
            <h2 className="font-semibold">舊 Excel 遷移</h2>
            <p className="mt-1 text-sm text-zinc-500">Excel 只用於一次性資料遷移。先執行 dry-run 檢查，確認摘要後再加上 --commit。</p>
            <code className="mt-3 block overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-zinc-300">npm run import:legacy -- &quot;加密貨幣交易記錄 2.0.xlsx&quot;</code>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
