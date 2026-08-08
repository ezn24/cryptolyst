import { updateSettingsAction } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Button, Input, Label, Panel, Select } from "@/components/ui/primitives";
import { getSettings } from "@/lib/services/portfolio-service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <AppShell title="設定" description="顯示、價格與投資組合偏好">
      <Panel className="max-w-4xl">
        <form action={updateSettingsAction} className="grid gap-4 md:grid-cols-2">
          <Label>基準貨幣<Input name="baseCurrency" defaultValue={settings.baseCurrency} /></Label>
          <Label>預設價格來源<Select name="priceProvider" defaultValue={settings.priceProvider}><option value="coingecko">CoinGecko</option><option value="binance">Binance</option></Select></Label>
          <Label>後台更新頻率（分鐘）<Input name="priceRefreshInterval" type="number" min="1" max="1440" defaultValue={settings.priceRefreshInterval} /></Label>
          <Label>時區<Input name="timezone" defaultValue={settings.timezone} /></Label>
          <Label>主題<Select name="theme" defaultValue={settings.theme}><option value="system">跟隨瀏覽器</option><option value="dark">深色</option><option value="light">淺色</option></Select></Label>
          <Label>數量小數位<Input name="decimalPrecision" type="number" min="2" max="18" defaultValue={settings.decimalPrecision} /></Label>
          <Label>預設手續費幣別<Input name="defaultFeeCurrency" defaultValue={settings.defaultFeeCurrency} /></Label>
          <Label>圖表預設範圍<Select name="portfolioChartRange" defaultValue={settings.portfolioChartRange}><option>24H</option><option>7D</option><option>30D</option><option>90D</option><option>1Y</option><option>ALL</option></Select></Label>
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input name="showCompletedLots" type="checkbox" defaultChecked={settings.showCompletedLots} />顯示已完成批次</label>
          <div className="md:col-span-2"><Button type="submit">儲存設定</Button></div>
        </form>
      </Panel>
    </AppShell>
  );
}

