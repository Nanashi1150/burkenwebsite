import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { AuthForm } from "@/components/AuthForm"
import { Logo } from "@/components/Logo"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-6 md:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black transition hover:border-[var(--brand-red)]"
            href="/"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            กลับหน้าร้าน
          </Link>
        </div>
        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden lg:block">
            <p className="text-sm font-black tracking-[0.2em] text-[var(--brand-red)] uppercase">
              One account. Every Burken.
            </p>
            <h2 className="mt-4 max-w-xl text-6xl leading-[0.96] font-black tracking-[-0.06em]">
              หนึ่งบัญชี
              <br />
              อร่อยได้ทุกบทบาท
            </h2>
            <div className="mt-10 space-y-5">
              {[
                "ลูกค้าสั่งอาหาร ดูสถานะ และสะสมคะแนน",
                "พนักงานจัดคิวออเดอร์จากหน้าจอเดียว",
                "ผู้ดูแลเห็นยอดขาย ทีมงาน และเมนูทั้งหมด",
              ].map((item) => (
                <div
                  className="flex items-center gap-3 text-sm font-bold"
                  key={item}
                >
                  <CheckCircle2
                    className="size-5 text-[var(--brand-orange)]"
                    aria-hidden="true"
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <AuthForm />
          </div>
        </div>
      </div>
    </main>
  )
}
