import type { Order } from '@/payload-types'
import { validLocation, type DeliveryLocation } from './delivery'

export const orderStatusLabels = {
  received: 'รับออเดอร์แล้ว', preparing: 'กำลังปรุง', ready: 'พร้อมรับ',
  delivering: 'กำลังจัดส่ง', completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก',
}
export type OrderStatus = keyof typeof orderStatusLabels
export type OrderView = {
  id: string; orderNumber: string; createdAt: string; status: OrderStatus;
  fulfillment: 'pickup' | 'delivery'; address: string | null;
  deliveryLocation: DeliveryLocation | null; customerName: string;
  riderId: string | null; riderName: string | null; total: number; deliveryFee: number;
  items: { nameSnapshot: string; quantity: number; unitPrice: number }[];
  deliveryPhotoId?: string | null;
}

export function toOrderView(order: Order): OrderView {
  return {
    id: order.id, orderNumber: order.displayNumber || order.orderNumber, createdAt: order.createdAt, status: order.status,
    deliveryPhotoId: typeof order.deliveryPhoto === 'object' && order.deliveryPhoto ? order.deliveryPhoto.id : order.deliveryPhoto || null,
    fulfillment: order.fulfillment, address: order.address || null,
    deliveryLocation: validLocation(order.deliveryLocation) ? order.deliveryLocation : null,
    customerName: typeof order.customer === 'object' && order.customer ? order.customer.name : 'ลูกค้า',
    riderId: typeof order.rider === 'object' && order.rider ? order.rider.id : order.rider || null,
    riderName: typeof order.rider === 'object' && order.rider ? order.rider.name : null,
    total: order.total, deliveryFee: order.deliveryFee,
    items: order.items.map(({ nameSnapshot, quantity, unitPrice }) => ({ nameSnapshot, quantity, unitPrice })),
  }
}
