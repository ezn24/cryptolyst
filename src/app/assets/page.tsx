import { redirect } from "next/navigation";
import { AssetLedger } from "@/app/assets/[assetId]/page";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const asset = await prisma.asset.findFirst({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { symbol: "asc" }],
    select: { id: true },
  });

  if (!asset) redirect("/assets/manage");
  return <AssetLedger assetId={asset.id} />;
}
