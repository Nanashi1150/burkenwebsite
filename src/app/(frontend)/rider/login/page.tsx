import Link from 'next/link'
import { Bike, MapPin, PackageCheck } from 'lucide-react'
import { AuthForm } from '@/components/AuthForm'
import { Logo } from '@/components/Logo'

export default function RiderLoginPage() {
  return <main className="min-h-screen bg-[var(--surface)]"><div className="mx-auto max-w-[1200px] px-5 py-7 md:px-10"><header className="flex items-center justify-between"><Logo /><Link href="/login" className="min-h-10 rounded-full border border-black/10 px-4 py-2 text-sm font-bold">เข้าสู่ระบบทั่วไป</Link></header><div className="grid items-center gap-10 py-14 lg:min-h-[80vh] lg:grid-cols-2"><section><div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--brand-red)]"><Bike className="size-4" />BURKEN RIDER</div><h1 className="mt-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">ทุกจุดส่ง<br /><span className="text-[var(--brand-red)]">มีความอร่อยรออยู่</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-black/50">รับงานเมื่ออาหารพร้อม ดูหมุดจุดส่งของลูกค้า และอัปเดตทุกขั้นตอนในหน้าจอเดียว</p><div className="mt-8 flex flex-wrap gap-3">{[{ icon: PackageCheck, title: 'รับงานจากร้าน' }, { icon: MapPin, title: 'นำทาง Google Maps' }].map(item => <span key={item.title} className="inline-flex items-center gap-2 rounded-2xl bg-white p-4 text-xs font-bold"><item.icon className="size-5 text-[var(--brand-orange)]" />{item.title}</span>)}</div></section><AuthForm riderOnly /></div></div></main>
}
