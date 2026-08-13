"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  createAssetAction,
  createAssetConversionAction,
  createBuyLotAction,
  createSaleAction,
  createTargetAction,
  deleteAssetAction,
  deleteBuyLotAction,
  deleteSaleAction,
  deleteTargetAction,
  updateAssetAction,
  updateBuyLotAction,
  updateSaleAction,
  updateTargetAction,
  type ActionResult,
} from "@/app/actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type ServerMutation = (formData: FormData) => Promise<ActionResult>;

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  width = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(15,23,42,0.58)] backdrop-blur-sm">
      <button
        type="button"
        aria-label="關閉"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-start justify-center p-3 sm:items-center sm:p-5">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "relative my-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]",
            width,
          )}
        >
          <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
              {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
            </div>
            <button
              type="button"
              title="關閉"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--control)] hover:text-[var(--foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </section>
      </div>
    </div>,
    document.body,
  );
}

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        result.ok
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : "border-rose-400/25 bg-rose-400/10 text-rose-200",
      )}
    >
      {result.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {result.message}
    </div>
  );
}

function MutationForm({
  action,
  onSuccess,
  children,
  submitLabel,
}: {
  action: ServerMutation;
  onSuccess: () => void;
  children: ReactNode;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setResult(null);
    startTransition(async () => {
      const next = await action(formData);
      setResult(next);
      if (next.ok) {
        router.refresh();
        window.setTimeout(onSuccess, 500);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {children}
      <Feedback result={result} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {pending ? "處理中" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export type AssetFormValue = {
  id: string;
  symbol: string;
  name: string;
  priceSource: string;
  currentPrice: string;
  coingeckoId: string;
  binanceSymbol: string;
  iconUrl: string;
  color: string;
  isActive: boolean;
};

export function AssetEditor({
  asset,
  compact = false,
}: {
  asset?: AssetFormValue;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(asset);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          editing && "h-9 bg-white/10 text-white hover:bg-white/15",
          compact && "h-9 w-9 px-0",
        )}
        title={editing ? "編輯資產" : "新增資產"}
      >
        {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {!compact ? (editing ? "編輯" : "新增資產") : null}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `編輯 ${asset?.symbol}` : "新增加密貨幣"}
        description="設定代號、價格來源與目前價格。建立後即可新增買入批次。"
      >
        <MutationForm
          action={editing ? updateAssetAction : createAssetAction}
          onSuccess={() => setOpen(false)}
          submitLabel={editing ? "儲存變更" : "建立資產"}
        >
          {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              代號
              <Input name="symbol" defaultValue={asset?.symbol} placeholder="BTC" required />
            </Label>
            <Label>
              名稱
              <Input name="name" defaultValue={asset?.name} placeholder="Bitcoin" required />
            </Label>
            <Label>
              價格來源
              <Select name="priceSource" defaultValue={asset?.priceSource ?? "coingecko"}>
                <option value="coingecko">CoinGecko</option>
                <option value="binance">Binance</option>
                <option value="manual">手動價格</option>
              </Select>
            </Label>
            <Label>
              目前價格
              <Input
                name="currentPrice"
                defaultValue={asset?.currentPrice ?? "0"}
                inputMode="decimal"
                required
              />
            </Label>
            <Label>
              CoinGecko ID
              <Input name="coingeckoId" defaultValue={asset?.coingeckoId} placeholder="bitcoin" />
            </Label>
            <Label>
              Binance Symbol
              <Input
                name="binanceSymbol"
                defaultValue={asset?.binanceSymbol}
                placeholder="BTCUSDT"
              />
            </Label>
            <Label>
              圖表顏色
              <Input
                name="color"
                type="color"
                defaultValue={asset?.color ?? "#64748B"}
                className="w-16 cursor-pointer p-1"
                title="選擇此幣種在圖表中的顏色"
              />
            </Label>
            <Label>
              圖示網址（空白時使用 CoinGecko）
              <Input name="iconUrl" defaultValue={asset?.iconUrl} placeholder="https://..." />
            </Label>
            {editing ? (
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input name="isActive" type="checkbox" defaultChecked={asset?.isActive} />
                啟用此資產
              </label>
            ) : null}
          </div>
        </MutationForm>
      </Modal>
    </>
  );
}

export type BuyLotFormValue = {
  id: string;
  assetId: string;
  date: string;
  price: string;
  quantity: string;
  fee: string;
  feeCurrency: string;
  exchange: string;
  account: string;
  note: string;
  isIncluded: boolean;
};

export function AssetConversionEditor({
  sourceAssetId,
  sourceSymbol,
  sourceQuantity,
  sourceCost,
  assets,
}: {
  sourceAssetId: string;
  sourceSymbol: string;
  sourceQuantity: string;
  sourceCost: string;
  assets: { id: string; symbol: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [targetQuantity, setTargetQuantity] = useState("");
  const [fee, setFee] = useState("0");
  const today = new Date().toISOString().slice(0, 10);
  const quantity = Number(targetQuantity);
  const sourceQty = Number(sourceQuantity);
  const totalCost = Number(sourceCost) + (Number(fee) || 0);
  const validPreview = quantity > 0 && Number.isFinite(quantity);

  return <>
    <Button type="button" onClick={() => setOpen(true)} disabled={!assets.length || !(sourceQty > 0)} className="bg-sky-500 hover:bg-sky-400">
      <ArrowRightLeft className="h-4 w-4" />資產轉換
    </Button>
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={`轉換全部 ${sourceSymbol} 持倉`}
      description="來源批次會按原成本關閉，剩餘成本完整轉移至新的目標資產批次，不產生轉換損益。"
    >
      <MutationForm action={createAssetConversionAction} onSuccess={() => setOpen(false)} submitLabel="確認資產轉換">
        <input type="hidden" name="sourceAssetId" value={sourceAssetId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            來源資產
            <Input value={`${sourceSymbol} · 全部 ${sourceQuantity}`} disabled />
          </Label>
          <Label>
            目標資產
            <Select name="targetAssetId" required defaultValue="">
              <option value="" disabled>選擇目標資產</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.symbol} · {asset.name}</option>)}
            </Select>
          </Label>
          <Label>
            轉換日期
            <Input name="date" type="date" defaultValue={today} required />
          </Label>
          <Label>
            實際收到數量
            <Input name="targetQuantity" inputMode="decimal" value={targetQuantity} onChange={(event) => setTargetQuantity(event.target.value)} placeholder="以成交紀錄為準" required />
          </Label>
          <Label>
            額外成本／手續費
            <Input name="fee" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} required />
          </Label>
          <Label>
            手續費幣別
            <Input name="feeCurrency" defaultValue="USDT" required />
          </Label>
          <Label>
            交易所
            <Input name="exchange" placeholder="Binance" />
          </Label>
          <Label>
            帳戶
            <Input name="account" placeholder="現貨主帳戶" />
          </Label>
          <Label className="sm:col-span-2">
            備註
            <Textarea name="note" placeholder="例如：ETH 兌換為 WBETH" />
          </Label>
        </div>
        <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-sm sm:grid-cols-3">
          <div><span className="text-zinc-500">轉移成本</span><div className="font-semibold">{Number(sourceCost).toFixed(2)} USDT</div></div>
          <div><span className="text-zinc-500">換算比率</span><div className="font-semibold">{validPreview ? `1 目標資產 = ${(sourceQty / quantity).toFixed(8)} ${sourceSymbol}` : "-"}</div></div>
          <div><span className="text-zinc-500">目標單位成本</span><div className="font-semibold">{validPreview ? `${(totalCost / quantity).toFixed(2)} USDT` : "-"}</div></div>
        </div>
      </MutationForm>
    </Modal>
  </>;
}

export function BuyLotEditor({
  assetId,
  symbol,
  lot,
}: {
  assetId: string;
  symbol: string;
  lot?: BuyLotFormValue;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(lot);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={editing ? "h-9 bg-white/10 text-white hover:bg-white/15" : ""}
      >
        {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {editing ? "編輯批次" : "記錄買入"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `編輯 ${symbol} 買入批次` : `新增 ${symbol} 買入`}
        description="每次買入都會保留為獨立批次，後續賣出與損益會回到這個批次計算。"
      >
        <MutationForm
          action={editing ? updateBuyLotAction : createBuyLotAction}
          onSuccess={() => setOpen(false)}
          submitLabel={editing ? "儲存批次" : "新增買入"}
        >
          <input type="hidden" name="assetId" value={assetId} />
          {lot ? <input type="hidden" name="id" value={lot.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              買入日期
              <Input name="date" type="date" defaultValue={lot?.date ?? today} required />
            </Label>
            <Label>
              買入價格
              <Input name="price" inputMode="decimal" defaultValue={lot?.price} required />
            </Label>
            <Label>
              買入數量
              <Input name="quantity" inputMode="decimal" defaultValue={lot?.quantity} required />
            </Label>
            <Label>
              手續費
              <Input name="fee" inputMode="decimal" defaultValue={lot?.fee ?? "0"} required />
            </Label>
            <Label>
              手續費幣別
              <Input name="feeCurrency" defaultValue={lot?.feeCurrency ?? "USDT"} required />
            </Label>
            <Label>
              交易所
              <Input name="exchange" defaultValue={lot?.exchange} placeholder="Binance" />
            </Label>
            <Label>
              帳戶
              <Input name="account" defaultValue={lot?.account} placeholder="現貨主帳戶" />
            </Label>
            <label className="flex items-end gap-2 pb-2 text-sm text-zinc-300">
              <input name="excluded" type="checkbox" defaultChecked={lot ? !lot.isIncluded : false} />
              不計入投資組合
            </label>
            <Label className="sm:col-span-2">
              備註
              <Textarea name="note" defaultValue={lot?.note} />
            </Label>
          </div>
        </MutationForm>
      </Modal>
    </>
  );
}

export type SaleFormValue = {
  id: string;
  buyLotId: string;
  date: string;
  price: string;
  quantity: string;
  fee: string;
  feeCurrency: string;
  exchange: string;
  account: string;
  note: string;
};

export function SaleEditor({
  buyLotId,
  symbol,
  remainingQuantity,
  effectiveUnitCost,
  sale,
  compact = false,
}: {
  buyLotId: string;
  symbol: string;
  remainingQuantity: string;
  effectiveUnitCost: string;
  sale?: SaleFormValue;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(sale?.price ?? "");
  const [quantity, setQuantity] = useState(sale?.quantity ?? "");
  const [fee, setFee] = useState(sale?.fee ?? "0");
  const editing = Boolean(sale);
  const maxQuantity = Number(remainingQuantity) + Number(sale?.quantity ?? 0);
  const preview = useMemo(() => {
    const qty = Number(quantity) || 0;
    const salePrice = Number(price) || 0;
    const saleFee = Number(fee) || 0;
    return {
      remaining: Math.max(maxQuantity - qty, 0),
      proceeds: salePrice * qty - saleFee,
      profit: (salePrice - Number(effectiveUnitCost)) * qty - saleFee,
      invalid: qty > maxQuantity,
    };
  }, [effectiveUnitCost, fee, maxQuantity, price, quantity]);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          editing ? "h-8 bg-white/10 px-2 text-white hover:bg-white/15" : "bg-cyan-400 hover:bg-cyan-300",
          compact && "h-8 w-8 px-0",
        )}
        title={editing ? "編輯賣出" : "新增賣出"}
      >
        {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
        {!compact ? (editing ? "編輯" : "記錄賣出") : null}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `編輯 ${symbol} 賣出紀錄` : `新增 ${symbol} 分批賣出`}
        description={`此批次目前可賣出 ${maxQuantity} ${symbol}`}
      >
        <MutationForm
          action={editing ? updateSaleAction : createSaleAction}
          onSuccess={() => setOpen(false)}
          submitLabel={editing ? "儲存賣出紀錄" : "新增賣出"}
        >
          <input type="hidden" name="buyLotId" value={buyLotId} />
          {sale ? <input type="hidden" name="id" value={sale.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              賣出日期
              <Input
                name="date"
                type="date"
                defaultValue={sale?.date ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </Label>
            <Label>
              賣出價格
              <Input
                name="price"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </Label>
            <Label>
              賣出數量
              <Input
                name="quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </Label>
            <Label>
              手續費
              <Input
                name="fee"
                inputMode="decimal"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                required
              />
            </Label>
            <Label>
              手續費幣別
              <Input name="feeCurrency" defaultValue={sale?.feeCurrency ?? "USDT"} required />
            </Label>
            <Label>
              交易所
              <Input name="exchange" defaultValue={sale?.exchange} />
            </Label>
            <Label>
              帳戶
              <Input name="account" defaultValue={sale?.account} />
            </Label>
            <Label className="sm:col-span-2">
              備註
              <Textarea name="note" defaultValue={sale?.note} />
            </Label>
          </div>
          <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-sm sm:grid-cols-3">
            <div>
              <span className="text-zinc-500">賣出後剩餘</span>
              <div className={preview.invalid ? "font-semibold text-rose-300" : "font-semibold"}>
                {preview.remaining.toFixed(8).replace(/\.?0+$/, "")} {symbol}
              </div>
            </div>
            <div>
              <span className="text-zinc-500">預計淨收入</span>
              <div className="font-semibold">{preview.proceeds.toFixed(2)} USDT</div>
            </div>
            <div>
              <span className="text-zinc-500">預計已實現損益</span>
              <div className={preview.profit >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                {preview.profit.toFixed(2)} USDT
              </div>
            </div>
          </div>
          {preview.invalid ? (
            <div className="text-sm text-rose-300">賣出數量不可超過此批次剩餘數量。</div>
          ) : null}
        </MutationForm>
      </Modal>
    </>
  );
}

export type TargetFormValue = {
  id: string;
  buyLotId: string;
  targetPercent: string;
  targetPrice: string;
  targetQuantity: string;
  note: string;
};

export function TargetEditor({
  buyLotId,
  symbol,
  buyPrice,
  remainingQuantity,
  target,
  compact = false,
}: {
  buyLotId: string;
  symbol: string;
  buyPrice: string;
  remainingQuantity: string;
  target?: TargetFormValue;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(target?.targetPercent ?? "20");
  const [targetPrice, setTargetPrice] = useState(
    target?.targetPrice ?? (Number(buyPrice) * 1.2).toString(),
  );
  const editing = Boolean(target);

  function changePercent(value: string) {
    setPercent(value);
    const next = Number(buyPrice) * (1 + Number(value) / 100);
    if (Number.isFinite(next)) setTargetPrice(next.toFixed(8).replace(/\.?0+$/, ""));
  }

  function changePrice(value: string) {
    setTargetPrice(value);
    const next = (Number(value) / Number(buyPrice) - 1) * 100;
    if (Number.isFinite(next)) setPercent(next.toFixed(4).replace(/\.?0+$/, ""));
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "bg-amber-300 hover:bg-amber-200",
          editing && "h-8 bg-white/10 px-2 text-white hover:bg-white/15",
          compact && "h-8 w-8 px-0",
        )}
        title={editing ? "編輯止盈目標" : "新增止盈目標"}
      >
        {editing ? <Pencil className="h-3.5 w-3.5" /> : <Target className="h-4 w-4" />}
        {!compact ? (editing ? "編輯" : "新增目標") : null}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `編輯 ${symbol} 止盈目標` : `新增 ${symbol} 止盈目標`}
        description="可輸入目標漲幅或直接修改目標價格，兩者會自動換算。"
      >
        <MutationForm
          action={editing ? updateTargetAction : createTargetAction}
          onSuccess={() => setOpen(false)}
          submitLabel={editing ? "儲存目標" : "新增目標"}
        >
          <input type="hidden" name="buyLotId" value={buyLotId} />
          {target ? <input type="hidden" name="id" value={target.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              目標漲幅 %
              <Input
                name="targetPercent"
                inputMode="decimal"
                value={percent}
                onChange={(event) => changePercent(event.target.value)}
              />
            </Label>
            <Label>
              目標價格
              <Input
                name="targetPrice"
                inputMode="decimal"
                value={targetPrice}
                onChange={(event) => changePrice(event.target.value)}
                required
              />
            </Label>
            <Label>
              目標賣出數量
              <Input
                name="targetQuantity"
                inputMode="decimal"
                defaultValue={target?.targetQuantity ?? remainingQuantity}
                required
              />
            </Label>
            <Label>
              備註
              <Input name="note" defaultValue={target?.note} />
            </Label>
          </div>
        </MutationForm>
      </Modal>
    </>
  );
}

type DeleteKind = "asset" | "lot" | "sale" | "target";

const deleteActions: Record<DeleteKind, ServerMutation> = {
  asset: deleteAssetAction,
  lot: deleteBuyLotAction,
  sale: deleteSaleAction,
  target: deleteTargetAction,
};

export function DeleteEntityButton({
  kind,
  id,
  label,
  description,
  compact = false,
}: {
  kind: DeleteKind;
  id: string;
  label: string;
  description: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function remove() {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      const next = await deleteActions[kind](formData);
      setResult(next);
      if (next.ok) {
        window.setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 500);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        title={label}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className={cn(
          "inline-flex h-8 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium text-zinc-400 hover:bg-rose-400/10 hover:text-rose-300",
          compact && "w-8",
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!compact ? label : null}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={label} width="max-w-md">
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p className="text-sm text-zinc-200">{description}</p>
          </div>
          <Feedback result={result} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={remove}
              disabled={pending}
              className="bg-rose-400 text-zinc-950 hover:bg-rose-300"
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {pending ? "處理中" : "確認刪除"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}



