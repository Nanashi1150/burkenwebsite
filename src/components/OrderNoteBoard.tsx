"use client"

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, MapPin, Pin, ShoppingBag, X } from 'lucide-react'
import { updateOrderAction } from '@/app/(frontend)/actions'
import { orderStatusLabels, type OrderView } from '@/lib/order-view'
import { AutoScrollItems } from './AutoScrollItems'
import { DeliveryMap } from './DeliveryMap'

const tabs = [
  { value: 'received', label: 'ออเดอร์เข้า' }, { value: 'preparing', label: 'กำลังปรุง' },
  { value: 'ready', label: 'พร้อมส่งมอบ' }, { value: 'delivering', label: 'กำลังจัดส่ง' },
] as const

export function OrderNoteBoard({ orders }: { orders: OrderView[] }) {
  const [filter, setFilter] = useState<string>('received')
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [mapOrderID, setMapOrderID] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const rail = useRef<HTMLDivElement>(null)
  const positions = useRef(new Map<string, number>())
  const previousSelection = useRef<string | null>(null)
  const router = useRouter()
  const visible = orders.filter(order => order.status === filter)
  const active = visible.find(order => order.id === selected)

  useEffect(() => {
    const element = rail.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return
      // Keep the food list and other vertically scrollable details usable.
      let target = event.target instanceof HTMLElement ? event.target : null
      while (target && target !== element) {
        if (target.scrollHeight > target.clientHeight && /auto|scroll/.test(getComputedStyle(target).overflowY)) return
        target = target.parentElement
      }
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const distance = delta * (event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? element.clientWidth : 1)
      const next = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, element.scrollLeft + distance))
      if (next === element.scrollLeft) return
      event.preventDefault()
      element.scrollLeft = next
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  useLayoutEffect(() => {
    const element = rail.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nextPositions = new Map<string, number>()
    for (const note of element.querySelectorAll<HTMLElement>('[data-note-id]')) {
      const id = note.dataset.noteId!
      const previous = positions.current.get(id)
      if (!reduced && previous !== undefined && previous !== note.offsetLeft) note.animate([{ transform: `translateX(${previous - note.offsetLeft}px)` }, { transform: 'translateX(0)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' })
      nextPositions.set(id, note.offsetLeft)
      if (id === selected && selected !== previousSelection.current) element.scrollTo({ left: note.offsetLeft, behavior: reduced ? 'instant' : 'smooth' })
    }
    positions.current = nextPositions
    previousSelection.current = selected
  }, [selected, filter, orders])

  function changeStatus(order: OrderView, operation: 'prepare' | 'ready' | 'complete') {
    setMessage('')
    startTransition(async () => {
      const result = await updateOrderAction(order.id, operation)
      setMessage(result.ok ? 'อัปเดตออเดอร์แล้ว' : result.error)
      if (result.ok) { setSelected(null); router.refresh() }
    })
  }
  return <section className="mt-6 overflow-hidden rounded-3xl border border-black/5 bg-white p-4 shadow-[0_12px_35px_rgba(69,31,20,0.03)] md:p-6" aria-label="กระดานโน้ตออเดอร์">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-sm font-black tracking-[.2em] text-[var(--brand-orange)]">KITCHEN BOARD</h2></div>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-black/40 sm:block">เลื่อนเพื่อดูออเดอร์ถัดไป</span><button type="button" aria-label="เลื่อนโน้ตไปทางซ้าย" onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: 'smooth' })} className="grid size-10 place-items-center rounded-full border border-black/10 transition hover:bg-orange-50"><ChevronLeft className="size-4" /></button><button type="button" aria-label="เลื่อนโน้ตไปทางขวา" onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: 'smooth' })} className="grid size-10 place-items-center rounded-full border border-black/10 transition hover:bg-orange-50"><ChevronRight className="size-4" /></button></div>
    </div>
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="กรองสถานะออเดอร์">
      {tabs.map(tab => <button key={tab.value} type="button" aria-pressed={filter === tab.value} onClick={() => { setFilter(tab.value); setSelected(null); rail.current?.scrollTo({ left: 0 }) }} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black transition ${filter === tab.value ? 'bg-[var(--ink)] text-white' : 'bg-[var(--surface)] text-black/50 hover:bg-orange-100'}`}>{tab.label}<span className={`rounded-full px-2 py-0.5 ${filter === tab.value ? 'bg-white/15' : 'bg-black/5'}`}>{orders.filter(order => order.status === tab.value).length}</span></button>)}
    </div>
    <p aria-live="polite" className="mt-3 min-h-5 text-xs font-bold text-[var(--brand-red)]">{message || (active ? 'ปักหมุดแล้ว · อ่านรายละเอียดด้านขวา' : 'เลือกโน้ตเพื่อดูรายละเอียดและจัดการออเดอร์')}</p>
    <div ref={rail} className="order-note-rail relative flex items-stretch gap-4 overflow-x-auto overscroll-x-contain pb-6 pt-6" tabIndex={0} role="region" aria-label="โน้ตออเดอร์ เลื่อนซ้ายขวา">
      {visible.map((order, index) => <Fragment key={order.id}>
        <button type="button" data-note-id={order.id} data-selected={order.id === selected} aria-expanded={order.id === selected} aria-controls={order.id === selected ? `detail-${order.id}` : undefined} onClick={() => { setSelected(value => value === order.id ? null : order.id); setMessage('') }} className="order-paper-note relative flex shrink-0 flex-col text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]">
          {order.id === selected && <span className="note-pin pointer-events-none absolute -left-1 -top-4 z-10 -rotate-[28deg] text-[var(--brand-red)] drop-shadow-md"><Pin className="size-9 fill-[var(--brand-red)] stroke-white stroke-[1.5]" /></span>}
          <div className={`note-paper relative flex min-h-72 flex-1 flex-col rounded-t-lg border border-black/5 p-5 ${index % 3 === 1 ? 'bg-[#fff3da]' : 'bg-[#fff8ed]'}`}>
            <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-black tracking-[.16em] text-black/30">BURKEN / ORDER</span><span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-black/45">{order.fulfillment === 'pickup' ? 'รับที่ร้าน' : 'จัดส่ง'}</span></div>
            <p className="mt-4 flex items-center gap-2 break-all text-lg font-black tracking-tight text-[var(--brand-red)]">#{order.orderNumber}{order.fulfillment === 'delivery' && <MapPin className="size-4 shrink-0" aria-label="มีจุดจัดส่ง" />}</p>
            <p className="mt-1 truncate text-xs font-bold text-black/45">{order.customerName}</p>
            <div className="mt-4 flex-1 space-y-2 border-t border-dashed border-black/15 pt-4">{order.items.slice(0, 3).map((item, i) => <p key={i} className="flex justify-between gap-2 text-sm leading-6 text-black/65"><span className="line-clamp-1">{item.nameSnapshot}</span><strong className="shrink-0">×{item.quantity}</strong></p>)}{order.items.length > 3 && <p className="text-xs text-black/35">และอีก {order.items.length - 3} รายการ</p>}</div>
            <div className="mt-5 flex items-center justify-between border-t border-dashed border-black/15 pt-3"><span className="flex items-center gap-1 text-[10px] text-black/40"><Clock3 className="size-3" />{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })}</span><span className="text-sm font-black">฿{order.total.toLocaleString('th-TH')}</span></div>
            <span className={`mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-xs font-black ${order.id === selected ? 'bg-[var(--brand-red)] text-white' : 'bg-[var(--ink)] text-white'}`}>{order.id === selected ? 'ปักหมุดออเดอร์แล้ว' : 'ดูรายละเอียด'}<ArrowRight className="size-3.5" /></span>
          </div>
        </button>
        {order.id === selected && <section id={`detail-${order.id}`} aria-label={`รายละเอียดออเดอร์ ${order.orderNumber}`} className="order-note-detail note-detail-enter shrink-0 rounded-2xl border border-[var(--brand-orange)]/25 bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-start justify-between gap-2"><div><p className="text-[10px] font-black tracking-[.15em] text-[var(--brand-orange)]">ORDER DETAILS</p><div className="mt-1 flex items-center gap-2"><h3 className="text-lg font-black">#{order.orderNumber}</h3>{order.fulfillment === 'delivery' && <button type="button" aria-label={`GPS ${order.orderNumber}`} aria-expanded={mapOrderID === order.id} onClick={() => setMapOrderID(value => value === order.id ? null : order.id)} className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[var(--brand-red)]"><MapPin className="size-4" /></button>}</div><p className="mt-1 text-xs text-black/45">{orderStatusLabels[order.status]} · {order.customerName}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="ปิดรายละเอียดออเดอร์" className="grid size-9 shrink-0 place-items-center rounded-full bg-white"><X className="size-4" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2"><AutoScrollItems key={order.id} items={order.items} /><div className="space-y-3">{order.fulfillment === 'delivery' ? <>{mapOrderID === order.id && <DeliveryMap location={order.deliveryLocation} address={order.address} />}</> : <div className="rounded-2xl bg-white p-4"><ShoppingBag className="size-6 text-[var(--brand-orange)]" /><p className="mt-2 text-sm font-bold">ลูกค้ารับอาหารที่ร้าน</p><p className="mt-1 text-xs leading-5 text-black/40">จัดเตรียมออเดอร์ให้พร้อม แล้วกดยืนยันเมื่อส่งมอบอาหาร</p></div>}<p className="text-xs text-black/50">{order.riderId ? `ไรเดอร์: ${order.riderName || 'รับงานแล้ว'}` : order.fulfillment === 'delivery' ? 'ไรเดอร์รับงานได้เมื่ออาหารพร้อม' : ''}</p></div></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4"><p className="text-sm font-black">รวม ฿{order.total.toLocaleString('th-TH')}</p>{order.status === 'received' ? <button disabled={pending} onClick={() => changeStatus(order, 'prepare')} type="button" className="note-action"><Check className="size-4" />{pending ? 'กำลังอัปเดต…' : 'รับออเดอร์ / เริ่มปรุง'}</button> : order.status === 'preparing' ? <button disabled={pending} onClick={() => changeStatus(order, 'ready')} type="button" className="note-action"><Check className="size-4" />{pending ? 'กำลังอัปเดต…' : 'อาหารพร้อมแล้ว'}</button> : order.status === 'ready' && order.fulfillment === 'pickup' ? <button disabled={pending} onClick={() => changeStatus(order, 'complete')} type="button" className="note-action"><Check className="size-4" />{pending ? 'กำลังอัปเดต…' : 'ส่งมอบให้ลูกค้าแล้ว'}</button> : <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-red)]"><MapPin className="size-4" />{order.status === 'delivering' ? 'ไรเดอร์กำลังจัดส่ง' : order.riderId ? 'รอไรเดอร์รับอาหาร' : 'รอไรเดอร์รับงาน'}</span>}</div>
        </section>}
      </Fragment>)}
      {active && <div aria-hidden="true" className="order-note-tail shrink-0" />}
      {visible.length === 0 && <div className="flex min-h-64 w-full items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[var(--surface)] text-sm text-black/40">ยังไม่มีออเดอร์ในขั้นตอนนี้</div>}
    </div>
  </section>
}
