import Link from "next/link";
import { Coins, FileDown, Gauge, LogOut, Settings, Tags } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { zh } from "@/lib/i18n";

const nav = [
  { href: "/", label: zh.nav.dashboard, icon: Gauge },
  { href: "/assets", label: zh.nav.assets, icon: Coins },
  { href: "/prices", label: zh.nav.prices, icon: Tags },
  { href: "/import-export", label: zh.nav.importExport, icon: FileDown },
  { href: "/settings", label: zh.nav.settings, icon: Settings },
];

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[var(--surface)] p-4 md:block">
        <Link href="/" className="block text-xl font-bold">
          Cryptolyst
        </Link>
        <div className="mt-1 text-xs text-zinc-500">加密貨幣交易與投資分析</div>
        <nav className="mt-8 grid gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--background)]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-zinc-500 md:hidden">Cryptolyst</div>
              <h1 className="truncate text-xl font-semibold">{title}</h1>
              {description ? <p className="mt-0.5 truncate text-xs text-zinc-500">{description}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <form action={logoutAction}>
                <button
                  type="submit"
                  title="登出"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
          <nav className="mt-3 flex w-full max-w-full gap-2 overflow-x-auto pb-1 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white/[0.06] px-3 text-xs"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto min-w-0 max-w-[1500px] px-4 py-5">{children}</main>
      </div>
    </div>
  );
}




