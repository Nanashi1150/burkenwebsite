"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Flame,
  LogIn,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react"
import type { StoreMenuItem } from "@/lib/burken-data"
import { checkoutAction } from "@/app/(frontend)/actions"
import { useShoppingSession } from "@/components/ShoppingSession"
import { DeliveryPinPicker } from "@/components/DeliveryMap"
import type { DeliveryLocation } from "@/lib/delivery"

type Category = {
  id: string
  name: string
  label: string
}
type Cart = Record<string, number>

const badgeLabels = {
  "best-seller": "ขายดี",
  new: "ใหม่",
  hot: "เผ็ดร้อน",
  value: "สุดคุ้ม",
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

export function Storefront({
  categories,
  items,
}: {
  categories: Category[]
  items: StoreMenuItem[]
}) {
  const { session, verifySession, clearSession } = useShoppingSession()
  const [activeCategory, setActiveCategory] = useState("all")
  const [cart, setCart] = useState<Cart>({})
  const [cartOwner, setCartOwner] = useState<string | null>(null)
  const [cartStorageLoaded, setCartStorageLoaded] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const closeCartButton = useRef<HTMLButtonElement>(null)
  const cartPanel = useRef<HTMLElement>(null)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [loginPromptReason, setLoginPromptReason] = useState<"login" | "verification" | "customer">("login")
  const [checkingCartSession, setCheckingCartSession] = useState(false)
  const cartSessionRequest = useRef(false)
  const loginPrompt = useRef<HTMLElement>(null)
  const closeLoginPromptButton = useRef<HTMLButtonElement>(null)
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  )
  const [address, setAddress] = useState("")
  const [deliveryMethod, setDeliveryMethod] = useState<"pin" | "address">("pin")
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (session.status === "checking") return
    if (session.status !== "authenticated" || session.user?.role !== "customer") {
      setCart({}); setCartOwner(null); setCartStorageLoaded(true); setCartOpen(false)
      return
    }
    const owner = session.user.id
    let restored: Cart = {}
    try {
      // Unowned legacy carts must never restore into an anonymous or different account.
      const saved = window.localStorage.getItem(`burken-cart:${owner}`)
      const parsed: unknown = saved ? JSON.parse(saved) : null
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        restored = Object.fromEntries(Object.entries(parsed).filter(([id, count]) => items.some(item => item.id === id) && typeof count === "number" && Number.isInteger(count) && count > 0 && count <= 20))
      }
    } catch { /* Storage can be unavailable; the in-memory cart still works. */ }
    setCart(restored); setCartOwner(owner); setCartStorageLoaded(true)
  }, [session.status, session.user?.id, session.user?.role, items])

  useEffect(() => {
    if (!cartOpen && !loginPromptOpen) return
    const body = document.body
    const scrollY = window.scrollY
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const padding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.width = "100%"
    body.style.overflow = "hidden"
    if (scrollbarWidth > 0) body.style.paddingRight = `${padding + scrollbarWidth}px`
    ;(loginPromptOpen ? closeLoginPromptButton.current : closeCartButton.current)?.focus({ preventScroll: true })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setCartOpen(false); setLoginPromptOpen(false); return }
      if (event.key !== "Tab") return
      const panel = loginPromptOpen ? loginPrompt.current : cartPanel.current
      const controls = Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, iframe, [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      Object.assign(body.style, previous)
      window.scrollTo({ top: scrollY, behavior: "instant" })
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [cartOpen, loginPromptOpen])

  useEffect(() => {
    if (!cartStorageLoaded || session.status !== "authenticated" || cartOwner !== session.user?.id || session.user.role !== "customer") return
    try { window.localStorage.setItem(`burken-cart:${cartOwner}`, JSON.stringify(cart)) } catch { /* Keep working without persistence. */ }
  }, [cart, cartOwner, cartStorageLoaded, session.status, session.user?.id, session.user?.role])

  const canUseCart = session.status === "authenticated" && session.user?.role === "customer" && cartOwner === session.user.id
  const cartVerifying = checkingCartSession || session.status === "checking" || !cartStorageLoaded

  const visibleItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category.id === activeCategory)

  const cartItems = useMemo(
    () =>
      items
        .filter((item) => canUseCart && cart[item.id])
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, items, canUseCart],
  )

  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const deliveryFee = fulfillment === "delivery" && cartItems.length ? 39 : 0
  const hero = items.find((item) => item.featured) ?? items[0]

  const requireLogin = (reason: "login" | "verification" | "customer" = "login") => {
    setCartOpen(false)
    setLoginPromptReason(reason)
    setLoginPromptOpen(true)
  }

  const verifyCustomer = async () => {
    const verified = await verifySession()
    if (verified.status === "error") { requireLogin("verification"); return null }
    if (verified.status !== "authenticated" || !verified.user) { requireLogin(); return null }
    if (verified.user.role !== "customer") { requireLogin("customer"); return null }
    return verified.user
  }

  const updateCart = async (id: string, delta: number) => {
    setCheckoutMessage("")
    if (delta > 0) {
      if (cartSessionRequest.current) return false
      cartSessionRequest.current = true
      setCheckingCartSession(true)
      try {
        const customer = await verifyCustomer()
        if (!customer || customer.id !== cartOwner) return false
      } catch {
        requireLogin("verification")
        return false
      } finally {
        cartSessionRequest.current = false
        setCheckingCartSession(false)
      }
    }
    setCart((current) => {
      const next = Math.max(0, (current[id] ?? 0) + delta)
      if (next === 0) {
        const { [id]: _, ...rest } = current
        return rest
      }
      return { ...current, [id]: next }
    })
    return true
  }

  const checkout = () => {
    if (cartSessionRequest.current) return
    startTransition(async () => {
      const customer = await verifyCustomer()
      if (!customer) return
      if (customer.id !== cartOwner || cartItems.length === 0) { setCheckoutMessage("กรุณาเลือกสินค้าในบัญชีที่เข้าสู่ระบบอยู่"); return }
      const result = await checkoutAction({
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
        fulfillment,
        address: deliveryMethod === "address" ? address : undefined,
        deliveryLocation: deliveryMethod === "pin" ? deliveryLocation : undefined,
      })

      if (!result.ok) {
        if (result.code === "AUTH_REQUIRED") { clearSession(); requireLogin(); return }
        if (result.code === "CUSTOMER_REQUIRED") { requireLogin("customer"); return }
        setCheckoutMessage(result.error)
        return
      }

      setCart({})
      setCheckoutMessage(`รับออเดอร์ ${result.orderNumber} แล้ว`)
    })
  }

  if (!hero) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <h1 className="text-4xl font-black">ครัวกำลังเตรียมเมนูใหม่</h1>
          <p className="mt-3 text-black/60">กลับมาอีกครั้งเร็ว ๆ นี้</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <main>
        <section className="relative overflow-hidden bg-[var(--brand-orange)]">
          <div
            className="hero-pattern absolute inset-0 opacity-35"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid min-h-[670px] max-w-[1440px] items-center gap-10 px-5 py-16 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-extrabold text-[var(--brand-red)] shadow-sm">
                <Sparkles className="size-4" aria-hidden="true" />
                BURKEN SIGNATURE
              </div>
              <h1 className="text-balance text-6xl leading-[0.91] font-black tracking-[-0.065em] text-white sm:text-7xl lg:text-[6.3rem]">
                กรอบจริง
                <br />
                อร่อยเต็มคำ
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-8 font-medium text-white/90">
                เบอร์เกอร์ไก่กรอบชิ้นโต ปรุงสดทุกออเดอร์
                พร้อมซอสสูตรเฉพาะที่ทำให้ทุกคำไม่เหมือนใคร
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[var(--brand-red)] px-7 text-base font-black text-white shadow-[0_12px_30px_rgba(184,33,31,0.3)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark-red)]"
                  href="#menu"
                >
                  สั่งเลย เริ่ม ฿119
                  <ArrowRight className="size-5" aria-hidden="true" />
                </a>
                <span className="text-sm font-bold text-white/80">
                  ส่งเร็วใน 30 นาที*
                </span>
              </div>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[650px]">
              <div className="absolute inset-[8%] rounded-full bg-[var(--brand-red)] shadow-[0_35px_80px_rgba(122,24,21,0.32)]" />
              <div className="absolute inset-[14%] rounded-full border-2 border-dashed border-white/45" />
              <Image
                priority
                alt={hero.image.alt}
                className="relative z-10 object-cover [clip-path:circle(40%_at_50%_50%)]"
                fill
                sizes="(max-width: 1024px) 92vw, 50vw"
                src={hero.image.url!}
              />
              <div className="absolute right-[2%] bottom-[13%] z-20 grid size-28 -rotate-6 place-items-center rounded-full border-4 border-white bg-[var(--brand-cream)] text-center text-[var(--brand-red)] shadow-xl">
                <div>
                  <span className="block text-xs font-black">เริ่มเพียง</span>
                  <span className="block text-3xl font-black">
                    ฿{hero.price}
                  </span>
                </div>
              </div>
              <div className="absolute top-[15%] left-[1%] z-20 rounded-2xl bg-white px-5 py-4 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--brand-red)]">
                  <Flame className="size-5 fill-current" aria-hidden="true" />
                  กรอบนอก ฉ่ำใน
                </div>
                <p className="mt-1 text-xs text-black/50">ทอดสดทุกชิ้น</p>
              </div>
            </div>
          </div>
          <div className="ticker overflow-hidden border-y-2 border-white/20 bg-[var(--brand-red)] py-3 text-white">
            <div className="flex min-w-max items-center gap-10 text-sm font-black tracking-wide">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="flex items-center gap-10">
                  ไก่กรอบชิ้นโต{" "}
                  <span className="text-[var(--brand-yellow)]">✦</span>
                  ซอสสูตรพิเศษ{" "}
                  <span className="text-[var(--brand-yellow)]">✦</span>
                  ปรุงสดทุกออเดอร์{" "}
                  <span className="text-[var(--brand-yellow)]">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="menu" className="bg-[var(--surface)] py-20">
          <div className="mx-auto max-w-[1440px] px-5 md:px-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black tracking-[0.18em] text-[var(--brand-red)] uppercase">
                  Fresh from the kitchen
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-[-0.045em] text-[var(--ink)] md:text-6xl">
                  เมนูที่ต้องลอง
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-black/55">
                เลือกความอร่อยในแบบของคุณ ทุกเมนูทำสดจากวัตถุดิบคุณภาพ
                และปรับระดับความเผ็ดได้
              </p>
            </div>

            <div className="mt-10 flex gap-2 overflow-x-auto pb-2">
              <button
                className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-black transition ${
                  activeCategory === "all"
                    ? "bg-[var(--brand-red)] text-white"
                    : "border border-black/10 bg-white hover:border-[var(--brand-red)]"
                }`}
                onClick={() => setActiveCategory("all")}
                type="button"
              >
                ทั้งหมด
              </button>
              {categories.map((category) => (
                <button
                  className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-black transition ${
                    activeCategory === category.id
                      ? "bg-[var(--brand-red)] text-white"
                      : "border border-black/10 bg-white hover:border-[var(--brand-red)]"
                  }`}
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <article
                  className="group overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_12px_40px_rgba(69,31,20,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(69,31,20,0.12)]"
                  key={item.id}
                >
                  <div className="relative aspect-[1.42] overflow-hidden bg-[var(--brand-cream)]">
                    <Image
                      alt={item.image.alt}
                      className="object-cover transition duration-500 group-hover:scale-105"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      src={item.image.url!}
                    />
                    {item.badge && (
                      <span className="absolute top-4 left-4 rounded-full bg-[var(--brand-red)] px-3 py-1.5 text-xs font-black text-white shadow-md">
                        {badgeLabels[item.badge]}
                      </span>
                    )}
                    {item.spiceLevel === "hot" && (
                      <span className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white text-[var(--brand-red)] shadow-md">
                        <Flame
                          className="size-4 fill-current"
                          aria-label="เผ็ด"
                        />
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-extrabold text-[var(--brand-orange)]">
                      {item.category.name}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                      {item.name}
                    </h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-black/55">
                      {item.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-black/45">เริ่มต้น</span>
                        <p className="text-2xl font-black text-[var(--brand-red)]">
                          ฿{formatPrice(item.price)}
                        </p>
                      </div>
                      <button
                        aria-label={`เพิ่ม ${item.name} ลงตะกร้า`}
                        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-black text-white transition hover:bg-[var(--brand-red)] disabled:cursor-wait disabled:opacity-60"
                        disabled={cartVerifying || isPending}
                        aria-busy={cartVerifying}
                        onClick={async () => {
                          if (await updateCart(item.id, 1)) setCartOpen(true)
                        }}
                        type="button"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        เพิ่ม
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="deals" className="bg-white py-20">
          <div className="mx-auto grid max-w-[1440px] gap-5 px-5 md:grid-cols-2 md:px-10">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--brand-red)] p-8 text-white md:p-12">
              <div className="absolute -right-16 -bottom-20 size-72 rounded-full border-[42px] border-white/10" />
              <p className="text-sm font-black text-[var(--brand-yellow)]">
                BURKEN CLUB
              </p>
              <h2 className="mt-3 max-w-md text-4xl leading-tight font-black tracking-[-0.04em]">
                ยิ่งกิน ยิ่งได้แต้ม แลกฟรีได้ทุกสัปดาห์
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/75">
                สมัครสมาชิกวันนี้ รับ 200 แต้มแรกเข้า และดีลเฉพาะสมาชิก
              </p>
              <Link
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[var(--brand-red)]"
                href="/login"
              >
                สมัครสมาชิก
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--brand-yellow)] p-8 text-[var(--ink)] md:p-12">
              <p className="text-sm font-black text-[var(--brand-red)]">
                FRIDAY DROP
              </p>
              <h2 className="mt-3 max-w-md text-4xl leading-tight font-black tracking-[-0.04em]">
                ศุกร์นี้ ซื้อ 2 แถม 1 เมนูไก่กรอบทุกชิ้น
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-black/60">
                เฉพาะสั่งรับที่ร้าน เวลา 14:00–18:00 น. ที่สาขาที่ร่วมรายการ
              </p>
              <a
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ink)] px-6 text-sm font-black text-white"
                href="#menu"
              >
                ดูเมนู
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section
          id="story"
          className="border-t border-black/5 bg-[var(--surface)] py-14"
        >
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 text-center sm:grid-cols-3 md:px-10">
            {[
              ["100%", "ไก่เต็มชิ้น ไม่ใช้เนื้อบด"],
              ["12 นาที", "เวลาเฉลี่ยในการปรุงสด"],
              ["4.9/5", "คะแนนจากสมาชิก Burken"],
            ].map(([value, label]) => (
              <div key={value}>
                <p className="text-4xl font-black text-[var(--brand-red)]">
                  {value}
                </p>
                <p className="mt-2 text-sm font-bold text-black/55">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {portalReady && createPortal(<>
      <button
        aria-label={`เปิดตะกร้า มี ${quantity} ชิ้น`}
        className="fixed right-5 bottom-5 z-30 inline-flex min-h-14 items-center gap-3 rounded-full bg-[var(--brand-red)] px-5 font-black text-white shadow-[0_14px_35px_rgba(184,33,31,0.35)] transition hover:-translate-y-1 md:right-8 md:bottom-8"
        onClick={async () => { if (await verifyCustomer()) setCartOpen(true) }}
        disabled={cartVerifying}
        type="button"
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        ตะกร้า
        <span className="grid size-7 place-items-center rounded-full bg-white text-xs text-[var(--brand-red)]">
          {quantity}
        </span>
      </button>

      <div
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/45 transition ${
          cartOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setCartOpen(false)}
      />
      <aside
        ref={cartPanel}
        role="dialog"
        aria-modal={cartOpen || undefined}
        aria-hidden={!cartOpen}
        inert={!cartOpen}
        aria-label="ตะกร้าสินค้า"
        className={`fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="text-xs font-black tracking-wider text-[var(--brand-red)] uppercase">
              Your order
            </p>
            <h2 className="text-2xl font-black">ตะกร้าของคุณ</h2>
          </div>
          <button
            ref={closeCartButton}
            aria-label="ปิดตะกร้า"
            className="grid size-11 place-items-center rounded-full bg-black/5 transition hover:bg-black/10"
            onClick={() => setCartOpen(false)}
            type="button"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {cartItems.length === 0 ? (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <ShoppingBag
                  className="mx-auto size-12 text-black/15"
                  aria-hidden="true"
                />
                <p className="mt-4 text-lg font-black">ยังไม่มีเมนูในตะกร้า</p>
                <p className="mt-1 text-sm text-black/50">
                  เลือกของอร่อยสักชิ้นก่อนนะ
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div
                  className="flex gap-4 rounded-2xl bg-[var(--surface)] p-3"
                  key={item.id}
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      alt={item.image.alt}
                      className="object-cover"
                      fill
                      src={item.image.url!}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{item.name}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--brand-red)]">
                      ฿{formatPrice(item.price * item.quantity)}
                    </p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-white">
                      <button
                        aria-label={`ลดจำนวน ${item.name}`}
                        className="grid size-8 place-items-center"
                        onClick={() => updateCart(item.id, -1)}
                        type="button"
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center text-sm font-black">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`เพิ่มจำนวน ${item.name}`}
                        className="grid size-8 place-items-center disabled:cursor-wait disabled:opacity-40"
                        disabled={cartVerifying || isPending}
                        onClick={() => updateCart(item.id, 1)}
                        type="button"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-black">รับอาหารแบบไหน</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1">
                {(["pickup", "delivery"] as const).map((mode) => (
                  <button
                    className={`min-h-11 rounded-xl text-sm font-black transition ${
                      fulfillment === mode
                        ? "bg-white text-[var(--brand-red)] shadow-sm"
                        : ""
                    }`}
                    key={mode}
                    onClick={() => setFulfillment(mode)}
                    type="button"
                  >
                    {mode === "pickup" ? "รับที่ร้าน" : "จัดส่ง +฿39"}
                  </button>
                ))}
              </div>
              {fulfillment === "delivery" && (
                <>
                <fieldset className="mt-4">
                  <legend className="text-sm font-bold">ระบุจุดจัดส่งด้วย</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([['pin', 'หมุดจุดจัดส่ง'], ['address', 'กรอกที่อยู่']] as const).map(([method, label]) => <label key={method} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${deliveryMethod === method ? 'border-[var(--brand-red)] bg-red-50 text-[var(--brand-red)]' : 'border-black/10 bg-white text-black/50'}`}><input type="radio" name="delivery-method" value={method} checked={deliveryMethod === method} onChange={() => setDeliveryMethod(method)} className="accent-[var(--brand-red)]" />{label}</label>)}
                  </div>
                </fieldset>
                <label htmlFor="delivery-address" className="mt-4 block text-sm font-bold">ที่อยู่และรายละเอียดจุดส่ง</label>
                <textarea
                  id="delivery-address"
                  className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-sm outline-none transition placeholder:text-black/30 focus:border-[var(--brand-red)] disabled:cursor-not-allowed disabled:bg-black/5 disabled:opacity-40"
                  disabled={deliveryMethod === "pin"}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="กรอกที่อยู่จัดส่ง"
                  value={address}
                  maxLength={2000}
                />
                {deliveryMethod === "pin" ? <><p className="mt-2 text-xs text-black/45">ใช้หมุดเป็นจุดจัดส่ง ไม่ต้องกรอกที่อยู่ กรุณาตรวจสอบหมุดก่อนยืนยัน</p><DeliveryPinPicker value={deliveryLocation} onChange={setDeliveryLocation} /></> : <p className="mt-2 text-xs text-black/45">กรอกบ้านเลขที่ ถนน และรายละเอียดให้ครบ ไรเดอร์จะใช้ที่อยู่นี้ในการจัดส่ง</p>}
                </>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-black/10 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {checkoutMessage && (
            <p
              className={`mb-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${
                checkoutMessage.startsWith("รับออเดอร์")
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {checkoutMessage.startsWith("รับออเดอร์") && (
                <Check className="size-4" aria-hidden="true" />
              )}
              {checkoutMessage}
            </p>
          )}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-black/45">ยอดรวม</p>
              <p className="text-sm text-black/55">รวมค่าจัดส่งแล้ว</p>
            </div>
            <p className="text-3xl font-black text-[var(--brand-red)]">
              ฿{formatPrice(subtotal + deliveryFee)}
            </p>
          </div>
          <button
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-6 font-black text-white transition hover:bg-[var(--brand-dark-red)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canUseCart || cartItems.length === 0 || isPending || cartVerifying}
            onClick={checkout}
            type="button"
          >
            {isPending ? "กำลังส่งออเดอร์..." : "ยืนยันการสั่งอาหาร"}
            {!isPending && <ArrowRight className="size-5" aria-hidden="true" />}
          </button>
          <p className="mt-3 text-center text-xs text-black/40">
            {canUseCart ? "ยืนยันออเดอร์ในบัญชีลูกค้าที่เข้าสู่ระบบอยู่" : "กรุณาเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสั่งอาหาร"}
          </p>
        </div>
      </aside>
      {loginPromptOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setLoginPromptOpen(false) }}>
        <section ref={loginPrompt} role="alertdialog" aria-modal="true" aria-labelledby="cart-login-title" aria-describedby="cart-login-description" className="page-enter relative w-full max-w-sm rounded-[2rem] bg-white px-6 pb-6 pt-10 text-center shadow-2xl">
          <button ref={closeLoginPromptButton} type="button" aria-label="ปิดแจ้งเตือนเข้าสู่ระบบ" onClick={() => setLoginPromptOpen(false)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/5 transition hover:bg-black/10"><X className="size-4" aria-hidden="true" /></button>
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--brand-cream)] text-[var(--brand-red)]"><LogIn className="size-7" aria-hidden="true" /></span>
          <h2 id="cart-login-title" className="mt-5 text-2xl font-black tracking-tight">{loginPromptReason === "verification" ? "ตรวจสอบการเข้าสู่ระบบไม่ได้" : loginPromptReason === "customer" ? "กรุณาใช้บัญชีลูกค้า" : "กรุณาเข้าสู่ระบบก่อน"}</h2>
          <p id="cart-login-description" className="mt-3 text-sm leading-6 text-black/55">{loginPromptReason === "verification" ? "ยังไม่เพิ่มสินค้าหรือยืนยันออเดอร์จนกว่าจะตรวจสอบสำเร็จ กรุณาลองใหม่หรือเข้าสู่ระบบอีกครั้ง" : loginPromptReason === "customer" ? "บัญชีพนักงาน ผู้ดูแล และไรเดอร์ใช้สำหรับจัดการงาน กรุณาเข้าสู่ระบบด้วยบัญชีลูกค้าเพื่อสั่งอาหาร" : "เข้าสู่ระบบเพื่อเพิ่มสินค้าลงตะกร้าและสั่งมื้ออร่อยของคุณ"}</p>
          {loginPromptReason === "verification" && <button type="button" onClick={async () => { if (await verifyCustomer()) setLoginPromptOpen(false) }} className="mt-4 min-h-11 w-full rounded-full border border-black/10 text-sm font-bold">ตรวจสอบอีกครั้ง</button>}
          <Link href="/login" onClick={() => setLoginPromptOpen(false)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-5 text-sm font-black text-white transition hover:bg-[var(--brand-dark-red)]">เข้าสู่ระบบ<ArrowRight className="size-4" aria-hidden="true" /></Link>
          <button type="button" onClick={() => setLoginPromptOpen(false)} className="mt-2 min-h-11 w-full rounded-full text-sm font-bold text-black/50 transition hover:bg-black/5">เลือกดูเมนูต่อ</button>
        </section>
      </div>}
      </>, document.body)}
    </>
  )
}
