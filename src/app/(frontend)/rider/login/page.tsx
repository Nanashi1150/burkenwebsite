import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Bike, Camera, MapPin, PackageCheck, Route } from "lucide-react"
import { RiderLoginForm } from "@/components/RiderLoginForm"
import { Logo } from "@/components/Logo"

export const metadata: Metadata = { title: "เข้าสู่ระบบไรเดอร์ | Burken", robots: { index: false, follow: false } }

export default function RiderLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4"><Logo inverse /><span className="border-l border-white/20 pl-4 text-xs font-bold tracking-[0.2em] text-orange-300">RIDER</span></div>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold transition hover:bg-white/10"><ArrowLeft className="size-4" aria-hidden="true" />กลับหน้าร้าน</Link>
        </header>
        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-16">
          <section className="hidden lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-4 py-2 text-xs font-bold tracking-widest text-orange-300"><Bike className="size-4" aria-hidden="true" /> BURKEN DELIVERY TEAM</p>
            <h1 className="mt-6 text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl lg:text-6xl">ทุกเส้นทาง<br />ส่งต่อ<span className="text-orange-400">ความอร่อย</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400 sm:text-base">พื้นที่ทำงานสำหรับทีมไรเดอร์ Burken รับงานจากร้าน ดูจุดหมาย และยืนยันการจัดส่งได้ในที่เดียว</p>
            <div aria-hidden="true" className="my-8 flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10"><PackageCheck className="size-6 text-orange-300" /></div>
              <div className="h-px flex-1 border-t border-dashed border-orange-400/40" />
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-orange-400 text-zinc-950"><Bike className="size-7" /></div>
              <div className="h-px flex-1 border-t border-dashed border-orange-400/40" />
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10"><MapPin className="size-6 text-orange-300" /></div>
            </div>
            <ol className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: PackageCheck, title: "รับงานที่พร้อมส่ง", detail: "ดูรายการอาหารและรายละเอียดงานจากร้าน" },
                { icon: Route, title: "เช็กจุดส่ง ออกเดินทาง", detail: "เปิดเส้นทางนำทางผ่าน Google Maps" },
                { icon: Camera, title: "ถ่ายรูป ยืนยันส่งสำเร็จ", detail: "แนบหลักฐานและติดตามยอดค่าส่งสะสม" },
              ].map(({ icon: Icon, title, detail }, index) => <li key={title} className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-orange-300"><Icon className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-bold"><span className="mr-2 text-orange-300">0{index + 1}</span>{title}</p><p className="mt-1 text-xs leading-6 text-zinc-400">{detail}</p></div></li>)}
            </ol>
          </section>
          <RiderLoginForm />
        </div>
        <footer className="border-t border-white/10 py-5 text-xs text-zinc-500">BURKEN RIDER · ส่งความอร่อยไปด้วยกัน</footer>
      </div>
    </main>
  )
}
