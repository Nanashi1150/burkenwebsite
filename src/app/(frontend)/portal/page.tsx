import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  Clock3,
  Coins,
  LayoutDashboard,
  PackageCheck,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import type { Order, User } from "@/payload-types"
import { logoutAction } from "@/app/(frontend)/actions"
import { Logo } from "@/components/Logo"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { OrderNoteBoard } from "@/components/OrderNoteBoard"
import { RiderDashboard } from "@/components/RiderDashboard"
import { PortalRefresh } from "@/components/PortalRefresh"
import { DeliveryMap } from "@/components/DeliveryMap"
import { orderStatusLabels, toOrderView } from "@/lib/order-view"
import { validLocation, googleMapsURL } from "@/lib/delivery"

const roleLabels = {
  customer: "ลูกค้า",
  staff: "พนักงาน",
  admin: "ผู้ดูแลระบบ",
  rider: "ไรเดอร์",
}

const statusLabels = orderStatusLabels

function formatPrice(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode
  label: string
  value: string
  helper: string
}) {
  return (
    <article className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_12px_35px_rgba(69,31,20,0.05)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-black/45">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{value}</p>
        </div>
        <span className="grid size-11 place-items-center rounded-2xl bg-red-50 text-[var(--brand-red)]">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-bold text-black/40">{helper}</p>
    </article>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white">
      <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
        <div>
          <h2 className="text-xl font-black">ออเดอร์ล่าสุด</h2>
          <p className="mt-1 text-xs text-black/45">
            อัปเดตจากระบบหน้าร้านแบบเรียลไทม์
          </p>
        </div>
        <ShoppingBag
          className="size-5 text-[var(--brand-red)]"
          aria-hidden="true"
        />
      </div>
      {orders.length === 0 ? (
        <div className="p-10 text-center text-sm text-black/45">
          ยังไม่มีออเดอร์ในระบบ
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs text-black/45">
              <tr>
                <th className="px-6 py-3 font-black">ออเดอร์</th>
                <th className="px-6 py-3 font-black">รายการ</th>
                <th className="px-6 py-3 font-black">รับอาหาร</th>
                <th className="px-6 py-3 font-black">สถานะ</th>
                <th className="px-6 py-3 text-right font-black">ยอดรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 font-black text-[var(--brand-red)]">
                    #{order.orderNumber}
                  </td>
                  <td className="px-6 py-4 text-black/60">
                    {order.items
                      .map((item) => `${item.nameSnapshot} ×${item.quantity}`)
                      .join(", ")}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {order.fulfillment === "pickup" ? "รับที่ร้าน" : "จัดส่ง"}
                    {order.fulfillment === "delivery" && validLocation(order.deliveryLocation) && <a href={googleMapsURL(order.deliveryLocation)} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-bold text-[var(--brand-red)] underline underline-offset-2">ดูหมุดจุดส่ง ↗</a>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[var(--brand-orange)]">
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black">
                    ฿{formatPrice(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

async function CustomerDashboard({
  user,
  orders,
}: {
  user: User
  orders: Order[]
}) {
  const activeOrder = orders.find((order) => order.status === "delivering") ?? orders.find((order) =>
    ["received", "preparing", "ready", "delivering"].includes(order.status),
  )
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          helper="อีก 520 แต้ม รับเบอร์เกอร์ฟรี"
          icon={<Coins className="size-5" aria-hidden="true" />}
          label="คะแนน Burken Club"
          value={`${formatPrice(user.points ?? 0)} แต้ม`}
        />
        <StatCard
          helper="รวมทุกช่องทางในบัญชีนี้"
          icon={<ShoppingBag className="size-5" aria-hidden="true" />}
          label="ออเดอร์ทั้งหมด"
          value={`${orders.length} ออเดอร์`}
        />
        <StatCard
          helper={
            activeOrder ? `#${activeOrder.orderNumber}` : "พร้อมรับออเดอร์ใหม่"
          }
          icon={<Clock3 className="size-5" aria-hidden="true" />}
          label="ออเดอร์ที่กำลังทำ"
          value={activeOrder ? statusLabels[activeOrder.status] : "ไม่มี"}
        />
      </div>
      {activeOrder && (
        <section className="mt-6 overflow-hidden rounded-3xl bg-[var(--brand-red)] p-7 text-white">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black text-[var(--brand-yellow)]">
                ออเดอร์ #{activeOrder.orderNumber}
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {statusLabels[activeOrder.status]}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {activeOrder.status === "delivering" ? "ไรเดอร์รับอาหารแล้ว กำลังนำส่งไปยังหมุดที่คุณเลือก" : activeOrder.rider ? "ไรเดอร์รับงานแล้ว รอรับอาหารจากร้าน" : "ร้านกำลังดำเนินการตามสถานะด้านบน"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {["received", "preparing", "ready", ...(activeOrder.fulfillment === "delivery" ? ["delivering"] : [])].map((status) => {
                const complete =
                  ["received", "preparing", "ready", "delivering"].indexOf(
                    activeOrder.status,
                  ) >= ["received", "preparing", "ready", "delivering"].indexOf(status)
                return (
                  <span
                    className={`grid size-11 place-items-center rounded-full border ${
                      complete
                        ? "border-white bg-white text-[var(--brand-red)]"
                        : "border-white/30 text-white/40"
                    }`}
                    key={status}
                  >
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  </span>
                )
              })}
            </div>
          </div>
        </section>
      )}
      <div className="mt-6">
        {activeOrder?.fulfillment === "delivery" && <div className="mb-6 max-w-xl"><DeliveryMap location={validLocation(activeOrder.deliveryLocation) ? activeOrder.deliveryLocation : null} address={activeOrder.address} /></div>}
        <OrdersTable orders={orders} />
      </div>
    </>
  )
}

function StaffDashboard({ orders }: { orders: Order[] }) {
  const columns = [
    { status: "received", title: "ออเดอร์เข้า", icon: ShoppingBag },
    { status: "preparing", title: "กำลังเตรียม", icon: ChefHat },
    { status: "ready", title: "พร้อมส่งมอบ", icon: PackageCheck },
  ] as const
  return <>
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map(column => <StatCard key={column.status} helper="จำนวนออเดอร์ในสถานะนี้" icon={<column.icon className="size-5" aria-hidden="true" />} label={column.title} value={`${orders.filter(order => order.status === column.status).length} รายการ`} />)}
    </div>
    <OrderNoteBoard orders={orders.map(toOrderView)} />
  </>
}

function AdminDashboard({
  orders,
  userCount,
  menuCount,
}: {
  orders: Order[]
  userCount: number
  menuCount: number
}) {
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="จากออเดอร์ในระบบ"
          icon={<TrendingUp className="size-5" aria-hidden="true" />}
          label="ยอดขายรวม"
          value={`฿${formatPrice(revenue)}`}
        />
        <StatCard
          helper="ทุกสถานะการสั่งซื้อ"
          icon={<ShoppingBag className="size-5" aria-hidden="true" />}
          label="ออเดอร์"
          value={`${orders.length}`}
        />
        <StatCard
          helper="รวมลูกค้าและทีมหน้าร้าน"
          icon={<UsersRound className="size-5" aria-hidden="true" />}
          label="ผู้ใช้ระบบ"
          value={`${userCount}`}
        />
        <StatCard
          helper="รายการที่บริหารผ่าน CMS"
          icon={<Store className="size-5" aria-hidden="true" />}
          label="เมนูอาหาร"
          value={`${menuCount}`}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <OrdersTable orders={orders} />
        <aside className="rounded-3xl bg-[var(--brand-red)] p-6 text-white">
          <Settings className="size-7" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-black">ศูนย์จัดการร้าน</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            จัดการเมนู รูปอาหาร ราคา สถานะวัตถุดิบ และข้อมูลทุกสาขาผ่าน Payload Admin
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[var(--brand-red)]"
            href="/admin"
          >
            เปิดระบบจัดการ
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </>
  )
}

export default async function PortalPage() {
  const user = await appAuth.currentUser()
  if (!user) redirect("/login")

  const payload = await getPayloadClient()
  const [ordersResult, userCount, menuCount, riderIncome] = await Promise.all([
    payload.find({
      collection: "orders",
      sort: "-createdAt",
      limit: 200,
      depth: 1,
      user,
      overrideAccess: false,
    }),
    user.role === "admin"
      ? payload.count({ collection: "users", user, overrideAccess: false })
      : Promise.resolve({ totalDocs: 0 }),
    user.role === "admin"
      ? payload.count({ collection: "menu-items", user, overrideAccess: false })
      : Promise.resolve({ totalDocs: 0 }),
    user.role === "rider"
      ? payload.find({ collection: "orders", where: { and: [{ rider: { equals: user.id } }, { status: { equals: "completed" } }, { fulfillment: { equals: "delivery" } }] }, pagination: false, depth: 0, select: { deliveryFee: true }, user, overrideAccess: false })
      : Promise.resolve({ docs: [] }),
  ])
  const portalOrders = ordersResult.docs.map(order => ({ ...order, orderNumber: order.displayNumber || order.orderNumber }))
  const earnedTotal = riderIncome.docs.reduce((sum, order) => sum + (order.deliveryFee || 0), 0)

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <PortalRefresh />
      <header className="border-b border-white/10 bg-[var(--ink)] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10">
          <Logo inverse />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-black">{user.name}</p>
              <p className="text-xs text-white/45">{roleLabels[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button
                className="min-h-10 rounded-full border border-white/15 px-4 text-xs font-black transition hover:bg-white hover:text-[var(--ink)]"
                type="submit"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--brand-red)] shadow-sm">
              <LayoutDashboard className="size-3.5" aria-hidden="true" />
              {roleLabels[user.role]} PORTAL
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-5xl">
              สวัสดี, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-black/50">
              {user.role === "customer"
                ? "มื้ออร่อยและทุกคะแนนของคุณอยู่ที่นี่"
                : user.role === "staff"
                  ? "จัดลำดับคิวและส่งมอบทุกออเดอร์อย่างมั่นใจ"
                  : user.role === "rider"
                    ? "รับงานจากร้าน แล้วนำส่งความอร่อยให้ถึงมือลูกค้า"
                  : "ภาพรวมธุรกิจ Burken วันนี้ในหน้าจอเดียว"}
            </p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-6 text-sm font-black text-white"
            href="/"
          >
            {user.role === "customer" ? "สั่งอาหารเพิ่ม" : "ดูหน้าร้าน"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {user.role === "customer" && (
          <CustomerDashboard orders={portalOrders} user={user} />
        )}
        {user.role === "staff" && <StaffDashboard orders={portalOrders} />}
        {user.role === "rider" && <RiderDashboard orders={portalOrders.map(toOrderView)} riderID={user.id} earnedTotal={earnedTotal} />}
        {user.role === "admin" && (
          <AdminDashboard
            menuCount={menuCount.totalDocs}
            orders={portalOrders}
            userCount={userCount.totalDocs}
          />
        )}
      </div>
    </div>
  )
}
