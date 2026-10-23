"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Bike, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { riderLoginAction, type AuthActionState } from "@/app/(frontend)/actions"

const initialState: AuthActionState = {}

export function RiderLoginForm() {
  const [state, formAction, pending] = useActionState(riderLoginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <section aria-labelledby="rider-login-title" className="w-full rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl sm:p-10">
      <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-orange-400 text-zinc-950"><Bike className="size-7" aria-hidden="true" /></div>
      <p className="text-xs font-bold tracking-[0.2em] text-orange-300">RIDER ACCESS</p>
      <h2 id="rider-login-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">เข้าสู่ระบบไรเดอร์</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">พร้อมออกส่งแล้วใช่ไหม? เข้าสู่ระบบด้วยบัญชีไรเดอร์ที่ร้านจัดเตรียมไว้ให้</p>

      <form action={formAction} className="mt-8 space-y-5" aria-busy={pending}>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">อีเมลไรเดอร์</span>
          <span className="flex min-h-14 items-center gap-3 rounded-xl border border-white/20 bg-zinc-950/40 px-4 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/25">
            <Mail className="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
            <input name="email" type="email" autoComplete="username" placeholder="rider@example.com" required disabled={pending} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-60" />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-bold">รหัสผ่าน</span>
          <span className="flex min-h-14 items-center gap-3 rounded-xl border border-white/20 bg-zinc-950/40 px-4 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/25">
            <LockKeyhole className="size-5 shrink-0 text-zinc-400" aria-hidden="true" />
            <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={8} placeholder="รหัสผ่านบัญชีไรเดอร์" required disabled={pending} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-60" />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400">
              {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
            </button>
          </span>
        </label>
        {state.error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200">
          <p>{state.error}</p>
          {state.loginPath && <Link href={state.loginPath} className="mt-2 inline-block font-bold underline underline-offset-4">ไปหน้าเข้าสู่ระบบทั่วไป →</Link>}
        </div>}
        <button type="submit" disabled={pending} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-orange-400 px-5 font-black text-zinc-950 transition hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-60">
          {pending ? "กำลังตรวจสอบบัญชี..." : "เข้าสู่ระบบเพื่อรับงาน"}
          {!pending && <ArrowUpRight className="size-5" aria-hidden="true" />}
        </button>
      </form>
      <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-zinc-400"><ShieldCheck className="mt-1 size-4 shrink-0 text-orange-300" aria-hidden="true" />สำหรับไรเดอร์ของร้านเท่านั้น หากยังไม่มีบัญชีหรือลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลร้าน</p>
      <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-zinc-400">ต้องการสั่งอาหาร? <Link href="/login" className="font-bold text-orange-300 underline-offset-4 hover:underline">เข้าสู่ระบบทั่วไป</Link></div>
    </section>
  )
}
