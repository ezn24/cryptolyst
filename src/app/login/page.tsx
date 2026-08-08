"use client";

import { Eye, LockKeyhole } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, { error: "" });
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
      <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-8">
          <div className="text-2xl font-bold text-[var(--foreground)]">Cryptolyst</div>
          <div className="mt-1 text-sm text-[var(--muted)]">自架式加密貨幣交易記錄與投資分析</div>
        </div>
        <form action={formAction} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-[var(--muted-strong)]">
            密碼
            <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--input)] focus-within:border-emerald-400">
              <LockKeyhole className="ml-3 h-4 w-4 text-[var(--muted)]" />
              <input name="password" type={visible ? "text" : "password"} autoComplete="current-password" className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[var(--foreground)] outline-none" required />
              <button type="button" onClick={() => setVisible((value) => !value)} className="px-3 text-[var(--muted)] hover:text-[var(--foreground)]" title="顯示或隱藏密碼">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </label>
          {state?.error ? <div data-login-error className="rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error-text)]">{state.error}</div> : null}
          <button disabled={pending} className="h-11 rounded-md bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60">
            {pending ? "登入中..." : "登入"}
          </button>
        </form>
      </section>
    </main>
  );
}

