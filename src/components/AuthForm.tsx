"use client"

import { useActionState, useState } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react"
import {
  loginAction,
  signupAction,
  type AuthActionState,
} from "@/app/(frontend)/actions"

const initialState: AuthActionState = {}

export function AuthForm({ riderOnly = false }: { riderOnly?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState,
  )
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState,
  )
  const state = mode === "login" ? loginState : signupState
  const pending = mode === "login" ? loginPending : signupPending

  return (
    <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_90px_rgba(68,24,16,0.12)] sm:p-10">
      {riderOnly ? <p className="text-xs font-black tracking-[.2em] text-[var(--brand-orange)]">BURKEN RIDER</p> : <div className="grid grid-cols-2 rounded-full bg-black/5 p-1">
        <button
          className={`min-h-11 rounded-full text-sm font-black transition ${
            mode === "login"
              ? "bg-white text-[var(--brand-red)] shadow-sm"
              : "text-black/45"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          เข้าสู่ระบบ
        </button>
        <button
          className={`min-h-11 rounded-full text-sm font-black transition ${
            mode === "signup"
              ? "bg-white text-[var(--brand-red)] shadow-sm"
              : "text-black/45"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          สมัครสมาชิก
        </button>
      </div>}

      <div className="mt-8">
        <p className="text-xs font-black tracking-[0.18em] text-[var(--brand-orange)] uppercase">
          {mode === "login" ? "Welcome back" : "Join Burken Club"}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">
          {riderOnly ? "พร้อมส่งความอร่อย" : mode === "login" ? "กลับมากินของอร่อยกัน" : "สมัครครั้งเดียว ได้ดีลทุกมื้อ"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/50">
          {riderOnly ? "เข้าสู่ระบบด้วยบัญชีไรเดอร์เพื่อรับงาน ดูจุดส่ง และเปิดเส้นทางนำทาง" : mode === "login"
            ? "เข้าสู่ระบบเพื่อสั่งอาหาร ดูออเดอร์ และใช้คะแนนสะสม"
            : "สร้างบัญชีลูกค้าใหม่ด้วยอีเมลและรหัสผ่าน"}
        </p>
      </div>

      <form
        action={mode === "login" ? loginFormAction : signupFormAction}
        className="mt-8 space-y-4"
      >
        {mode === "signup" && (
          <label className="block">
            <span className="mb-2 block text-sm font-black">ชื่อที่ใช้เรียก</span>
            <span className="flex min-h-14 items-center gap-3 rounded-2xl border border-black/10 px-4 transition focus-within:border-[var(--brand-red)] focus-within:ring-4 focus-within:ring-red-50">
              <UserRound className="size-5 text-black/35" aria-hidden="true" />
              <input
                autoComplete="name"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/25"
                name="name"
                placeholder="ชื่อ–นามสกุล"
                required
              />
            </span>
          </label>
        )}
        <label className="block">
          <span className="mb-2 block text-sm font-black">อีเมล</span>
          <span className="flex min-h-14 items-center gap-3 rounded-2xl border border-black/10 px-4 transition focus-within:border-[var(--brand-red)] focus-within:ring-4 focus-within:ring-red-50">
            <Mail className="size-5 text-black/35" aria-hidden="true" />
            <input
              autoComplete="email"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/25"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black">รหัสผ่าน</span>
          <span className="flex min-h-14 items-center gap-3 rounded-2xl border border-black/10 px-4 transition focus-within:border-[var(--brand-red)] focus-within:ring-4 focus-within:ring-red-50">
            <LockKeyhole className="size-5 text-black/35" aria-hidden="true" />
            <input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/25"
              minLength={8}
              name="password"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="grid size-9 place-items-center rounded-full text-black/40 transition hover:bg-black/5"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </span>
        </label>

        {state.error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {state.error}
          </p>
        )}

        <button
          className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--brand-red)] px-6 font-black text-white transition hover:bg-[var(--brand-dark-red)] disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "กำลังดำเนินการ..."
            : mode === "login"
              ? "เข้าสู่ระบบ"
              : "สร้างบัญชี Burken"}
          {!pending && <ArrowRight className="size-5" aria-hidden="true" />}
        </button>
      </form>

      <div className="mt-7 rounded-2xl border border-dashed border-[var(--brand-orange)]/35 bg-orange-50/60 p-4">
        <p className="text-xs font-black text-[var(--brand-red)]">
          บัญชีสำหรับดูตัวอย่าง
        </p>
        <div className="mt-2 grid gap-2 break-all text-xs leading-5 text-black/55 sm:grid-cols-2">
          <span>ลูกค้า: customer@burken.co</span>
          <span>พนักงาน: staff@burken.co</span>
          <span>ผู้ดูแล: admin@burken.co</span>
          <span>ไรเดอร์: rider@burken.co</span>
        </div>
        <p className="mt-2 text-xs font-bold text-black/50">
          รหัสผ่าน: Burken123!
        </p>
      </div>
      {!riderOnly && <a href="/rider/login" className="mt-4 block text-center text-xs font-bold text-[var(--brand-red)] underline underline-offset-4">เข้าสู่ระบบสำหรับไรเดอร์ →</a>}
    </div>
  )
}
