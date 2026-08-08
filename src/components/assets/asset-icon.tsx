"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function AssetIcon({
  symbol,
  name,
  iconUrl,
  color,
  className,
}: {
  symbol: string;
  name: string;
  iconUrl?: string | null;
  color: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span
      className={cn(
        "relative inline-grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border text-xs font-bold text-white",
        className,
      )}
      style={{ backgroundColor: color, borderColor: color }}
      title={`${name} (${symbol})`}
      aria-label={`${name} 圖示`}
    >
      {iconUrl && failedUrl !== iconUrl ? (
        // User-configured URLs can point to any self-hosted domain, so next/image cannot safely enumerate hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(iconUrl)}
        />
      ) : (
        <span aria-hidden="true">{symbol.slice(0, 2)}</span>
      )}
    </span>
  );
}
