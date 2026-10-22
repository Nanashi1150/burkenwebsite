"use client"
import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { OrderView } from '@/lib/order-view'

export function AutoScrollItems({ items }: { items: OrderView['items'] }) {
  const region = useRef<HTMLDivElement>(null)
  const holdUntil = useRef(0)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  useEffect(() => {
    const element = region.current
    if (!element || paused || interacting || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let previous = 0
    let endAt = 0
    let scrollPosition = element.scrollTop
    holdUntil.current = performance.now() + 1800
    function tick(now: number) {
      if (!element) return
      const elapsed = previous ? Math.min(now - previous, 80) : 0
      previous = now
      if (now <= holdUntil.current) scrollPosition = element.scrollTop
      if (!document.hidden && now > holdUntil.current) {
        const maximum = element.scrollHeight - element.clientHeight
        if (maximum > 1) {
          if (element.scrollTop >= maximum - 1) {
            if (!endAt) endAt = now + 1800
            if (now >= endAt) { element.scrollTop = 0; scrollPosition = 0; endAt = 0; holdUntil.current = now + 1800 }
          } else { scrollPosition += elapsed * 0.018; element.scrollTop = scrollPosition }
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [items, paused, interacting])
  return <div>
    <div className="mb-2 flex items-center justify-between text-xs"><span className="font-bold text-black/45">รายการอาหาร · {items.length} รายการ</span><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-black/10 px-2.5 font-bold text-black/50">{paused ? <Play className="size-3" /> : <Pause className="size-3" />}{paused ? 'เลื่อนอัตโนมัติ' : 'หยุดเลื่อน'}</button></div>
    <div ref={region} tabIndex={0} role="region" aria-label="รายการอาหาร เลื่อนขึ้นลงเพื่ออ่าน" onPointerEnter={() => setInteracting(true)} onPointerLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={() => setInteracting(false)} onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onWheel={() => { holdUntil.current = performance.now() + 5000 }} className="note-items-scroll max-h-56 overflow-y-auto overscroll-contain rounded-xl bg-white/70 px-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]">
      {items.map((item, index) => <div key={index} className="flex items-start justify-between gap-3 border-b border-black/5 py-3 text-sm last:border-0"><div><p className="font-bold">{item.nameSnapshot}</p><p className="mt-1 text-xs text-black/40">฿{item.unitPrice.toLocaleString('th-TH')} / ชิ้น</p></div><span className="shrink-0 rounded-lg bg-[var(--brand-cream)] px-2 py-1 font-black">×{item.quantity}</span></div>)}
    </div>
  </div>
}
