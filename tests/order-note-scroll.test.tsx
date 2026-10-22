import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OrderNoteBoard } from '@/components/OrderNoteBoard'
import type { OrderView } from '@/lib/order-view'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/(frontend)/actions', () => ({ updateOrderAction: vi.fn() }))

it('scrolls the note rail horizontally with the mouse wheel and preserves nested vertical scrolling', () => {
  render(<OrderNoteBoard orders={[]} />)
  expect(screen.queryByText('ทุกออเดอร์ ใส่ใจทุกแผ่น')).toBeNull()
  const rail = screen.getByRole('region', { name: 'โน้ตออเดอร์ เลื่อนซ้ายขวา' })
  Object.defineProperties(rail, { clientWidth: { value: 600 }, scrollWidth: { value: 1800 } })
  fireEvent.wheel(rail, { deltaY: 120 })
  expect(rail.scrollLeft).toBe(120)
  fireEvent.wheel(rail, { deltaY: -50 })
  expect(rail.scrollLeft).toBe(70)
  fireEvent.wheel(rail, { deltaY: 50, ctrlKey: true })
  expect(rail.scrollLeft).toBe(70)
  const list = document.createElement('div')
  list.style.overflowY = 'auto'
  Object.defineProperties(list, { clientHeight: { value: 100 }, scrollHeight: { value: 400 } })
  rail.append(list)
  fireEvent.wheel(list, { deltaY: 50 })
  expect(rail.scrollLeft).toBe(70)
})

it('keeps the kitchen map hidden until the GPS icon beside the order number is clicked', () => {
  const order: OrderView = { id: 'map-order', orderNumber: 'BK001', createdAt: '2026-10-23T00:00:00Z', status: 'received', fulfillment: 'delivery', address: null, deliveryLocation: { latitude: 13, longitude: 100 }, customerName: 'Customer', riderId: null, riderName: null, total: 138, deliveryFee: 39, items: [] }
  render(<OrderNoteBoard orders={[order]} />)
  const rail = screen.getByRole('region', { name: 'โน้ตออเดอร์ เลื่อนซ้ายขวา' })
  rail.scrollTo = vi.fn()
  fireEvent.click(screen.getByText('#BK001').closest('button')!)
  expect(screen.queryByTitle('แผนที่จุดจัดส่ง Google Maps')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'GPS BK001' }))
  expect(screen.getByTitle('แผนที่จุดจัดส่ง Google Maps')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'GPS BK001' }))
  expect(screen.queryByTitle('แผนที่จุดจัดส่ง Google Maps')).toBeNull()
})
