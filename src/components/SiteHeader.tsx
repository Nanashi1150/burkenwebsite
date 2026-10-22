"use client"

import Link from "next/link"
import { LogOut, MapPin, UserRound } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useShoppingSession } from "@/components/ShoppingSession"
import { logoutAction } from "@/app/(frontend)/actions"

export function SiteHeader() {
  const { session, verifySession, clearSession } = useShoppingSession()
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Logo />
        <nav
          className="hidden items-center gap-8 text-sm font-bold lg:flex"
          aria-label="เมนูหลัก"
        >
          <Link
            className="transition hover:text-[var(--brand-red)]"
            href="/#menu"
          >
            เมนู
          </Link>
          <Link
            className="transition hover:text-[var(--brand-red)]"
            href="/#deals"
          >
            โปรโมชัน
          </Link>
          <Link
            className="transition hover:text-[var(--brand-red)]"
            href="/#story"
          >
            เรื่องของเรา
          </Link>
          <Link
            className="inline-flex items-center gap-2 text-black/60 transition hover:text-[var(--brand-red)]"
            href="/#branches"
          >
            <MapPin className="size-4" aria-hidden="true" />
            สาขาใกล้ฉัน
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
        {session.status === "checking" ? <span role="status" className="text-xs text-black/45">กำลังตรวจสอบการเข้าสู่ระบบ…</span> : session.status === "authenticated" && session.user ? <>
          <Link href="/portal" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-bold text-emerald-800"><UserRound className="size-4 shrink-0" aria-hidden="true" /><span className="max-w-32 truncate"><span className="block text-[10px] font-bold">เข้าสู่ระบบแล้ว</span>{session.user.name}</span></Link>
          <form action={logoutAction} onSubmit={clearSession}><button type="submit" aria-label="ออกจากระบบ" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-3 text-xs font-bold text-black/55 transition hover:bg-black/5"><LogOut className="size-4" /><span className="hidden sm:inline">ออกจากระบบ</span></button></form>
        </> : session.status === "error" ? <button type="button" onClick={() => void verifySession()} className="min-h-11 rounded-full border border-orange-200 px-4 text-xs font-bold text-[var(--brand-red)]">ตรวจสอบสถานะอีกครั้ง</button> : <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--brand-red)] hover:text-[var(--brand-red)]"
          href="/login"
        >
          <UserRound className="size-4" aria-hidden="true" />
          เข้าสู่ระบบ
        </Link>}
        </div>
      </div>
    </header>
  )
}
