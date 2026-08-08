import { setManualPriceAction } from "@/app/actions";
import { Button, Input } from "@/components/ui/primitives";

export function ManualPriceForm({ assetId }: { assetId: string }) {
  return (
    <form action={setManualPriceAction} className="flex min-w-64 gap-2">
      <input type="hidden" name="assetId" value={assetId} />
      <Input name="price" placeholder="手動價格" inputMode="decimal" required />
      <Button type="submit">套用</Button>
    </form>
  );
}
