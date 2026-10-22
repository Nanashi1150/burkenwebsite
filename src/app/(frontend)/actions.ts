"use server"

import { redirect } from "next/navigation"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { validLocation, type DeliveryLocation } from "@/lib/delivery"
import { localWrite } from "@/lib/local-write"

export type AuthActionState = {
  error?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") || "")

  if (!emailPattern.test(email) || password.length < 8) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" }
  }

  try {
    await appAuth.login(email, password)
  } catch {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
  }

  redirect("/portal")
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get("name") || "").trim()
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") || "")

  if (name.length < 2) return { error: "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร" }
  if (!emailPattern.test(email)) return { error: "รูปแบบอีเมลไม่ถูกต้อง" }
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }

  try {
    const payload = await getPayloadClient()
    await localWrite(() => payload.create({
      collection: "users",
      data: { email, name, password, role: "customer" },
      overrideAccess: false,
    }))
    await appAuth.login(email, password)
  } catch {
    return { error: "อีเมลนี้ถูกใช้งานแล้ว หรือไม่สามารถสร้างบัญชีได้" }
  }

  redirect("/portal")
}

export async function logoutAction() {
  await appAuth.logout()
  redirect("/")
}

export async function getCartSessionAction() {
  const user = await appAuth.currentUser()
  return { authenticated: Boolean(user) }
}

type CheckoutItem = {
  id: string
  quantity: number
}

type CheckoutInput = {
  items: CheckoutItem[]
  fulfillment: "pickup" | "delivery"
  address?: string
  deliveryLocation?: DeliveryLocation | null
}

export async function checkoutAction(input: CheckoutInput) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, code: "AUTH_REQUIRED" as const, error: "กรุณาเข้าสู่ระบบก่อนสั่งอาหาร" }
  if (user.role !== "customer") return { ok: false as const, code: "CUSTOMER_REQUIRED" as const, error: "กรุณาใช้บัญชีลูกค้าในการสั่งอาหาร" }
  if (!input || !Array.isArray(input.items) || input.items.length > 50 || !["pickup", "delivery"].includes(input.fulfillment) ||
    input.items.some((item) => !item || typeof item.id !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) ||
    (input.address !== undefined && (typeof input.address !== "string" || input.address.length > 2000))) {
    return { ok: false as const, error: "ข้อมูลคำสั่งซื้อไม่ถูกต้อง" }
  }

  const items = input.items
    .filter(
      (item) => typeof item.id === "string" && Number.isInteger(item.quantity),
    )
    .map((item) => ({
      menuItem: item.id,
      quantity: Math.max(1, Math.min(20, item.quantity)),
    }))

  if (items.length === 0) return { ok: false as const, error: "ตะกร้ายังว่างอยู่" }
  if (input.fulfillment === "delivery" && !input.address?.trim() && !validLocation(input.deliveryLocation)) {
    return { ok: false as const, error: "กรุณาเลือกหมุดจุดจัดส่ง หรือกรอกที่อยู่จัดส่ง" }
  }
  if (input.fulfillment === "delivery" && input.deliveryLocation != null && !validLocation(input.deliveryLocation)) {
    return { ok: false as const, error: "กรุณาเลือกพิกัดจัดส่งบนแผนที่" }
  }

  try {
    const payload = await getPayloadClient()
    const order = await localWrite(() => payload.create({
      collection: "orders",
      data: {
        fulfillment: input.fulfillment,
        address:
          input.fulfillment === "delivery" ? input.address?.trim() : undefined,
        items,
        deliveryLocation: input.fulfillment === "delivery" ? input.deliveryLocation : undefined,
      } as never,
      user,
      overrideAccess: false,
    }))

    return { ok: true as const, orderNumber: order.displayNumber || order.orderNumber }
  } catch {
    return { ok: false as const, error: "ไม่สามารถสร้างออเดอร์ได้ กรุณาลองอีกครั้ง" }
  }
}

export async function updateOrderAction(orderID: string, operation: "prepare" | "ready" | "complete" | "accept" | "pickup" | "deliver", photoID?: string) {
  const user = await appAuth.currentUser()
  if (!user || typeof orderID !== "string" || !orderID || orderID.length > 100) return { ok: false as const, error: "กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์" }
  const staff = ["staff", "admin"].includes(user.role)
  const rider = user.role === "rider"
  if ((!staff || !["prepare", "ready", "complete"].includes(operation)) && (!rider || !["accept", "pickup", "deliver"].includes(operation))) return { ok: false as const, error: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ" }
  const payload = await getPayloadClient()
  if (operation === "deliver" && (!photoID || typeof photoID !== "string" || photoID.length > 100)) return { ok: false as const, error: "กรุณาถ่ายรูปยืนยันการจัดส่งก่อนส่งงาน" }
  try {
    if (operation === "accept") {
      const result = await localWrite(() => payload.update({
        collection: "orders", overrideAccess: false, user,
        where: { and: [{ id: { equals: orderID } }, { fulfillment: { equals: "delivery" } }, { status: { equals: "ready" } }, { rider: { exists: false } }] },
        data: { rider: user.id },
      }))
      if (result.docs.length !== 1 || result.errors.length > 0) return { ok: false as const, error: "ออเดอร์นี้มีผู้รับงานแล้ว หรือยังไม่พร้อมจัดส่ง" }
    } else {
      const transitions = { prepare: ["received", "preparing"], ready: ["preparing", "ready"], complete: ["ready", "completed"], pickup: ["ready", "delivering"], deliver: ["delivering", "completed"] } as const
      const transition = transitions[operation]
      if (!transition) return { ok: false as const, error: "คำสั่งไม่ถูกต้อง" }
      const result = await localWrite(() => payload.update({
        collection: "orders", overrideAccess: false, user,
        where: { and: [{ id: { equals: orderID } }, { status: { equals: transition[0] } }, ...(rider ? [{ rider: { equals: user.id } }] : []), ...(operation === "complete" ? [{ fulfillment: { equals: "pickup" as const } }] : [])] },
        data: { status: transition[1], ...(operation === "deliver" ? { deliveryPhoto: photoID } : {}) },
      }))
      if (result.docs.length !== 1 || result.errors.length > 0) return { ok: false as const, error: "สถานะออเดอร์เปลี่ยนแล้ว กรุณาลองใหม่" }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: "ไม่สามารถอัปเดตงานได้ อาจมีผู้รับงานแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง" }
  }
}

export async function uploadDeliveryPhotoAction(form: FormData) {
  const user = await appAuth.currentUser()
  if (user?.role !== 'rider') return { ok: false as const, error: 'กรุณาเข้าสู่ระบบด้วยบัญชีไรเดอร์' }
  const orderID = form.get('orderID')
  const file = form.get('photo')
  if (typeof orderID !== 'string' || orderID.length > 100 || !(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) return { ok: false as const, error: 'กรุณาเลือกรูป JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB' }
  try {
    const payload = await getPayloadClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const photo = await localWrite(() => payload.create({ collection: 'delivery-photos', user, overrideAccess: false, data: { order: orderID } as never, file: { data: buffer, mimetype: file.type, name: `delivery-${Date.now()}.${file.type.split('/')[1]}`, size: file.size } }))
    return { ok: true as const, photoID: photo.id }
  } catch { return { ok: false as const, error: 'อัปโหลดรูปไม่ได้ กรุณาตรวจสอบว่างานนี้เป็นของคุณและกำลังจัดส่ง' } }
}
