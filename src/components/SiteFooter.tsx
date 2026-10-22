import Link from "next/link"
import { Camera, MapPin, MessageCircle } from "lucide-react"
import { Logo } from "@/components/Logo"

export function SiteFooter() {
  return (
    <footer id="branches" className="bg-[var(--ink)] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-10">
        <div>
          <Logo inverse />
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">
            ร้านเบอร์เกอร์ไก่กรอบที่เชื่อว่าความอร่อยควรสดใหม่ เข้าถึงง่าย
            และทำให้ทุกมื้อสนุกกว่าเดิม
          </p>
        </div>
        <div>
          <p className="text-sm font-black">BURKEN</p>
          <div className="mt-4 grid gap-3 text-sm text-white/55">
            <Link className="transition hover:text-white" href="/#menu">
              เมนูทั้งหมด
            </Link>
            <Link className="transition hover:text-white" href="/#deals">
              โปรโมชัน
            </Link>
            <Link className="transition hover:text-white" href="/login">
              สมัครสมาชิก
            </Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-black">ติดตามความอร่อย</p>
          <div className="mt-4 flex gap-2">
            {[Camera, MessageCircle, MapPin].map((Icon, index) => (
              <span
                className="grid size-11 place-items-center rounded-full border border-white/15 text-white/70"
                key={index}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/35">
        © 2026 Burken. Crispy made better.
      </div>
    </footer>
  )
}
