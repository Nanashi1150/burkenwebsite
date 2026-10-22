"use client"

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, CheckCircle2, MapPin, Navigation, PackageCheck } from 'lucide-react'
import { updateOrderAction, uploadDeliveryPhotoAction } from '@/app/(frontend)/actions'
import { orderStatusLabels, type OrderView } from '@/lib/order-view'
import { DeliveryMap } from './DeliveryMap'
import { AutoScrollItems } from './AutoScrollItems'

export function RiderDashboard({ orders, riderID, earnedTotal = 0 }: { orders: OrderView[]; riderID: string; earnedTotal?: number }) {
  const [tab, setTab] = useState<'available' | 'active' | 'history'>('available')
  const [message, setMessage] = useState('')
  const [busyID, setBusyID] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const inFlight = useRef(false)
  const [photos, setPhotos] = useState<Record<string, File>>({})
  const groups = {
    available: orders.filter(order => order.fulfillment === 'delivery' && order.status === 'ready' && !order.riderId && (order.deliveryLocation || order.address?.trim())),
    active: orders.filter(order => order.riderId === riderID && ['ready', 'delivering'].includes(order.status)),
    history: orders.filter(order => order.riderId === riderID && ['completed', 'cancelled'].includes(order.status)),
  }
  function change(order: OrderView, operation: 'accept' | 'pickup' | 'deliver') {
    if (inFlight.current) return
    if (operation === 'deliver' && !photos[order.id]) { setMessage('กรุณาถ่ายรูปยืนยันการจัดส่งก่อน'); return }
    inFlight.current = true
    setBusyID(order.id); setMessage('')
    startTransition(async () => {
      try {
      let photoID: string | undefined
      if (operation === 'deliver') {
        const form = new FormData()
        form.set('orderID', order.id); form.set('photo', photos[order.id])
        const uploaded = await uploadDeliveryPhotoAction(form)
        if (!uploaded.ok) { setMessage(uploaded.error); return }
        photoID = uploaded.photoID
      }
      const result = await updateOrderAction(order.id, operation, photoID)
      setMessage(result.ok ? operation === 'accept' ? 'รับงานแล้ว ดูได้ในแท็บงานของฉัน' : 'อัปเดตสถานะจัดส่งแล้ว' : result.error)
      if (result.ok) { if (operation === 'accept') setTab('active'); router.refresh() }
      } catch { setMessage('ดำเนินการไม่ได้ กรุณาลองอีกครั้ง') }
      finally { setBusyID(null); inFlight.current = false }
    })
  }
  return <section aria-label="งานจัดส่งของไรเดอร์">
    <article className="mb-4 rounded-3xl bg-[var(--ink)] p-6 text-white"><p className="text-sm font-bold text-white/65">ค่าจัดส่งสะสมจากงานที่ส่งสำเร็จ</p><p className="mt-2 text-3xl font-black">฿{earnedTotal.toLocaleString('th-TH')}</p><p className="mt-2 text-xs text-white/50">รวมทุกงานที่ส่งสำเร็จของคุณ ไม่รวมงานกำลังส่งและงานยกเลิก</p></article>
    <div className="grid gap-4 sm:grid-cols-3">{[{ title: 'พร้อมให้รับงาน', value: groups.available.length, icon: MapPin }, { title: 'งานของฉัน', value: groups.active.length, icon: Bike }, { title: 'ส่งสำเร็จ', value: groups.history.filter(order => order.status === 'completed').length, icon: CheckCircle2 }].map(stat => <article key={stat.title} className="flex items-center justify-between rounded-3xl border border-black/5 bg-white p-6"><div><p className="text-xs font-bold text-black/45">{stat.title}</p><p className="mt-2 text-3xl font-black">{stat.value} <span className="text-sm font-bold text-black/35">งาน</span></p></div><stat.icon className="size-7 text-[var(--brand-red)]" /></article>)}</div>
    <div className="mt-6 flex flex-wrap gap-2">{([{ id: 'available', title: 'งานพร้อมรับ' }, { id: 'active', title: 'งานของฉัน' }, { id: 'history', title: 'ประวัติการส่ง' }] as const).map(item => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 rounded-full px-5 text-sm font-black transition ${tab === item.id ? 'bg-[var(--ink)] text-white' : 'bg-white text-black/50'}`}>{item.title} · {groups[item.id].length}</button>)}</div>
    <p aria-live="polite" className="my-4 min-h-5 text-sm font-bold text-[var(--brand-red)]">{message || 'อัปเดตงานอัตโนมัติทุก 10 วินาที'}</p>
    <div className="grid items-start gap-5 lg:grid-cols-2">{groups[tab].map(order => <article key={order.id} className="note-detail-enter overflow-hidden rounded-3xl border border-black/5 bg-white p-5 md:p-6"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.18em] text-[var(--brand-orange)]">BURKEN DELIVERY</p><h2 className="mt-1 text-xl font-black text-[var(--brand-red)]">#{order.orderNumber}</h2></div><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[var(--brand-orange)]">{orderStatusLabels[order.status]}</span></div>
      <DeliveryMap location={order.deliveryLocation} address={order.address} navigate />
      <div className="mt-4"><AutoScrollItems items={order.items} /></div>
      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4"><p className="text-sm font-black">ยอดออเดอร์ ฿{order.total.toLocaleString('th-TH')}</p><span className="text-xs text-black/45">ค่าส่ง ฿{order.deliveryFee}</span></div>
      {tab === 'active' && order.status === 'delivering' && <label className="mt-4 block rounded-2xl border border-dashed border-black/15 p-4 text-sm font-bold">รูปยืนยันการจัดส่ง<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={pending} onChange={event => { const file = event.target.files?.[0]; if (file && file.size <= 5 * 1024 * 1024) setPhotos(current => ({ ...current, [order.id]: file })); else { setPhotos(current => { const next = { ...current }; delete next[order.id]; return next }); setMessage('JPEG, PNG, WebP / 5 MB'); } }} className="mt-3 block w-full text-xs" />{photos[order.id] && <span className="mt-2 block truncate text-xs text-emerald-700">{photos[order.id].name}</span>}</label>}
      {order.deliveryPhotoId && <a href={`/api/app/delivery-photo/${order.deliveryPhotoId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-[var(--brand-red)]">ดูรูปยืนยันการจัดส่ง</a>}
      {tab !== 'history' && <button type="button" disabled={pending || (order.status === 'delivering' && !photos[order.id])} onClick={() => change(order, tab === 'available' ? 'accept' : order.status === 'ready' ? 'pickup' : 'deliver')} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-5 text-sm font-black text-white transition hover:bg-[var(--brand-dark-red)] disabled:opacity-50">{order.status === 'delivering' ? <CheckCircle2 className="size-4" /> : tab === 'available' ? <Bike className="size-4" /> : <PackageCheck className="size-4" />}{pending && busyID === order.id ? 'กำลังอัปเดต…' : tab === 'available' ? 'รับงานจัดส่งนี้' : order.status === 'ready' ? 'รับอาหารแล้ว / เริ่มนำส่ง' : 'ยืนยันส่งถึงลูกค้าแล้ว'}</button>}
      {tab === 'active' && <p className="mt-3 flex items-center justify-center gap-1 text-xs text-black/40"><Navigation className="size-3" />ใช้ลิงก์นำทางด้านบนเพื่อเปิดเส้นทาง Google Maps</p>}
    </article>)}</div>
    {groups[tab].length === 0 && <div className="mt-4 rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center"><Bike className="mx-auto size-10 text-[var(--brand-orange)]/50" /><h2 className="mt-4 text-lg font-black">{tab === 'available' ? 'ยังไม่มีงานพร้อมรับ' : tab === 'active' ? 'ยังไม่มีงานที่กำลังส่ง' : 'ยังไม่มีประวัติการจัดส่ง'}</h2><p className="mt-2 text-sm text-black/45">{tab === 'available' ? 'ออเดอร์จัดส่งที่อาหารพร้อมและมีหมุดจุดส่งจะปรากฏที่นี่' : 'งานที่คุณรับจะแสดงในหน้านี้'}</p></div>}
  </section>
}
